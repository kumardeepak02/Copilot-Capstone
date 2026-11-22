import { isGivenName, resolveDisplayName } from "./resolveDisplayName";

/**
 * NameDisplay component: renders a given name in bold or the fallback "Unnamed" in plain text.
 * This is a presentational component that accepts a name input and returns a DOM node.
 *
 * For a given name: renders <b>name</b> (FR-1, FR-2, A-1)
 * For any other input: renders plain text "Unnamed" (FR-3, FR-4, A-2)
 *
 * @param name - The name to display; may be string, null, undefined, or any other type
 * @returns A DOM Node: either a <b> element for a given name, or a text node for "Unnamed"
 */
export function NameDisplay(name: string | null | undefined | any): Node {
  const displayText = resolveDisplayName(name);

  if (isGivenName(name)) {
    // For a given name, render <b>name</b> with text content (A-7: textContent, not innerHTML)
    const boldElement = document.createElement("b");
    boldElement.textContent = name; // Set as text, never as markup, to prevent injection
    return boldElement;
  } else {
    // For any other input, render "Unnamed" as plain text (A-2, A-7)
    return document.createTextNode(displayText);
  }
}
