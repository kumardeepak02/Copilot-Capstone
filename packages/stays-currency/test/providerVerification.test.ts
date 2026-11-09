import { MOCK_PROVIDER_VERIFICATION, assertProviderVerified, ProviderVerificationRecord } from "../src/currency/providerVerification";

describe("providerVerification", () => {
  it("the current mock record has not passed verification", () => {
    expect(MOCK_PROVIDER_VERIFICATION.isMock).toBe(true);
    expect(MOCK_PROVIDER_VERIFICATION.passes).toBe(false);
  });

  it("assertProviderVerified throws for an unverified record", () => {
    expect(() => assertProviderVerified(MOCK_PROVIDER_VERIFICATION)).toThrow(/not verified/);
  });

  it("assertProviderVerified passes for a verified record", () => {
    const verified: ProviderVerificationRecord = { ...MOCK_PROVIDER_VERIFICATION, isMock: false, passes: true };
    expect(() => assertProviderVerified(verified)).not.toThrow();
  });
});
