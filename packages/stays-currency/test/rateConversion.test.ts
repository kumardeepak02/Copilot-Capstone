import {
  isRateValid,
  convertAmountMinorUnits,
  fetchValidatedRate,
  convertListings,
  RateProvider,
  RateQuote,
  TransientRateProviderError
} from "../src/currency/rateConversion";
import { ActiveSelectionState, StayListing } from "../src/types";

describe("isRateValid", () => {
  const now = new Date("2026-11-09T12:00:00.000Z");

  it("accepts a finite positive rate within the 5-minute max age", () => {
    expect(isRateValid({ rate: 1.08, asOf: "2026-11-09T11:58:00.000Z" }, now)).toBe(true);
  });

  it("rejects a non-positive rate", () => {
    expect(isRateValid({ rate: 0, asOf: now.toISOString() }, now)).toBe(false);
    expect(isRateValid({ rate: -1, asOf: now.toISOString() }, now)).toBe(false);
  });

  it("rejects a non-finite rate", () => {
    expect(isRateValid({ rate: NaN, asOf: now.toISOString() }, now)).toBe(false);
    expect(isRateValid({ rate: Infinity, asOf: now.toISOString() }, now)).toBe(false);
  });

  it("rejects a future timestamp", () => {
    expect(isRateValid({ rate: 1.08, asOf: "2026-11-09T12:00:01.000Z" }, now)).toBe(false);
  });

  it("rejects a rate older than 5 minutes", () => {
    expect(isRateValid({ rate: 1.08, asOf: "2026-11-09T11:54:59.000Z" }, now)).toBe(false);
  });

  it("accepts a rate exactly at the 5-minute boundary", () => {
    expect(isRateValid({ rate: 1.08, asOf: "2026-11-09T11:55:00.000Z" }, now)).toBe(true);
  });
});

describe("convertAmountMinorUnits", () => {
  it("converts between two currencies with the same minor-unit precision", () => {
    // $100.00 at rate 1.08 -> 108.00 EUR
    expect(convertAmountMinorUnits(10000, "USD", "EUR", 1.08)).toBe(10800);
  });

  it("converts to a currency with fewer minor-unit digits (JPY has 0)", () => {
    // $100.00 at rate 150.345 -> 15034.5 JPY, rounded half-expand to 15035
    expect(convertAmountMinorUnits(10000, "USD", "JPY", 150.345)).toBe(15035);
  });

  it("rounds half-expand at the .5 boundary (away from zero)", () => {
    // $1.005 base major-unit equivalent at rate 1 -> exactly .5 boundary
    expect(convertAmountMinorUnits(100, "USD", "USD", 1.005)).toBe(101);
  });

  it("throws for an unsupported currency", () => {
    expect(() => convertAmountMinorUnits(1000, "USD", "XYZ", 1)).toThrow();
  });

  it("converts between two non-USD currencies (EUR -> GBP)", () => {
    // €100.00 at rate 0.86 -> £86.00
    expect(convertAmountMinorUnits(10000, "EUR", "GBP", 0.86)).toBe(8600);
  });

  it("converts into AED (same 2-digit minor-unit precision as USD)", () => {
    // $100.00 at rate 3.6725 -> 367.25 AED
    expect(convertAmountMinorUnits(10000, "USD", "AED", 3.6725)).toBe(36725);
  });
});

