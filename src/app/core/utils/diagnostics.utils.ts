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

const REDACTED_KEYS = [
  // Authentication & Infrastructure
  'token',
  'key',
  'auth',
  'password',
  'secret',
  'cookie',
  'api_key',
  'access_token',
  'refresh_token',
  'writekey',

  // Personal Information
  'email',
  'phone',
  'address',
  'first_name',
  'last_name',
  'full_name',
  'username',
  'name',
  'title',

  // Financial Information
  'amount',
  'balance',
  'budget',
  'transaction',
  'payee',
  'category',
  'notes',
  'memo',
  'description',
  'desc',
  'account_number',
  'routing_number',
  'iban',
  'swift',
  'bic',
  'totals',
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

      if (REDACTED_KEYS.some(k => lowerKey.includes(k))) {
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
