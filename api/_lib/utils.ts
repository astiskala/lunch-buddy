import {
  randomUUID,
  webcrypto,
  timingSafeEqual,
  createHash,
} from 'node:crypto';

export const SUPPORT_CODE_LENGTH = 10;
const SUPPORT_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SUPPORT_CODE_PATTERN = new RegExp(
  `^[${SUPPORT_CODE_ALPHABET}]{${String(SUPPORT_CODE_LENGTH)}}$`
);

/**
 * Hashes a write key for storage.
 */
export async function hashWriteKey(writeKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(writeKey);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Performs a timing-safe string comparison.
 */
export function safeCompare(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB) && a === b;
}

/**
 * Generates a random support code.
 */
export function generateSupportCode(): string {
  const randomBytes = new Uint8Array(SUPPORT_CODE_LENGTH);
  webcrypto.getRandomValues(randomBytes);

  let code = '';
  for (const value of randomBytes) {
    code += SUPPORT_CODE_ALPHABET[value % SUPPORT_CODE_ALPHABET.length];
  }
  return code;
}

export function normalizeSupportCode(value: string): string {
  return value.trim().toUpperCase();
}

export function isValidSupportCode(value: string): boolean {
  return SUPPORT_CODE_PATTERN.test(value);
}

/**
 * Generates an opaque UUID-style identifier.
 */
export function generateOpaqueId(): string {
  return randomUUID();
}
