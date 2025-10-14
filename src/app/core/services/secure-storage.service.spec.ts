import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { SecureStorageService } from './secure-storage.service';

const TEST_STORAGE_KEY = 'secure-storage-test';
const TEST_STORAGE_VALUE = 'super-secret-value';

describe('SecureStorageService', () => {
  let service: SecureStorageService;
  let storedKey: Uint8Array | null;

  beforeEach(() => {
    localStorage.clear();
    storedKey = null;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });

    service = TestBed.inject(SecureStorageService);

    const mockCrypto = createMockCrypto();

    // Override internal helpers to avoid relying on browser Web Crypto/IndexedDB in tests.
    (service as unknown as { getCrypto: () => Crypto }).getCrypto = () => mockCrypto;
    (service as unknown as { storeKey(raw: Uint8Array): Promise<void> }).storeKey = async (raw: Uint8Array) => {
      storedKey = new Uint8Array(raw);
    };
    (service as unknown as { loadKey(): Promise<ArrayBuffer | null> }).loadKey = async () =>
      storedKey ? storedKey.slice().buffer : null;
    (service as unknown as { isEncryptionSupported(): boolean }).isEncryptionSupported = () => true;
    (service as unknown as { encryptionSupported: boolean }).encryptionSupported = true;
    (service as unknown as { isSecureContext(): boolean }).isSecureContext = () => true;
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('stores encrypted payloads', async () => {
    await service.setItem(TEST_STORAGE_KEY, TEST_STORAGE_VALUE);
    const stored = localStorage.getItem(TEST_STORAGE_KEY);

    expect(stored).toBeTruthy();
    expect(stored).not.toContain(TEST_STORAGE_VALUE);
  });

  it('restores original value after encryption and retrieval', async () => {
    await service.setItem(TEST_STORAGE_KEY, TEST_STORAGE_VALUE);
    const restored = await service.getItem(TEST_STORAGE_KEY);

    expect(restored).toBe(TEST_STORAGE_VALUE);
  });

  it('migrates legacy plaintext entries on read', async () => {
    localStorage.setItem(TEST_STORAGE_KEY, TEST_STORAGE_VALUE);

    const restored = await service.getItem(TEST_STORAGE_KEY);
    const stored = localStorage.getItem(TEST_STORAGE_KEY);

    expect(restored).toBe(TEST_STORAGE_VALUE);
    expect(stored).toBeTruthy();
    expect(stored).not.toBe(TEST_STORAGE_VALUE);
  });

  it('removes stored values', async () => {
    await service.setItem(TEST_STORAGE_KEY, TEST_STORAGE_VALUE);
    await service.removeItem(TEST_STORAGE_KEY);

    expect(localStorage.getItem(TEST_STORAGE_KEY)).toBeNull();
  });
});

function createMockCrypto(): Crypto {
  const subtle = {
    async generateKey(): Promise<CryptoKey> {
      const raw = new Uint8Array(32);
      raw.fill(42);
      return { raw } as unknown as CryptoKey;
    },
    async exportKey(format: 'raw', key: CryptoKey): Promise<ArrayBuffer> {
      if (format !== 'raw') {
        throw new Error('MockCrypto only supports raw export');
      }
      const raw = (key as unknown as { raw: Uint8Array }).raw;
      return raw.slice().buffer;
    },
    async importKey(
      format: 'raw',
      keyData: BufferSource,
      _algorithm: AesKeyAlgorithm,
      _extractable: boolean,
      _keyUsages: KeyUsage[],
    ): Promise<CryptoKey> {
      if (format !== 'raw') {
        throw new Error('MockCrypto only supports raw import');
      }
      const buffer = bufferSourceToUint8Array(keyData);
      return { raw: new Uint8Array(buffer) } as unknown as CryptoKey;
    },
    async encrypt(algorithm: Algorithm, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
      const rawKey = (key as unknown as { raw: Uint8Array }).raw;
      const plaintext = bufferSourceToUint8Array(data);
      const iv = bufferSourceToUint8Array((algorithm as AesGcmParams).iv);
      const encrypted = xorBytes(plaintext, rawKey, iv);
      return encrypted.slice().buffer;
    },
    async decrypt(algorithm: Algorithm, key: CryptoKey, data: BufferSource): Promise<ArrayBuffer> {
      const rawKey = (key as unknown as { raw: Uint8Array }).raw;
      const ciphertext = bufferSourceToUint8Array(data);
      const iv = bufferSourceToUint8Array((algorithm as AesGcmParams).iv);
      const decrypted = xorBytes(ciphertext, rawKey, iv);
      return decrypted.slice().buffer;
    },
  };

  return {
    getRandomValues<T extends ArrayBufferView | null>(array: T): T {
      if (array === null) {
        throw new Error('array must not be null');
      }
      const bytes = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < bytes.length; i += 1) {
        bytes[i] = (i * 31) & 0xff;
      }
      return array;
    },
    subtle: subtle as unknown as SubtleCrypto,
  } as unknown as Crypto;
}

function bufferSourceToUint8Array(source: BufferSource): Uint8Array {
  if (source instanceof ArrayBuffer) {
    return new Uint8Array(source);
  }

  const view = source as ArrayBufferView;
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

function xorBytes(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i += 1) {
    result[i] = data[i] ^ key[i % key.length] ^ iv[i % iv.length];
  }
  return result;
}
