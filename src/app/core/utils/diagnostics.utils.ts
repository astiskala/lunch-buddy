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

const REDACTED_KEYS = [
  'token',
  'key',
  'auth',
  'authorization',
  'password',
  'secret',
  'cookie',
  'email',
  'phone',
  'address',
  'amount',
  'balance',
  'budget',
  'transaction',
  'payee',
  'category',
  'notes',
  'memo',
];

export function redact(obj: unknown, includeExtra = false): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redact(item, includeExtra));
  }

  const redacted: Record<string, unknown> = {};
  const record = obj as Record<string, unknown>;
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      const lowerKey = key.toLowerCase();
      if (REDACTED_KEYS.some(k => lowerKey.includes(k)) && !includeExtra) {
        redacted[key] = '[REDACTED]';
      } else if (typeof record[key] === 'object') {
        redacted[key] = redact(record[key], includeExtra);
      } else {
        redacted[key] = record[key];
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
