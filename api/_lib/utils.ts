import { randomUUID, webcrypto } from 'node:crypto';

/**
 * Hash a write key for storage
 */
export async function hashWriteKey(writeKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(writeKey);
  const hashBuffer = await webcrypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a random support code (e.g. 8-10 chars)
 */
export function generateSupportCode(): string {
  // Use crypto.getRandomValues for cryptographically strong random values
  const array = new Uint32Array(1);
  webcrypto.getRandomValues(array);
  const randomValue = array[0] / (0xffffffff + 1);
  return randomValue.toString(36).substring(2, 12).toUpperCase();
}

/**
 * Generate a random UUID-like sessionId or writeKey
 */
export function generateOpaqueId(): string {
  return randomUUID();
}
