import { isGivenName, resolveDisplayName } from "../resolveDisplayName";

describe("resolveDisplayName", () => {
  describe("isGivenName predicate", () => {
    it("should return true for a plain name", () => {
      expect(isGivenName("Alice")).toBe(true);
    });

    it("should return true for a name with leading and trailing spaces (A-3)", () => {
      expect(isGivenName("  Alice  ")).toBe(true);
    });

    it("should return false for null (AC-3)", () => {
      expect(isGivenName(null)).toBe(false);
    });

    it("should return false for undefined (A-6, AC-3)", () => {
      expect(isGivenName(undefined)).toBe(false);
    });

    it("should return false for empty string (AC-3)", () => {
      expect(isGivenName("")).toBe(false);
    });

    it("should return false for whitespace-only input (AC-4)", () => {
      expect(isGivenName(" \t\n ")).toBe(false);
    });

    it("should return false for non-string values (A-5)", () => {
      expect(isGivenName(42)).toBe(false);
      expect(isGivenName(true)).toBe(false);
      expect(isGivenName({})).toBe(false);
      expect(isGivenName([])).toBe(false);
    });
  });

  describe("resolveDisplayName function", () => {
    it("should return the name unchanged for a plain name", () => {
      expect(resolveDisplayName("Alice")).toBe("Alice");
    });

    it("should return the name unchanged with leading and trailing spaces (A-3)", () => {
      expect(resolveDisplayName("  Alice  ")).toBe("  Alice  ");
    });

    it("should return 'Unnamed' for null without throwing (AC-2, AC-3)", () => {
      expect(resolveDisplayName(null)).toBe("Unnamed");
    });

    it("should return 'Unnamed' for undefined without throwing (A-6, AC-2, AC-3)", () => {
      expect(resolveDisplayName(undefined)).toBe("Unnamed");
    });

    it("should return 'Unnamed' for empty string without throwing (AC-2, AC-3)", () => {
      expect(resolveDisplayName("")).toBe("Unnamed");
    });

    it("should return 'Unnamed' for whitespace-only input without throwing (AC-2, AC-4)", () => {
      expect(resolveDisplayName(" \t\n ")).toBe("Unnamed");
    });

    it("should return 'Unnamed' for non-string values without throwing (A-5, AC-2)", () => {
      expect(resolveDisplayName(42)).toBe("Unnamed");
      expect(resolveDisplayName(true)).toBe("Unnamed");
      expect(resolveDisplayName({})).toBe("Unnamed");
      expect(resolveDisplayName([])).toBe("Unnamed");
    });

    it("should not throw for any input (AC-2)", () => {
      const testInputs = [
        "Alice",
        "  Alice  ",
        null,
        undefined,
        "",
        " \t\n ",
        42,
        true,
        {},
        []
      ];
      testInputs.forEach(input => {
        expect(() => resolveDisplayName(input)).not.toThrow();
      });
    });
  });
});
