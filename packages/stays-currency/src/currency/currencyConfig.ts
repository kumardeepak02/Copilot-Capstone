/**
 * EPMCDMETST-47868-T03: Centralized, extensible supported-currency configuration (NFR-25).
 * UI and service must consume this single source rather than duplicating currency lists.
 */

export interface SupportedCurrency {
  /** ISO 4217 alphabetic code, e.g. "USD". */
  code: string;
  /** ISO 4217 numeric code, e.g. "840". */
  numericCode: string;
  /** Number of decimal digits in the currency's minor unit (e.g. 2 for USD, 0 for JPY). */
  minorUnitDigits: number;
  /** BCP-47 locales whose device/browser default resolves to this currency (FR-35). */
  locales: string[];
}

/** FR-31 lists USD/840, EUR/978, GBP/826, AED/784, JPY/392 as the initial supported set. */
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: "USD", numericCode: "840", minorUnitDigits: 2, locales: ["en-US"] },
  { code: "EUR", numericCode: "978", minorUnitDigits: 2, locales: ["de-DE", "fr-FR", "es-ES", "it-IT"] },
  { code: "GBP", numericCode: "826", minorUnitDigits: 2, locales: ["en-GB"] },
  { code: "AED", numericCode: "784", minorUnitDigits: 2, locales: ["ar-AE", "en-AE"] },
  { code: "JPY", numericCode: "392", minorUnitDigits: 0, locales: ["ja-JP"] }
];

/** Configured default/fallback currency for absent, ambiguous, or unsupported locales (FR-35, FR-37). */
export const DEFAULT_CURRENCY = "USD";

const BY_CODE = new Map(SUPPORTED_CURRENCIES.map((c) => [c.code, c]));
const BY_LOCALE = new Map(SUPPORTED_CURRENCIES.flatMap((c) => c.locales.map((l) => [l, c])));

export function getSupportedCurrency(code: string): SupportedCurrency | undefined {
  return BY_CODE.get(code);
}

export function getDefaultCurrency(): SupportedCurrency {
  const fallback = BY_CODE.get(DEFAULT_CURRENCY);
  if (!fallback) {
    throw new Error(`Misconfigured: DEFAULT_CURRENCY "${DEFAULT_CURRENCY}" is not in SUPPORTED_CURRENCIES`);
  }
  return fallback;
}

/**
 * Resolves the display currency for a device/browser locale (FR-35). Deterministically returns
 * the configured default for an absent, ambiguous (no exact/base-language match), or unsupported locale.
 */
export function resolveCurrencyForLocale(locale: string | undefined): SupportedCurrency {
  if (!locale) {
    return getDefaultCurrency();
  }
  const exact = BY_LOCALE.get(locale);
  if (exact) {
    return exact;
  }
  // Fall back to matching on base language subtag only if exactly one currency maps to it.
  const baseLang = locale.split("-")[0];
  const baseMatches = SUPPORTED_CURRENCIES.filter((c) => c.locales.some((l) => l.split("-")[0] === baseLang));
  if (baseMatches.length === 1) {
    return baseMatches[0];
  }
  return getDefaultCurrency();
}
