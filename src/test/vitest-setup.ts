const createMemoryStorage = (): Storage => {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear() {
      data.clear();
    },
    getItem(key: string) {
      return data.get(key) ?? null;
    },
    key(index: number) {
      const keys = Array.from(data.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
  };
};

const ensureStorage = (name: 'localStorage' | 'sessionStorage') => {
  const candidate = (globalThis as Record<string, unknown>)[name];
  const hasStorageApi =
    typeof candidate === 'object' &&
    candidate !== null &&
    typeof (candidate as Storage).getItem === 'function' &&
    typeof (candidate as Storage).setItem === 'function' &&
    typeof (candidate as Storage).removeItem === 'function' &&
    typeof (candidate as Storage).clear === 'function';

  if (!hasStorageApi) {
    Object.defineProperty(globalThis, name, {
      value: createMemoryStorage(),
      configurable: true,
      writable: true,
    });
  }
};

ensureStorage('localStorage');
ensureStorage('sessionStorage');
