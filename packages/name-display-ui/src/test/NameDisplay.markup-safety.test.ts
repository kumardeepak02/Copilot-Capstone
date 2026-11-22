import { NameDisplay } from "../NameDisplay";

describe("NameDisplay markup safety (T05)", () => {
  it("should render markup-like string as text inside <b>, not as DOM elements (DR-6, A-7)", () => {
    // A name containing markup should be rendered as text, not parsed as markup
    const markupString = "<img src=x onerror=alert(1)>";
    const result = NameDisplay(markupString);

    // Create a container to inspect the rendered output
    const container = document.createElement("div");
    container.appendChild(result);

    // Should contain exactly one <b> element (FR-2, AC-1)
    const boldElements = container.querySelectorAll("b");
    expect(boldElements.length).toBe(1);

    // The <b> element's text content should be the original markup string (A-7: textContent, not innerHTML)
    expect(boldElements[0].textContent).toBe(markupString);

    // No <img> element should be created in the rendered DOM
    const imgElements = container.querySelectorAll("img");
    expect(imgElements.length).toBe(0);

    // Verify that only the <b> element exists in the container
    // (the name is rendered as text, not parsed)
    expect(container.children.length).toBe(1);
    expect(container.children[0].tagName.toLowerCase()).toBe("b");
  });

  it("should render other markup-like strings as text without parsing", () => {
    const testMarkups = [
      "<script>alert('xss')</script>",
      "<svg><circle cx=100 cy=100 r=90 onload=alert('xss')></circle></svg>",
      "<div>arbitrary html</div>",
      "<style>body { display: none; }</style>"
    ];

    testMarkups.forEach(markup => {
      const result = NameDisplay(markup);
      const container = document.createElement("div");
      container.appendChild(result);

      // Each should render as plain text in a <b> element
      const boldElements = container.querySelectorAll("b");
      expect(boldElements.length).toBe(1);
      expect(boldElements[0].textContent).toBe(markup);

      // No child elements should be created from the markup
      const hasChildren = boldElements[0].children.length > 0;
      expect(hasChildren).toBe(false);
    });
  });
});
