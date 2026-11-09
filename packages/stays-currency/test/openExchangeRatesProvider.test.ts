import { OpenExchangeRatesProvider, resolveOpenExchangeRatesProviderFromEnv } from "../src/currency/openExchangeRatesProvider";
import { TransientRateProviderError } from "../src/currency/rateConversion";
import { MOCK_PROVIDER_VERIFICATION, ProviderVerificationRecord } from "../src/currency/providerVerification";

function mockFetch(response: Partial<Response> & { jsonBody?: unknown }): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: async () => response.jsonBody,
    text: async () => JSON.stringify(response.jsonBody ?? {}),
    headers: response.headers ?? { get: () => null }
  } as unknown as Response) as unknown as typeof fetch;
}

describe("OpenExchangeRatesProvider", () => {
  it("throws when constructed without an appId credential", () => {
    expect(() => new OpenExchangeRatesProvider({ appId: "" })).toThrow();
  });

  it("returns the direct USD-relative rate when base is USD", async () => {
    const fetchImpl = mockFetch({ jsonBody: { timestamp: 1234567890, base: "USD", rates: { EUR: 0.92 } } });
    const provider = new OpenExchangeRatesProvider({ appId: "test-app-id", fetchImpl });
    const quote = await provider.fetchRate("USD", "EUR");
    expect(quote.rate).toBeCloseTo(0.92);
    expect(quote.asOf).toBe(new Date(1234567890 * 1000).toISOString());
  });

  it("derives a cross-rate when neither currency is the response base", async () => {
    const fetchImpl = mockFetch({ jsonBody: { timestamp: 1234567890, base: "USD", rates: { EUR: 0.92, GBP: 0.79 } } });
    const provider = new OpenExchangeRatesProvider({ appId: "test-app-id", fetchImpl });
    const quote = await provider.fetchRate("EUR", "GBP");
    expect(quote.rate).toBeCloseTo(0.79 / 0.92);
  });

  it("throws a transient error (eligible for retry) on a 429 response", async () => {
    const fetchImpl = mockFetch({ ok: false, status: 429, headers: { get: () => "2" } as unknown as Headers });
    const provider = new OpenExchangeRatesProvider({ appId: "test-app-id", fetchImpl });
    await expect(provider.fetchRate("USD", "EUR")).rejects.toBeInstanceOf(TransientRateProviderError);
  });

  it("parses the Retry-After header (seconds) into milliseconds on the thrown error", async () => {
    const fetchImpl = mockFetch({ ok: false, status: 429, headers: { get: () => "2" } as unknown as Headers });
    const provider = new OpenExchangeRatesProvider({ appId: "test-app-id", fetchImpl });
    await expect(provider.fetchRate("USD", "EUR")).rejects.toMatchObject({ retryAfterMs: 2000 });
  });

  it("throws a transient error on a 5xx response", async () => {
    const fetchImpl = mockFetch({ ok: false, status: 503 });
    const provider = new OpenExchangeRatesProvider({ appId: "test-app-id", fetchImpl });
    await expect(provider.fetchRate("USD", "EUR")).rejects.toBeInstanceOf(TransientRateProviderError);
  });

  it("throws a non-transient error on a 401 response", async () => {
    const fetchImpl = mockFetch({ ok: false, status: 401 });
    const provider = new OpenExchangeRatesProvider({ appId: "test-app-id", fetchImpl });
    await expect(provider.fetchRate("USD", "EUR")).rejects.not.toBeInstanceOf(TransientRateProviderError);
  });

  it("throws when the response is missing a requested currency's rate", async () => {
    const fetchImpl = mockFetch({ jsonBody: { timestamp: 1234567890, base: "USD", rates: {} } });
    const provider = new OpenExchangeRatesProvider({ appId: "test-app-id", fetchImpl });
    await expect(provider.fetchRate("USD", "EUR")).rejects.toThrow();
  });
});

describe("resolveOpenExchangeRatesProviderFromEnv", () => {
  it("returns undefined when the T01 verification has not passed (current mock state)", () => {
    expect(resolveOpenExchangeRatesProviderFromEnv({ OPEN_EXCHANGE_RATES_APP_ID: "x" } as NodeJS.ProcessEnv, MOCK_PROVIDER_VERIFICATION)).toBeUndefined();
  });

  it("returns undefined when verified but no app ID is configured", () => {
    const verified: ProviderVerificationRecord = { ...MOCK_PROVIDER_VERIFICATION, passes: true };
    expect(resolveOpenExchangeRatesProviderFromEnv({} as NodeJS.ProcessEnv, verified)).toBeUndefined();
  });

  it("returns a provider instance when verified and configured", () => {
    const verified: ProviderVerificationRecord = { ...MOCK_PROVIDER_VERIFICATION, passes: true };
    const provider = resolveOpenExchangeRatesProviderFromEnv({ OPEN_EXCHANGE_RATES_APP_ID: "x" } as NodeJS.ProcessEnv, verified);
    expect(provider).toBeInstanceOf(OpenExchangeRatesProvider);
  });
});
