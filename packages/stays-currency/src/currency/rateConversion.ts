/**
 * EPMCDMETST-47868-T06: Rate validation, conversion, and fallback (FR-36, FR-37, NFR-23/24).
 * The concrete provider adapter (T05) is gated behind the T01 vendor-verification gate
 * (impl-plan.md current blocker); this module only depends on the `RateProvider` interface so it
 * can be implemented and tested against a mock/test adapter in the meantime.
 */
import { getSupportedCurrency } from "./currencyConfig";
import { ActiveSelectionState, ConversionResponse, ConversionResult, StayListing } from "../types";

export interface RateQuote {
  rate: number;
  /** ISO 8601 timestamp of when the provider sourced the rate. */
  asOf: string;
}

/** Server-side only; credentials/keys for the real implementation must never reach the client (NFR-24). */
export interface RateProvider {
  fetchRate(base: string, target: string): Promise<RateQuote>;
}

/** Thrown by a `RateProvider` for failures eligible for a single retry (network error, HTTP 429/5xx). */
export class TransientRateProviderError extends Error {
  constructor(message: string, public readonly retryAfterMs?: number) {
    super(message);
    this.name = "TransientRateProviderError";
  }
}

const MAX_RATE_AGE_MS = 5 * 60 * 1000;
const PER_ATTEMPT_TIMEOUT_MS = 2000;
const OVERALL_DEADLINE_MS = 5000;

/** A finite, positive rate whose `asOf` is not in the future and is within the max age (FR-36 policy). */
export function isRateValid(quote: RateQuote, now: Date = new Date()): boolean {
  if (!Number.isFinite(quote.rate) || quote.rate <= 0) {
    return false;
  }
  const asOfMs = Date.parse(quote.asOf);
  if (!Number.isFinite(asOfMs)) {
    return false;
  }
  const ageMs = now.getTime() - asOfMs;
  if (ageMs < 0) {
    return false; // future timestamp
  }
  return ageMs <= MAX_RATE_AGE_MS;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TransientRateProviderError(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Fetches a validated rate with at most one retry on transient failures, a 2s per-attempt timeout,
 * and a 5s overall deadline (including any `Retry-After` delay). Returns `undefined` if no valid
 * rate could be obtained within the deadline, signaling callers to apply the FR-37 fallback.
 */
export async function fetchValidatedRate(
  provider: RateProvider,
  base: string,
  target: string,
  now: () => Date = () => new Date()
): Promise<RateQuote | undefined> {
  const deadline = now().getTime() + OVERALL_DEADLINE_MS;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - now().getTime();
    if (remaining <= 0) {
      break;
    }
    try {
      const quote = await withTimeout(provider.fetchRate(base, target), Math.min(PER_ATTEMPT_TIMEOUT_MS, remaining));
      return isRateValid(quote, now()) ? quote : undefined;
    } catch (err) {
      if (!(err instanceof TransientRateProviderError)) {
        break; // non-transient failure: do not retry
      }
      const retryAfterMs = err.retryAfterMs ?? 0;
      const afterRetryDelay = now().getTime() + retryAfterMs;
      if (afterRetryDelay >= deadline) {
        break; // retry would exceed the overall deadline
      }
      if (retryAfterMs > 0) {
        await new Promise((r) => setTimeout(r, retryAfterMs));
      }
    }
  }
  return undefined;
}

/**
 * Rounds half-expand (ties away from zero), first cleaning up binary floating-point representation
 * noise (e.g. `1.005 * 100` evaluates to `100.49999999999999`, not exactly `100.5`) so that true
 * decimal `.5` boundaries round correctly, as required for monetary conversion (FR-36 policy).
 */
function roundHalfExpand(value: number): number {
  const cleaned = Number(value.toPrecision(12));
  return cleaned >= 0 ? Math.floor(cleaned + 0.5) : Math.ceil(cleaned - 0.5);
}

/**
 * Converts an amount from base to target currency minor units using the given rate, rounding to
 * the target currency's ISO 4217 minor-unit precision with half-expand rounding.
 */
export function convertAmountMinorUnits(
  amountMinorUnits: number,
  baseCurrency: string,
  targetCurrency: string,
  rate: number
): number {
  const base = getSupportedCurrency(baseCurrency);
  const target = getSupportedCurrency(targetCurrency);
  if (!base || !target) {
    throw new Error(`Unsupported currency pair: ${baseCurrency} -> ${targetCurrency}`);
  }
  const amountMajor = amountMinorUnits / 10 ** base.minorUnitDigits;
  const convertedMajor = amountMajor * rate;
  return roundHalfExpand(convertedMajor * 10 ** target.minorUnitDigits);
}

/**
 * T06 fallback policy: produces one `ConversionResult` per listing, converting to the active
 * currency when a validated rate is available and otherwise falling back to the listing's exact
 * original/base price with an explanatory notice (FR-37). Booking/payment amounts are never
 * touched by this — it only affects what's returned for display. Rate lookups are cached per
 * base/target pair within a single call so multiple listings sharing a base currency only trigger
 * one provider fetch.
 */
export async function convertListings(
  listings: StayListing[],
  active: ActiveSelectionState,
  provider: RateProvider,
  now: () => Date = () => new Date()
): Promise<ConversionResponse> {
  const rateCache = new Map<string, RateQuote | undefined>();

  const results: ConversionResult[] = [];
  for (const listing of listings) {
    if (listing.baseCurrency === active.currency) {
      results.push({ listingId: listing.id, convertedAmountMinorUnits: listing.baseAmountMinorUnits, fallback: false });
      continue;
    }

    const cacheKey = `${listing.baseCurrency}_${active.currency}`;
    if (!rateCache.has(cacheKey)) {
      rateCache.set(cacheKey, await fetchValidatedRate(provider, listing.baseCurrency, active.currency, now));
    }
    const quote = rateCache.get(cacheKey);

    if (!quote) {
      results.push({
        listingId: listing.id,
        fallback: true,
        fallbackNotice: `Showing the original price in ${listing.baseCurrency}; a live ${active.currency} rate was unavailable.`
      });
      continue;
    }

    try {
      results.push({
        listingId: listing.id,
        convertedAmountMinorUnits: convertAmountMinorUnits(
          listing.baseAmountMinorUnits,
          listing.baseCurrency,
          active.currency,
          quote.rate
        ),
        fallback: false
      });
    } catch {
      // Defensive fallback for malformed/unsupported listing data (e.g. an unrecognized currency
      // code) — one bad listing must not fail conversion for the rest of the batch.
      results.push({
        listingId: listing.id,
        fallback: true,
        fallbackNotice: `Showing the original price in ${listing.baseCurrency}; conversion to ${active.currency} is unavailable.`
      });
    }
  }

  return {
    searchRevision: active.searchRevision,
    currencySelectionRevision: active.currencySelectionRevision,
    currency: active.currency,
    results
  };
}
