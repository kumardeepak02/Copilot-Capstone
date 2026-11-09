import { isConversionResponseCurrent, ActiveSelectionState, ConversionResponse } from "../src/types";

describe("isConversionResponseCurrent", () => {
  const active: ActiveSelectionState = {
    searchRevision: "search-2",
    currencySelectionRevision: "currency-5",
    currency: "EUR"
  };

  function makeResponse(overrides: Partial<ConversionResponse>): ConversionResponse {
    return {
      searchRevision: "search-2",
      currencySelectionRevision: "currency-5",
      currency: "EUR",
      results: [],
      ...overrides
    };
  }

  it("accepts a response matching the active search, currency-selection revision, and currency", () => {
    expect(isConversionResponseCurrent(makeResponse({}), active)).toBe(true);
  });

  it("rejects a response for an older search revision", () => {
    expect(isConversionResponseCurrent(makeResponse({ searchRevision: "search-1" }), active)).toBe(false);
  });

  it("rejects a response for an older currency-selection revision", () => {
    expect(isConversionResponseCurrent(makeResponse({ currencySelectionRevision: "currency-4" }), active)).toBe(false);
  });

  it("rejects a response for a different currency", () => {
    expect(isConversionResponseCurrent(makeResponse({ currency: "USD" }), active)).toBe(false);
  });
});
