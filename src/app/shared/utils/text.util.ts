const entityMap: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
};

const entityPattern = /&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g;

export function decodeHtmlEntities(value: string): string;
export function decodeHtmlEntities(value: null | undefined): null;
export function decodeHtmlEntities(value: string | null | undefined): string | null;
export function decodeHtmlEntities(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return value.replace(entityPattern, (match, entity) => {
    if (entityMap[match]) {
      return entityMap[match];
    }

    if (entity.startsWith('#')) {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const code = isHex
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);

      if (Number.isNaN(code)) {
        return match;
      }

      try {
        return String.fromCodePoint(code);
      } catch {
        return match;
      }
    }

    return match;
  });
}