describe("fetchValidatedRate", () => {
  const fixedNow = () => new Date("2026-11-09T12:00:00.000Z");

  it("returns the rate on a successful first attempt", async () => {
    const provider: RateProvider = {
      fetchRate: async () => ({ rate: 1.1, asOf: fixedNow().toISOString() })
    };
    const result = await fetchValidatedRate(provider, "USD", "EUR", fixedNow);
    expect(result?.rate).toBe(1.1);
  });

  it("returns undefined without retrying when the fetched rate is invalid", async () => {
    let calls = 0;
    const provider: RateProvider = {
      fetchRate: async () => {
        calls++;
        return { rate: -1, asOf: fixedNow().toISOString() };
      }
    };
    const result = await fetchValidatedRate(provider, "USD", "EUR", fixedNow);
    expect(result).toBeUndefined();
    expect(calls).toBe(1);
  });

  it("retries once on a transient error and succeeds", async () => {
    let calls = 0;
    const provider: RateProvider = {
      fetchRate: async (): Promise<RateQuote> => {
        calls++;
        if (calls === 1) {
          throw new TransientRateProviderError("503");
        }
        return { rate: 1.2, asOf: fixedNow().toISOString() };
      }
    };
    const result = await fetchValidatedRate(provider, "USD", "EUR", fixedNow);
    expect(result?.rate).toBe(1.2);
    expect(calls).toBe(2);
  });

  it("does not retry a non-transient error", async () => {
    let calls = 0;
    const provider: RateProvider = {
      fetchRate: async (): Promise<RateQuote> => {
        calls++;
        throw new Error("auth failed");
      }
    };
    const result = await fetchValidatedRate(provider, "USD", "EUR", fixedNow);
    expect(result).toBeUndefined();
    expect(calls).toBe(1);
  });

  it("gives up after exhausting the single retry on repeated transient errors", async () => {
    let calls = 0;
    const provider: RateProvider = {
      fetchRate: async (): Promise<RateQuote> => {
        calls++;
        throw new TransientRateProviderError("503");
      }
    };
    const result = await fetchValidatedRate(provider, "USD", "EUR", fixedNow);
    expect(result).toBeUndefined();
    expect(calls).toBe(2);
  });

  it("does not retry when Retry-After would exceed the overall 5s deadline", async () => {
    let calls = 0;
    const provider: RateProvider = {
      fetchRate: async (): Promise<RateQuote> => {
        calls++;
        throw new TransientRateProviderError("429", 10000);
      }
    };
    const result = await fetchValidatedRate(provider, "USD", "EUR", fixedNow);
    expect(result).toBeUndefined();
    expect(calls).toBe(1);
  });

  it("times out a hanging attempt after the per-attempt timeout and retries", async () => {
    jest.useFakeTimers();
    try {
      let calls = 0;
      const provider: RateProvider = {
        fetchRate: (): Promise<RateQuote> => {
          calls++;
          if (calls === 1) {
            return new Promise(() => {
              /* never resolves: simulates a hanging first attempt */
            });
          }
          return Promise.resolve({ rate: 1.3, asOf: fixedNow().toISOString() });
        }
      };
      const resultPromise = fetchValidatedRate(provider, "USD", "EUR", fixedNow);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await resultPromise;
      expect(result?.rate).toBe(1.3);
      expect(calls).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("convertListings", () => {
  const fixedNow = () => new Date("2026-11-09T12:00:00.000Z");
  const active: ActiveSelectionState = { searchRevision: "search-1", currencySelectionRevision: "cur-1", currency: "EUR" };

  function makeListing(overrides: Partial<StayListing>): StayListing {
    return {
      id: "listing-1",
      cancellationPolicy: "free",
      mealPlan: "none",
      guestRating: 4,
      distanceFromCenterKm: 1,
      propertyType: "hotel",
      amenities: [],
      paymentOptions: [],
      baseAmountMinorUnits: 10000,
      baseCurrency: "USD",
      ...overrides
    };
  }

  it("echoes the active search/currency-selection revision and currency", async () => {
    const provider: RateProvider = { fetchRate: async () => ({ rate: 1.1, asOf: fixedNow().toISOString() }) };
    const response = await convertListings([], active, provider, fixedNow);
    expect(response).toMatchObject({ searchRevision: "search-1", currencySelectionRevision: "cur-1", currency: "EUR" });
  });

  it("returns the original amount unconverted, without calling the provider, when base currency matches the active currency", async () => {
    const fetchRate = jest.fn();
    const listing = makeListing({ baseCurrency: "EUR", baseAmountMinorUnits: 5000 });
    const response = await convertListings([listing], active, { fetchRate }, fixedNow);
    expect(response.results).toEqual([{ listingId: "listing-1", convertedAmountMinorUnits: 5000, fallback: false }]);
    expect(fetchRate).not.toHaveBeenCalled();
  });

  it("converts using the fetched rate when available", async () => {
    const provider: RateProvider = { fetchRate: async () => ({ rate: 0.9, asOf: fixedNow().toISOString() }) };
    const listing = makeListing({ baseCurrency: "USD", baseAmountMinorUnits: 10000 });
    const response = await convertListings([listing], active, provider, fixedNow);
    expect(response.results).toEqual([{ listingId: "listing-1", convertedAmountMinorUnits: 9000, fallback: false }]);
  });

  it("falls back to the original/base price with an explanatory notice when no rate is available (FR-37)", async () => {
    const provider: RateProvider = {
      fetchRate: async () => {
        throw new Error("provider unavailable");
      }
    };
    const listing = makeListing({ baseCurrency: "USD" });
    const response = await convertListings([listing], active, provider, fixedNow);
    expect(response.results).toEqual([
      {
        listingId: "listing-1",
        fallback: true,
        fallbackNotice: "Showing the original price in USD; a live EUR rate was unavailable."
      }
    ]);
  });

  it("caches the rate lookup so listings sharing a base currency only trigger one provider fetch", async () => {
    const fetchRate = jest.fn().mockResolvedValue({ rate: 0.9, asOf: fixedNow().toISOString() });
    const listings = [makeListing({ id: "a", baseCurrency: "USD" }), makeListing({ id: "b", baseCurrency: "USD" })];
    await convertListings(listings, active, { fetchRate }, fixedNow);
    expect(fetchRate).toHaveBeenCalledTimes(1);
  });

  it("falls back gracefully instead of failing the whole batch when a listing has an unsupported currency", async () => {
    const provider: RateProvider = { fetchRate: async () => ({ rate: 0.9, asOf: fixedNow().toISOString() }) };
    const listing = makeListing({ baseCurrency: "XYZ" });
    const response = await convertListings([listing], active, provider, fixedNow);
    expect(response.results).toEqual([
      { listingId: "listing-1", fallback: true, fallbackNotice: expect.stringContaining("conversion to EUR is unavailable") }
    ]);
  });
});
