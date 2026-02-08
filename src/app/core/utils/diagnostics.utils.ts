export interface NormalizedError {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
  extra?: Record<string, unknown>;
}

export function normalizeError(error: unknown): NormalizedError {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      cause: error.cause,
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'StringError',
      message: error,
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as Record<string, unknown>;
    const name =
      typeof errObj['name'] === 'string' ? errObj['name'] : 'ObjectError';
    const message =
      typeof errObj['message'] === 'string'
        ? errObj['message']
        : safeStringify(error);
    const extra = redact(error) as Record<string, unknown> | undefined;
    return {
      name,
      message,
      extra,
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
  };
}

export function errorToString(error: unknown): string {
  const normalized = normalizeError(error);
  if (normalized.stack?.includes(normalized.message)) {
    return normalized.stack;
  }
  return `${normalized.name}: ${normalized.message}${normalized.stack ? '\n' + normalized.stack : ''}`;
}

const STRIPPED_KEYS = ['authorization'];

/**
 * Keys that should be redacted if they are INCLUDED in the key name (case-insensitive).
 * Use this for high-entropy secrets and raw PII that might appear in various field names.
 */
const REDACTED_PATTERNS = [
  'token',
  'password',
  'secret',
  'cookie',
  'api_key',
  'apikey',
  'access_token',
  'refresh_token',
  'writekey',
  'email',
  'phone',
  'address',
  'account_number',
  'routing_number',
  'iban',
  'swift',
  'bic',
  'payee',
];

/**
 * Keys that should be redacted ONLY if they match exactly (case-insensitive).
 * Use this for common words that are sensitive on their own but safe as part of other keys.
 * e.g. "name" is redacted, but "categoryName" is allowed.
 */
const REDACTED_KEYS = [
  'key',
  'auth',
  'first_name',
  'last_name',
  'full_name',
  'username',
  'name',
  'title',
  'amount',
  'budget',
  'category',
  'notes',
  'memo',
  'description',
  'desc',
];

/**
 * Redacts sensitive information from an object.
 * Recursively traverses objects and arrays.
 */
export function redact(obj: unknown, depth = 0): unknown {
  if (!obj || typeof obj !== 'object' || depth > 10) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item, depth + 1));
  }

  const redacted: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;

  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const lowerKey = key.toLowerCase();
      const value = record[key];

      if (STRIPPED_KEYS.some(k => lowerKey.includes(k))) {
        continue;
      }

      const isRedactedPattern = REDACTED_PATTERNS.some(k =>
        lowerKey.includes(k)
      );
      const isRedactedKey = REDACTED_KEYS.includes(lowerKey);

      if (isRedactedPattern || isRedactedKey) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = redact(value, depth + 1);
      } else {
        redacted[key] = value;
      }
    }
  }

  return redacted;
}

export function safeStringify(value: unknown, maxBytes = 8192): string {
  try {
    const str = JSON.stringify(value);
    if (str.length > maxBytes) {
      return str.substring(0, maxBytes) + '... [TRUNCATED]';
    }
    return str;
  } catch {
    return '[Unserializable]';
  }
}
