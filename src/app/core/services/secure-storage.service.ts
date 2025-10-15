import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

interface EncryptedPayload {
  version: number;
  algorithm: 'AES-GCM';
  iv: string;
  ciphertext: string;
}

const ENCRYPTION_KEY_DB_NAME = 'lunchbuddy-secure-storage';
const ENCRYPTION_KEY_STORE = 'keys';
const ENCRYPTION_KEY_ID = 'api-key';

/**
 * Provides encrypted persistence for sensitive values (like API keys).
 * Values are encrypted with AES-GCM before being stored in localStorage.
 * The symmetric key is generated on first use and persisted in IndexedDB.
 */
@Injectable({
  providedIn: 'root',
})
export class SecureStorageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  private readonly dbOpenTimeoutMs = 1500;

  private dbPromise: Promise<IDBDatabase> | null = null;
  private keyPromise: Promise<CryptoKey | null> | null = null;
  private encryptionSupported: boolean | null = null;
  private loggedFallback = false;

  async setItem(key: string, value: string): Promise<void> {
    if (!this.isEncryptionSupported()) {
      localStorage.setItem(key, value);
      return;
    }

    const cryptoApi = this.getCrypto();
    if (!cryptoApi?.subtle) {
      localStorage.setItem(key, value);
      return;
    }

    const cryptoKey = await this.getOrCreateKey();
    if (!cryptoKey) {
      localStorage.setItem(key, value);
      return;
    }

    const iv = cryptoApi.getRandomValues(new Uint8Array(12));
    const ciphertext = await cryptoApi.subtle.encrypt(
      { name: 'AES-GCM', iv },
      cryptoKey,
      this.encoder.encode(value),
    );

    const payload: EncryptedPayload = {
      version: 1,
      algorithm: 'AES-GCM',
      iv: this.bufferToBase64(iv),
      ciphertext: this.bufferToBase64(ciphertext),
    };

    localStorage.setItem(key, JSON.stringify(payload));
  }

  async getItem(key: string): Promise<string | null> {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }

    if (!this.isEncryptionSupported()) {
      return raw;
    }

    try {
      const payload = JSON.parse(raw) as Partial<EncryptedPayload>;
      if (
        typeof payload === 'object' &&
        payload !== null &&
        payload.version === 1 &&
        payload.algorithm === 'AES-GCM' &&
        typeof payload.iv === 'string' &&
        typeof payload.ciphertext === 'string'
      ) {
        const cryptoKey = await this.getExistingKey();
        if (!cryptoKey) {
          return null;
        }

        const cryptoApi = this.getCrypto();
        if (!cryptoApi?.subtle) {
          return null;
        }

        const plaintext = await cryptoApi.subtle.decrypt(
          { name: 'AES-GCM', iv: this.base64ToBuffer(payload.iv) },
          cryptoKey,
          this.base64ToBuffer(payload.ciphertext),
        );

        return this.decoder.decode(plaintext);
      }
    } catch {
      // Stored value is legacy plaintext – re-encrypt for future accesses.
      await this.setItem(key, raw);
      return raw;
    }

    return null;
  }

  async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  private isEncryptionSupported(): boolean {
    if (this.encryptionSupported !== null) {
      return this.encryptionSupported;
    }

    if (!isPlatformBrowser(this.platformId)) {
      this.encryptionSupported = false;
      return this.encryptionSupported;
    }

    if (!this.isSecureContext()) {
      this.encryptionSupported = false;
      return this.encryptionSupported;
    }

    if (typeof indexedDB === 'undefined') {
      this.encryptionSupported = false;
      return this.encryptionSupported;
    }

    const cryptoApi = this.getCrypto();
    this.encryptionSupported = !!cryptoApi && !!cryptoApi.subtle;
    return this.encryptionSupported;
  }

  private async getOrCreateKey(): Promise<CryptoKey | null> {
    return (this.keyPromise ??= this.createKey());
  }

  private async getExistingKey(): Promise<CryptoKey | null> {
    return (this.keyPromise ??= this.loadExistingKey());
  }

  private async createKey(): Promise<CryptoKey | null> {
    try {
      const existing = await this.loadExistingKey();
      if (existing) {
        return existing;
      }

      const cryptoApi = this.getCrypto();
      if (!cryptoApi?.subtle) {
        return null;
      }

      const cryptoKey = await cryptoApi.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
      );

      const raw = await cryptoApi.subtle.exportKey('raw', cryptoKey);
      await this.storeKey(new Uint8Array(raw));

      return cryptoApi.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    } catch (error) {
      console.error('SecureStorageService: failed to create encryption key', error);
      this.disableEncryptionForSession(error);
      return null;
    }
  }

  private async loadExistingKey(): Promise<CryptoKey | null> {
    try {
      const raw = await this.loadKey();
      if (!raw) {
        return null;
      }

      const cryptoApi = this.getCrypto();
      if (!cryptoApi?.subtle) {
        return null;
      }

      return cryptoApi.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
    } catch (error) {
      console.error('SecureStorageService: failed to load encryption key', error);
      this.disableEncryptionForSession(error);
      return null;
    }
  }

  private getCrypto(): Crypto | null {
    const globalCrypto = typeof globalThis !== 'undefined' ? (globalThis as { crypto?: Crypto }).crypto : undefined;
    return globalCrypto ?? null;
  }

  private isSecureContext(): boolean {
    const globalObj = typeof globalThis !== 'undefined' ? (globalThis as { isSecureContext?: boolean }) : undefined;
    return globalObj?.isSecureContext === true;
  }

  private async getDb(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    const openPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(ENCRYPTION_KEY_DB_NAME, 1);
      const globalObj = globalThis as typeof globalThis & {
        setTimeout?: typeof setTimeout;
        clearTimeout?: typeof clearTimeout;
      };

      const cleanup = (): void => {
        if (timeoutId !== null && typeof globalObj.clearTimeout === 'function') {
          globalObj.clearTimeout(timeoutId);
        }
        request.onupgradeneeded = null;
        request.onsuccess = null;
        request.onerror = null;
        request.onblocked = null;
      };

      const timeoutId =
        typeof globalObj.setTimeout === 'function'
          ? globalObj.setTimeout(() => {
              cleanup();
              reject(new Error('Secure storage database open timed out'));
            }, this.dbOpenTimeoutMs)
          : null;

      request.onupgradeneeded = () => {
        request.result.createObjectStore(ENCRYPTION_KEY_STORE);
      };

      request.onsuccess = () => {
        cleanup();
        resolve(request.result);
      };
      request.onerror = () => {
        cleanup();
        reject(request.error ?? new Error('Failed to open secure storage database'));
      };
      request.onblocked = () => {
        cleanup();
        reject(new Error('Secure storage database open was blocked'));
      };
    });

    this.dbPromise = openPromise.catch((error) => {
      this.disableEncryptionForSession(error);
      throw error;
    });

    return this.dbPromise;
  }

  private async loadKey(): Promise<ArrayBuffer | null> {
    const db = await this.getDb();

    return new Promise<ArrayBuffer | null>((resolve, reject) => {
      const tx = db.transaction(ENCRYPTION_KEY_STORE, 'readonly');
      const store = tx.objectStore(ENCRYPTION_KEY_STORE);
      const request = store.get(ENCRYPTION_KEY_ID);

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }

        if (result instanceof ArrayBuffer) {
          resolve(result);
          return;
        }

        if (ArrayBuffer.isView(result)) {
          const view = result as ArrayBufferView;
          const bytes = new Uint8Array(view.byteLength);
          bytes.set(new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
          resolve(bytes.buffer);
          return;
        }

        reject(new Error('Unexpected encryption key format'));
      };

      request.onerror = () => reject(request.error ?? new Error('Failed to read encryption key'));
    });
  }

  private async storeKey(raw: Uint8Array): Promise<void> {
    const db = await this.getDb();

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ENCRYPTION_KEY_STORE, 'readwrite');
      const store = tx.objectStore(ENCRYPTION_KEY_STORE);
      const request = store.put(raw, ENCRYPTION_KEY_ID);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error ?? new Error('Failed to persist encryption key'));
    });
  }

  private bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToBuffer(value: string): ArrayBuffer {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private disableEncryptionForSession(reason: unknown): void {
    if (!this.loggedFallback) {
      console.error('SecureStorageService: falling back to plaintext storage', reason);
      this.loggedFallback = true;
    }
    this.encryptionSupported = false;
    this.dbPromise = null;
    this.keyPromise = null;
  }
}
