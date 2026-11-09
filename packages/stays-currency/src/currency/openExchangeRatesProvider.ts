/**
 * EPMCDMETST-47868-T05: Open Exchange Rates `latest.json` adapter (NFR-24: TLS endpoint, credential
 * from env var only, never hardcoded/client-exposed). Gated by `resolveOpenExchangeRatesProviderFromEnv`
 * behind the T01 provider-verification record (see providerVerification.ts) — current mock record has
 * `passes: false`, so this adapter is built and tested but not enabled until real verification passes.
 */
import { RateProvider, RateQuote, TransientRateProviderError } from "./rateConversion";
import { MOCK_PROVIDER_VERIFICATION, ProviderVerificationRecord } from "./providerVerification";

export interface OpenExchangeRatesOptions {
  appId: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

interface OpenExchangeRatesResponse {
  timestamp: number;
  base: string;
  rates: Record<string, number>;
}

function parseRetryAfterMs(response: Response): number | undefined {
  const header = response.headers.get("Retry-After");
  if (!header) {
    return undefined;
  }
  const seconds = Number(header);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

export class OpenExchangeRatesProvider implements RateProvider {
  private readonly appId: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenExchangeRatesOptions) {
    if (!options.appId) {
      throw new Error("OpenExchangeRatesProvider requires an appId credential");
    }
    this.appId = options.appId;
    this.baseUrl = options.baseUrl ?? "https://openexchangerates.org/api";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async fetchRate(base: string, target: string): Promise<RateQuote> {
    // The free/basic plan only returns rates relative to a fixed USD base; non-USD symbols are
    // requested explicitly and the requested pair's cross-rate is derived from the USD-relative rates.
    const symbols = Array.from(new Set([base, target].filter((code) => code !== "USD")));
    const symbolsParam = symbols.length > 0 ? `&symbols=${symbols.map(encodeURIComponent).join(",")}` : "";
    const url = `${this.baseUrl}/latest.json?app_id=${encodeURIComponent(this.appId)}${symbolsParam}`;

    const response = await this.fetchImpl(url);

    if (response.status === 429 || response.status >= 500) {
      throw new TransientRateProviderError(
        `Open Exchange Rates request failed: ${response.status}`,
        parseRetryAfterMs(response)
      );
    }
    if (!response.ok) {
      throw new Error(`Open Exchange Rates request failed: ${response.status} ${await response.text()}`);
    }

    const body = (await response.json()) as OpenExchangeRatesResponse;
    const rateFor = (code: string): number | undefined => (code === body.base ? 1 : body.rates[code]);
    const usdToBase = rateFor(base);
    const usdToTarget = rateFor(target);
    if (!usdToBase || !Number.isFinite(usdToBase) || !usdToTarget || !Number.isFinite(usdToTarget)) {
      throw new Error(`Open Exchange Rates response missing a rate for "${base}" or "${target}"`);
    }

    return {
      rate: usdToTarget / usdToBase,
      asOf: new Date(body.timestamp * 1000).toISOString()
    };
  }
}

/**
 * Resolves a real `OpenExchangeRatesProvider` only when both the credential is configured AND the
 * T01 verification record has actually passed (T05 acceptance criterion: "Integration is enabled
 * only after T01 passes"). Returns `undefined` otherwise so callers fall back to detection-only /
 * mock behavior rather than silently using an unverified integration.
 */
export function resolveOpenExchangeRatesProviderFromEnv(
  env: NodeJS.ProcessEnv = process.env,
  verification: ProviderVerificationRecord = MOCK_PROVIDER_VERIFICATION
): RateProvider | undefined {
  if (!verification.passes) {
    return undefined;
  }
  const appId = env.OPEN_EXCHANGE_RATES_APP_ID;
  if (!appId) {
    return undefined;
  }
  return new OpenExchangeRatesProvider({ appId });
}
