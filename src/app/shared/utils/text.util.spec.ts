import { decodeHtmlEntities } from './text.util';

describe('Text Utils', () => {
  describe('decodeHtmlEntities', () => {
    it('should return null for null input', () => {
      expect(decodeHtmlEntities(null)).toBeNull();
    });

    it('should return null for undefined input', () => {
      expect(decodeHtmlEntities(undefined)).toBeNull();
    });

    it('should decode common HTML entities', () => {
      expect(decodeHtmlEntities('&amp;')).toBe('&');
      expect(decodeHtmlEntities('&lt;')).toBe('<');
      expect(decodeHtmlEntities('&gt;')).toBe('>');
      expect(decodeHtmlEntities('&quot;')).toBe('"');
      expect(decodeHtmlEntities('&#39;')).toBe("'");
    });

    it('should decode multiple entities in a string', () => {
      expect(
        decodeHtmlEntities('&lt;div&gt;Hello &amp; Goodbye&lt;/div&gt;')
      ).toBe('<div>Hello & Goodbye</div>');
    });

    it('should decode decimal numeric entities', () => {
      expect(decodeHtmlEntities('&#65;')).toBe('A');
      expect(decodeHtmlEntities('&#169;')).toBe('©');
      expect(decodeHtmlEntities('&#8364;')).toBe('€');
    });

    it('should decode hexadecimal numeric entities', () => {
      expect(decodeHtmlEntities('&#x41;')).toBe('A');
      expect(decodeHtmlEntities('&#xA9;')).toBe('©');
      expect(decodeHtmlEntities('&#x20AC;')).toBe('€');
    });

    it('should handle invalid numeric entities', () => {
      expect(decodeHtmlEntities('&#invalid;')).toBe('&#invalid;');
      expect(decodeHtmlEntities('&#xGGG;')).toBe('&#xGGG;');
    });

    it('should handle invalid code points', () => {
      // Test code point that might throw (very large number)
      expect(decodeHtmlEntities('&#999999999;')).toBe('�');
    });

    it('should handle unknown named entities', () => {
      expect(decodeHtmlEntities('&unknown;')).toBe('&unknown;');
      expect(decodeHtmlEntities('&fake123;')).toBe('&fake123;');
    });

    it('should preserve non-entity text', () => {
      expect(decodeHtmlEntities('Hello World')).toBe('Hello World');
      expect(decodeHtmlEntities('Price: $10 & up')).toBe('Price: $10 & up');
    });

    it('should handle mixed entities and text', () => {
      expect(decodeHtmlEntities('Caf&eacute; &amp; Restaurant')).toBe(
        'Café & Restaurant'
      );
    });

    it('should handle empty string', () => {
      expect(decodeHtmlEntities('')).toBe('');
    });

    it('should handle special characters from code points', () => {
      expect(decodeHtmlEntities('&#128512;')).toBe('😀'); // Emoji
      expect(decodeHtmlEntities('&#x1F600;')).toBe('😀'); // Emoji in hex
    });
  });
});
