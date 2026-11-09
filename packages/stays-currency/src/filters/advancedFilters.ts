/**
 * EPMCDMETST-47868-T04: Server-side advanced filters (FR-28, FR-29). Criteria are ANDed across
 * categories; values within a single category (e.g. multiple amenities) are ORed.
 */
import { AdvancedFilterCriteria, StayListing } from "../types";

function matchesAnyOf(value: string, allowed: string[] | undefined): boolean {
  return !allowed || allowed.length === 0 || allowed.includes(value);
}

function matchesAnyOfArray(values: string[], allowed: string[] | undefined): boolean {
  return !allowed || allowed.length === 0 || allowed.some((a) => values.includes(a));
}

export function applyAdvancedFilters(listings: StayListing[], criteria: AdvancedFilterCriteria): StayListing[] {
  return listings.filter((listing) => {
    if (!matchesAnyOf(listing.cancellationPolicy, criteria.cancellationPolicy)) return false;
    if (!matchesAnyOf(listing.mealPlan, criteria.mealPlan)) return false;
    if (criteria.minGuestRating !== undefined && listing.guestRating < criteria.minGuestRating) return false;
    if (criteria.maxDistanceKm !== undefined && listing.distanceFromCenterKm > criteria.maxDistanceKm) return false;
    if (!matchesAnyOf(listing.propertyType, criteria.propertyType)) return false;
    if (!matchesAnyOfArray(listing.amenities, criteria.amenities)) return false;
    if (!matchesAnyOfArray(listing.paymentOptions, criteria.paymentOptions)) return false;
    return true;
  });
}

/** FR-30: an empty criteria object clears all advanced filters without affecting basic filters. */
export const EMPTY_ADVANCED_FILTERS: AdvancedFilterCriteria = {};

/** Canonical known values for the enum-like categories (T04 acceptance: "supported-value validation"). */
export const SUPPORTED_CANCELLATION_POLICIES = ["free", "partial", "non-refundable"];
export const SUPPORTED_MEAL_PLANS = ["none", "breakfast", "half-board", "full-board", "all-inclusive"];
export const SUPPORTED_PROPERTY_TYPES = ["hotel", "apartment", "villa", "hostel", "resort"];

function unsupportedValues(values: string[] | undefined, supported: string[]): string[] {
  return (values ?? []).filter((v) => !supported.includes(v));
}

/**
 * Validates that every submitted enum-like criterion value is a known, supported value, so an
 * unrecognized/mistyped filter value is rejected explicitly instead of silently matching nothing.
 * Returns an empty array when all submitted values are valid.
 */
export function validateAdvancedFilterCriteria(criteria: AdvancedFilterCriteria): string[] {
  const errors: string[] = [];
  for (const value of unsupportedValues(criteria.cancellationPolicy, SUPPORTED_CANCELLATION_POLICIES)) {
    errors.push(`Unsupported cancellationPolicy: "${value}"`);
  }
  for (const value of unsupportedValues(criteria.mealPlan, SUPPORTED_MEAL_PLANS)) {
    errors.push(`Unsupported mealPlan: "${value}"`);
  }
  for (const value of unsupportedValues(criteria.propertyType, SUPPORTED_PROPERTY_TYPES)) {
    errors.push(`Unsupported propertyType: "${value}"`);
  }
  return errors;
}
