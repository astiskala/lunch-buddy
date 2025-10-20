/**
 * Decodes HTML entities using the browser's native DOMParser.
 * This is simpler and more reliable than manual regex-based decoding.
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

  // Use DOMParser with text/html to properly decode entities
  const doc = new DOMParser().parseFromString(value, 'text/html');
  return doc.documentElement.textContent || '';
}
