const BASIC_ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&#x27;': "'",
  '&apos;': "'",
};

function decodeWithFallback(html: string): string {
  return html
    .replaceAll(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(hex, 16));
      } catch {
        return '�';
      }
    })
    .replaceAll(/&#(\d+);/g, (_, dec: string) => {
      try {
        return String.fromCodePoint(Number.parseInt(dec, 10));
      } catch {
        return '�';
      }
    })
    .replaceAll(
      /&(?:amp|lt|gt|quot|apos|#39|#x27);/g,
      entity => BASIC_ENTITY_MAP[entity] ?? entity
    );
}

/**
 * Decodes HTML entities without relying on DOM APIs so Trusted Types checks do not flag the code path.
 * Handles the common named entities plus hexadecimal and decimal numeric references.
 */
export function decodeHtmlEntities(value: string): string;
export function decodeHtmlEntities(value: null | undefined): null;
export function decodeHtmlEntities(
  value: string | null | undefined
): string | null;
export function decodeHtmlEntities(
  value: string | null | undefined
): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return decodeWithFallback(value);
}
