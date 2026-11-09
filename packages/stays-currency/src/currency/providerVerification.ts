/**
 * EPMCDMETST-47868-T01: Provider-suitability verification record.
 *
 * MOCK DATA — this is simulated/placeholder evidence for development purposes only, NOT a real
 * vendor due-diligence result. Per impl-plan.md's explicit gate, production provider integration
 * (T05) must stay disabled (`passes: false`) until a real, dated verification of Open Exchange
 * Rates' actual update cadence, required pair coverage, plan limits, and contractual terms against
 * FR-36 has been recorded by the task owner.
 */
export interface ProviderVerificationRecord {
  provider: string;
  /** ISO 8601 date the record was reviewed, or null while still a mock/unverified placeholder. */
  verifiedAt: string | null;
  isMock: boolean;
  updateCadenceMinutes: number;
  supportedBaseCurrencies: string[];
  supportedTargetCurrencies: string[];
  planRequestsPerMonth: number;
  termsReviewed: boolean;
  /** Must be true only once a real (non-mock) verification has actually passed. */
  passes: boolean;
}

export const MOCK_PROVIDER_VERIFICATION: ProviderVerificationRecord = {
  provider: "open-exchange-rates",
  verifiedAt: null,
  isMock: true,
  updateCadenceMinutes: 60,
  supportedBaseCurrencies: ["USD"],
  supportedTargetCurrencies: ["USD", "EUR", "GBP", "AED", "JPY"],
  planRequestsPerMonth: 1000,
  termsReviewed: false,
  passes: false
};

/** Throws unless the given verification record has actually passed (T05's enablement gate). */
export function assertProviderVerified(record: ProviderVerificationRecord): void {
  if (!record.passes) {
    throw new Error(
      `Provider "${record.provider}" is not verified (T01 gate not passed) — integration remains blocked per impl-plan.md T05.`
    );
  }
}
