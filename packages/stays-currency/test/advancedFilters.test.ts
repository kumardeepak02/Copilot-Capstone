import { applyAdvancedFilters, validateAdvancedFilterCriteria } from "../src/filters/advancedFilters";
import { StayListing } from "../src/types";

function makeListing(overrides: Partial<StayListing>): StayListing {
  return {
    id: "default",
    cancellationPolicy: "free",
    mealPlan: "none",
    guestRating: 4,
    distanceFromCenterKm: 1,
    propertyType: "hotel",
    amenities: ["wifi"],
    paymentOptions: ["card"],
    baseAmountMinorUnits: 10000,
    baseCurrency: "USD",
    ...overrides
  };
}

describe("applyAdvancedFilters", () => {
  const listings: StayListing[] = [
    makeListing({ id: "a", cancellationPolicy: "free", guestRating: 4.5, propertyType: "hotel", amenities: ["wifi", "pool"] }),
    makeListing({ id: "b", cancellationPolicy: "non-refundable", guestRating: 3.0, propertyType: "apartment", amenities: ["wifi"] }),
    makeListing({ id: "c", cancellationPolicy: "free", guestRating: 4.8, propertyType: "hotel", distanceFromCenterKm: 10, amenities: ["pool"] })
  ];

  it("returns all listings when no criteria are set (FR-30 reset)", () => {
    expect(applyAdvancedFilters(listings, {})).toHaveLength(3);
  });

  it("ANDs across categories", () => {
    const result = applyAdvancedFilters(listings, { cancellationPolicy: ["free"], propertyType: ["hotel"] });
    expect(result.map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("ORs within a single category (amenities)", () => {
    const result = applyAdvancedFilters(listings, { amenities: ["pool"] });
    expect(result.map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("filters by minimum guest rating", () => {
    const result = applyAdvancedFilters(listings, { minGuestRating: 4.5 });
    expect(result.map((l) => l.id)).toEqual(["a", "c"]);
  });

  it("filters by maximum distance in kilometers", () => {
    const result = applyAdvancedFilters(listings, { maxDistanceKm: 5 });
    expect(result.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("filters by meal plan", () => {
    const withMealPlans = [
      makeListing({ id: "x", mealPlan: "breakfast" }),
      makeListing({ id: "y", mealPlan: "all-inclusive" })
    ];
    expect(applyAdvancedFilters(withMealPlans, { mealPlan: ["all-inclusive"] }).map((l) => l.id)).toEqual(["y"]);
  });

  it("ORs within payment options", () => {
    const withPaymentOptions = [
      makeListing({ id: "x", paymentOptions: ["card"] }),
      makeListing({ id: "y", paymentOptions: ["cash", "pay-at-property"] })
    ];
    const result = applyAdvancedFilters(withPaymentOptions, { paymentOptions: ["cash"] });
    expect(result.map((l) => l.id)).toEqual(["y"]);
  });

  it("supports validated/known values only and excludes everything for an unmatched category value", () => {
    const result = applyAdvancedFilters(listings, { propertyType: ["villa"] });
    expect(result).toHaveLength(0);
  });
});

describe("validateAdvancedFilterCriteria", () => {
  it("returns no errors for all-supported values", () => {
    expect(validateAdvancedFilterCriteria({ cancellationPolicy: ["free"], mealPlan: ["breakfast"], propertyType: ["hotel"] })).toEqual([]);
  });

  it("returns no errors when no criteria are set", () => {
    expect(validateAdvancedFilterCriteria({})).toEqual([]);
  });

  it("flags an unsupported/mistyped propertyType value instead of silently matching nothing", () => {
    const errors = validateAdvancedFilterCriteria({ propertyType: ["villaa"] });
    expect(errors).toEqual([expect.stringContaining('Unsupported propertyType: "villaa"')]);
  });

  it("flags unsupported cancellationPolicy and mealPlan values", () => {
    const errors = validateAdvancedFilterCriteria({ cancellationPolicy: ["refundable"], mealPlan: ["brunch"] });
    expect(errors).toEqual([
      expect.stringContaining('Unsupported cancellationPolicy: "refundable"'),
      expect.stringContaining('Unsupported mealPlan: "brunch"')
    ]);
  });
});
