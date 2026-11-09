import {
  SUPPORTED_CURRENCIES,
  DEFAULT_CURRENCY,
  getSupportedCurrency,
  getDefaultCurrency,
  resolveCurrencyForLocale
} from "../src/currency/currencyConfig";

describe("currencyConfig", () => {
  it("includes the five currencies required by FR-31", () => {
    const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
    expect(codes).toEqual(expect.arrayContaining(["USD", "EUR", "GBP", "AED", "JPY"]));
  });

  it("looks up a supported currency by code", () => {
    expect(getSupportedCurrency("JPY")).toMatchObject({ numericCode: "392", minorUnitDigits: 0 });
  });

  it("returns undefined for an unsupported code", () => {
    expect(getSupportedCurrency("XYZ")).toBeUndefined();
  });

  it("resolves the default currency", () => {
    expect(getDefaultCurrency().code).toBe(DEFAULT_CURRENCY);
  });

  it("resolves an exact-locale match", () => {
    expect(resolveCurrencyForLocale("ja-JP").code).toBe("JPY");
  });

  it("falls back to the default currency for an absent locale", () => {
    expect(resolveCurrencyForLocale(undefined).code).toBe(DEFAULT_CURRENCY);
  });

  it("falls back to the default currency for an unsupported locale", () => {
    expect(resolveCurrencyForLocale("zh-CN").code).toBe(DEFAULT_CURRENCY);
  });

  it("falls back to the default currency for an ambiguous base-language match", () => {
    // "en" base language maps to both en-US (USD) and en-GB (GBP) -> ambiguous.
    expect(resolveCurrencyForLocale("en").code).toBe(DEFAULT_CURRENCY);
  });
});
