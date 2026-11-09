/**
 * EPMCDMETST-47868-T02: Search and conversion API contracts, including response correlation
 * (architecture.md §9, design-review.md DR-47868-01).
 */

/** The seven advanced filter categories in scope (FR-28). */
export interface AdvancedFilterCriteria {
  cancellationPolicy?: string[];
  mealPlan?: string[];
  minGuestRating?: number;
  maxDistanceKm?: number;
  propertyType?: string[];
  amenities?: string[];
  paymentOptions?: string[];
}

export interface StayListing {
  id: string;
  cancellationPolicy: string;
  mealPlan: string;
  guestRating: number;
  distanceFromCenterKm: number;
  propertyType: string;
  amenities: string[];
  paymentOptions: string[];
  /** Base/original price, in the property's base currency's minor units (e.g. cents). */
  baseAmountMinorUnits: number;
  baseCurrency: string;
}

export interface SearchRequest {
  /** Existing basic search params are assumed upstream; this is additive (FR-27). */
  advancedFilters?: AdvancedFilterCriteria;
}

export interface SearchResponse {
  /** Monotonically increasing identifier for the search that produced these results. */
  searchRevision: string;
  listings: StayListing[];
}

export interface ConversionRequest {
  searchRevision: string;
  currencySelectionRevision: string;
  currency: string;
}

export interface ConversionResult {
  listingId: string;
  /** Present when conversion succeeded. */
  convertedAmountMinorUnits?: number;
  /** True when FR-37 fallback to the original/base currency applies. */
  fallback: boolean;
  fallbackNotice?: string;
}

export interface ConversionResponse {
  searchRevision: string;
  currencySelectionRevision: string;
  currency: string;
  results: ConversionResult[];
}

/** The caller's currently active search/currency-selection state, used to validate responses. */
export interface ActiveSelectionState {
  searchRevision: string;
  currencySelectionRevision: string;
  currency: string;
}

/**
 * Rejects stale or misapplied conversion responses (DR-47868-01): a response only applies if it
 * matches the search revision, currency-selection revision, and requested currency currently active.
 */
export function isConversionResponseCurrent(
  response: ConversionResponse,
  active: ActiveSelectionState
): boolean {
  return (
    response.searchRevision === active.searchRevision &&
    response.currencySelectionRevision === active.currencySelectionRevision &&
    response.currency === active.currency
  );
}
