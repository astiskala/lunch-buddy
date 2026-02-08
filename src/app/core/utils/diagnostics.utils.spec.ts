import {
  normalizeError,
  redact,
  safeStringify,
  errorToString,
} from './diagnostics.utils';

describe('DiagnosticsUtils', () => {
  describe('normalizeError', () => {
    it('should normalize Error object', () => {
      const error = new Error('Test error');
      error.stack = 'stack trace';
      const result = normalizeError(error);
      expect(result.name).toBe('Error');
      expect(result.message).toBe('Test error');
      expect(result.stack).toBe('stack trace');
    });

    it('should handle string error', () => {
      const result = normalizeError('Pure string error');
      expect(result.name).toBe('StringError');
      expect(result.message).toBe('Pure string error');
    });

    it('should handle object error', () => {
      const result = normalizeError({ name: 'CustomError', message: 'Fail' });
      expect(result.name).toBe('CustomError');
      expect(result.message).toBe('Fail');
    });

    it('should handle anonymous object error', () => {
      const result = normalizeError({ code: 500 });
      expect(result.name).toBe('ObjectError');
      expect(result.message).toContain('500');
    });

    it('should handle null or unknown types', () => {
      const result = normalizeError(null);
      expect(result.name).toBe('UnknownError');
      expect(result.message).toBe('null');
    });
  });

  describe('errorToString', () => {
    it('should format error with stack', () => {
      const err = new Error('BOOM');
      err.stack = 'Error: BOOM\n  at here';
      const str = errorToString(err);
      expect(str).toBe('Error: BOOM\n  at here');
    });

    it('should format error without stack overlap', () => {
      const str = errorToString('message');
      expect(str).toBe('StringError: message');
    });
  });

  describe('redact', () => {
    it('should strip sensitive keys', () => {
      const input = {
        authorization: 'Bearer secret',
        'X-Authorization': 'Secret',
        safe: 'stay',
      };
      const result = redact(input) as Record<string, unknown>;
      expect(result['authorization']).toBeUndefined();
      expect(result['X-Authorization']).toBeUndefined();
      expect(result['safe']).toBe('stay');
    });

    it('should redact sensitive keys', () => {
      const input = {
        token: 'secret-token',
        user: { email: 'test@example.com' },
        safe: 'stay',
      };
      const result = redact(input) as Record<string, unknown>;
      expect(result['token']).toBe('[REDACTED]');
      const user = result['user'] as Record<string, unknown>;
      expect(user['email']).toBe('[REDACTED]');
      expect(result['safe']).toBe('stay');
    });

    it('should redact arrays', () => {
      const input = [{ email: 'a@b.com' }, { safe: 1 }];
      const result = redact(input) as Record<string, unknown>[];
      expect(result[0]?.['email']).toBe('[REDACTED]');
      expect(result[1]?.['safe']).toBe(1);
    });

    it('should redact new financial and personal keys', () => {
      const input = {
        name: 'John Doe',
        amount: 100.5,
        category: 'Food',
        description: 'Lunch with friends',
        payee: 'McDonalds',
        safe: 'stay',
      };
      const result = redact(input) as Record<string, unknown>;
      expect(result['name']).toBe('[REDACTED]');
      expect(result['amount']).toBe('[REDACTED]');
      expect(result['category']).toBe('[REDACTED]');
      expect(result['description']).toBe('[REDACTED]');
      expect(result['payee']).toBe('[REDACTED]');
      expect(result['safe']).toBe('stay');
    });

    it('should return non-objects as-is', () => {
      expect(redact(123)).toBe(123);
      expect(redact(null)).toBe(null);
    });
  });

  describe('safeStringify', () => {
    it('should stringify safely', () => {
      expect(safeStringify({ a: 1 })).toBe('{"a":1}');
    });

    it('should handle circular references', () => {
      const a: Record<string, unknown> = {};
      a['self'] = a;
      expect(safeStringify(a)).toBe('[Unserializable]');
    });

    it('should truncate large strings', () => {
      const large = 'A'.repeat(100);
      const result = safeStringify(large, 50);
      expect(result.length).toBeLessThan(100);
      expect(result).toContain('TRUNCATED');
    });
  });
});
