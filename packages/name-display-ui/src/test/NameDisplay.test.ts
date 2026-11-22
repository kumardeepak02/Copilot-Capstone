import { NameDisplay } from "../NameDisplay";

describe("NameDisplay rendering", () => {
  describe("given name rendering", () => {
    it("should render <b> element with the name text for a plain name (AC-1, FR-2)", () => {
      const result = NameDisplay("Alice");
      
      // The result should be a Node
      expect(result).toBeInstanceOf(Node);
      
      // Create a container to inspect the rendered output
      const container = document.createElement("div");
      container.appendChild(result);
      
      // Should contain exactly one <b> element
      const boldElements = container.querySelectorAll("b");
      expect(boldElements.length).toBe(1);
      
      // The <b> element should contain the name as text
      expect(boldElements[0].textContent).toBe("Alice");
    });

    it("should preserve leading and trailing spaces in the name", () => {
      const result = NameDisplay("  Alice  ");
      
      const container = document.createElement("div");
      container.appendChild(result);
      
      const boldElements = container.querySelectorAll("b");
      expect(boldElements.length).toBe(1);
      expect(boldElements[0].textContent).toBe("  Alice  ");
    });
  });

  describe("fallback rendering", () => {
    it("should render plain text 'Unnamed' for null without <b> element (AC-2, AC-3, A-2)", () => {
      const result = NameDisplay(null);
      
      // The result should be a text node
      expect(result.nodeType).toBe(Node.TEXT_NODE);
      expect(result.textContent).toBe("Unnamed");
      
      // Create a container to verify no <b> element
      const container = document.createElement("div");
      container.appendChild(result);
      const boldElements = container.querySelectorAll("b");
      expect(boldElements.length).toBe(0);
    });

    it("should render plain text 'Unnamed' for undefined without <b> element (AC-2, AC-3, A-6, A-2)", () => {
      const result = NameDisplay(undefined);
      
      expect(result.nodeType).toBe(Node.TEXT_NODE);
      expect(result.textContent).toBe("Unnamed");
      
      const container = document.createElement("div");
      container.appendChild(result);
      const boldElements = container.querySelectorAll("b");
      expect(boldElements.length).toBe(0);
    });

    it("should render plain text 'Unnamed' for empty string without <b> element (AC-2, AC-3, A-2)", () => {
      const result = NameDisplay("");
      
      expect(result.nodeType).toBe(Node.TEXT_NODE);
      expect(result.textContent).toBe("Unnamed");
      
      const container = document.createElement("div");
      container.appendChild(result);
      const boldElements = container.querySelectorAll("b");
      expect(boldElements.length).toBe(0);
    });

    it("should render plain text 'Unnamed' for whitespace-only input without <b> element (AC-4, A-2)", () => {
      const result = NameDisplay(" \t\n ");
      
      expect(result.nodeType).toBe(Node.TEXT_NODE);
      expect(result.textContent).toBe("Unnamed");
      
      const container = document.createElement("div");
      container.appendChild(result);
      const boldElements = container.querySelectorAll("b");
      expect(boldElements.length).toBe(0);
    });
  });

  describe("no-throw behavior at render time", () => {
    it("should not throw for any input (AC-2)", () => {
      const testInputs = [
        "Alice",
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
        expect(() => NameDisplay(input)).not.toThrow();
      });
    });

    it("should not throw for non-string values including numbers (A-5, AC-2)", () => {
      expect(() => NameDisplay(42)).not.toThrow();
      expect(() => NameDisplay(0)).not.toThrow();
      expect(() => NameDisplay(true)).not.toThrow();
      expect(() => NameDisplay(false)).not.toThrow();
      expect(() => NameDisplay({})).not.toThrow();
      expect(() => NameDisplay([])).not.toThrow();
    });
  });
});
