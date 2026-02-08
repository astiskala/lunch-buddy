import { decodeHtmlEntities } from './text.util';

describe('Text Utils', () => {
  describe('decodeHtmlEntities', () => {
    const expectDecodings = (pairs: readonly [string, string][]): void => {
      for (const [input, expected] of pairs) {
        expect(decodeHtmlEntities(input)).toBe(expected);
      }
    };

    it('should return null for nullish input', () => {
      expect(decodeHtmlEntities(null)).toBeNull();
      expect(decodeHtmlEntities(undefined)).toBeNull();
    });

    it('should decode common named entities', () => {
      expectDecodings([
        ['&amp;', '&'],
        ['&lt;', '<'],
        ['&gt;', '>'],
        ['&quot;', '"'],
        ['&#39;', "'"],
      ]);
    });

    it('should decode decimal and hexadecimal numeric entities', () => {
      expectDecodings([
        ['&#65;', 'A'],
        ['&#169;', '©'],
        ['&#8364;', '€'],
        ['&#x41;', 'A'],
        ['&#xA9;', '©'],
        ['&#x20AC;', '€'],
      ]);
    });

    it('should decode complex strings with mixed entities', () => {
      expectDecodings([
        [
          '&lt;div&gt;Hello &amp; Goodbye&lt;/div&gt;',
          '<div>Hello & Goodbye</div>',
        ],
        ['Caf&#233; &amp; Restaurant', 'Café & Restaurant'],
      ]);
    });

    it('should handle invalid and unknown entities', () => {
      expectDecodings([
        ['&#invalid;', '&#invalid;'],
        ['&#xGGG;', '&#xGGG;'],
        ['&unknown;', '&unknown;'],
        ['&fake123;', '&fake123;'],
      ]);
    });

    it('should handle invalid code points', () => {
      expect(decodeHtmlEntities('&#999999999;')).toBe('�');
    });

    it('should preserve plain text and empty strings', () => {
      expectDecodings([
        ['Hello World', 'Hello World'],
        ['Price: $10 & up', 'Price: $10 & up'],
        ['', ''],
      ]);
    });

    it('should handle Unicode code points', () => {
      expectDecodings([
        ['&#128512;', '😀'],
        ['&#x1F600;', '😀'],
      ]);
    });
  });
});
