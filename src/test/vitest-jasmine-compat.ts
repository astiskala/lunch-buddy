/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unnecessary-type-conversion */

/* eslint-disable @typescript-eslint/no-unsafe-function-type */

/* eslint-disable @typescript-eslint/no-unsafe-return */
import { expect, vi } from 'vitest';

type UnknownFn = (...args: unknown[]) => unknown;
type AnySpy = jasmine.Spy;
type AnySpyAnd = jasmine.SpyAnd<jasmine.Func>;
type AnyCalls = jasmine.Calls<jasmine.Func>;
type AnyCallInfo = jasmine.CallInfo<jasmine.Func>;

const toVitestSpy = (spy: unknown): ReturnType<typeof vi.fn> =>
  spy as ReturnType<typeof vi.fn>;

const toCallInfo = (
  spy: ReturnType<typeof vi.fn>,
  index: number
): AnyCallInfo => ({
  object: spy.mock.contexts[index] as never,
  args: (spy.mock.calls[index] ?? []) as never,
  returnValue: spy.mock.results[index]?.value as never,
});

const decorateSpy = (spyFn: UnknownFn, originalImpl?: UnknownFn): AnySpy => {
  const spy = spyFn as AnySpy;
  const vitestSpy = toVitestSpy(spyFn);

  const and = {
    identity: '',
    callFake(fn: UnknownFn) {
      vitestSpy.mockImplementation(fn);
      return spy;
    },
    callThrough() {
      if (originalImpl) {
        vitestSpy.mockImplementation(function (
          this: unknown,
          ...args: unknown[]
        ) {
          return originalImpl.apply(this, args);
        });
      }
      return spy;
    },
    rejectWith(value?: unknown) {
      vitestSpy.mockRejectedValue(value);
      return spy;
    },
    resolveTo(value?: unknown) {
      vitestSpy.mockResolvedValue(value);
      return spy;
    },
    returnValue(value: unknown) {
      vitestSpy.mockReturnValue(value);
      return spy;
    },
    returnValues(...values: unknown[]) {
      let index = 0;
      vitestSpy.mockImplementation(() => {
        const nextIndex = Math.min(index, values.length - 1);
        index += 1;
        return values[nextIndex];
      });
      return spy;
    },
    stub() {
      vitestSpy.mockImplementation(() => undefined);
      return spy;
    },
    throwError(message: string | Error) {
      const error = message instanceof Error ? message : new Error(message);
      vitestSpy.mockImplementation(() => {
        throw error;
      });
      return spy;
    },
  } as AnySpyAnd;

  const calls = {
    all() {
      return vitestSpy.mock.calls.map((_args, index) =>
        toCallInfo(vitestSpy, index)
      );
    },
    allArgs() {
      return vitestSpy.mock.calls as never;
    },
    any() {
      return vitestSpy.mock.calls.length > 0;
    },
    argsFor(index: number) {
      return (vitestSpy.mock.calls[index] ?? []) as never;
    },
    count() {
      return vitestSpy.mock.calls.length;
    },
    first() {
      return toCallInfo(vitestSpy, 0);
    },
    mostRecent() {
      return toCallInfo(vitestSpy, vitestSpy.mock.calls.length - 1);
    },
    reset() {
      vitestSpy.mockClear();
    },
    saveArgumentsByValue() {
      return undefined;
    },
    thisFor(index: number) {
      return vitestSpy.mock.contexts[index] as never;
    },
  } as AnyCalls;

  Object.defineProperty(spy, 'and', {
    configurable: true,
    enumerable: false,
    value: and,
    writable: true,
  });
  Object.defineProperty(spy, 'calls', {
    configurable: true,
    enumerable: false,
    value: calls,
    writable: true,
  });

  return spy;
};

const createSpy = (_name?: string, originalFn?: UnknownFn): AnySpy => {
  const spy = vi.fn();
  if (originalFn) {
    spy.mockImplementation(function (this: unknown, ...args: unknown[]) {
      return originalFn.apply(this, args);
    });
  }
  return decorateSpy(spy as unknown as UnknownFn, originalFn);
};

const createSpyObj = (
  baseName: string,
  methodNames: readonly (string | number | symbol)[] | Record<string, unknown>,
  propertyValues?:
    | readonly (string | number | symbol)[]
    | Record<string, unknown>
): jasmine.SpyObj<unknown> => {
  const spyObj: Record<string, unknown> = {};
  const methodEntries = Array.isArray(methodNames)
    ? methodNames.map(name => [String(name), undefined] as const)
    : Object.entries(methodNames);

  for (const [methodName, returnValue] of methodEntries) {
    const methodSpy = createSpy(`${baseName}.${methodName}`);
    if (returnValue !== undefined) {
      methodSpy.and.returnValue(returnValue);
    }
    spyObj[methodName] = methodSpy;
  }

  if (Array.isArray(propertyValues)) {
    for (const propertyName of propertyValues) {
      spyObj[String(propertyName)] = undefined;
    }
  } else if (propertyValues) {
    for (const [propertyName, propertyValue] of Object.entries(
      propertyValues
    )) {
      spyObj[propertyName] = propertyValue;
    }
  }

  return spyObj as jasmine.SpyObj<unknown>;
};

const jasmineClock: jasmine.Clock = {
  autoTick() {
    return undefined;
  },
  install() {
    vi.useFakeTimers();
    return jasmineClock;
  },
  mockDate(date?: Date) {
    vi.setSystemTime(date ?? new Date());
  },
  tick(milliseconds: number) {
    vi.advanceTimersByTime(milliseconds);
  },
  uninstall() {
    vi.useRealTimers();
  },
  withMock(callback: () => void) {
    this.install();
    try {
      callback();
    } finally {
      this.uninstall();
    }
  },
};

const jasmineSpyOn = (<T, K extends keyof T = keyof T>(
  object: T,
  method: T[K] extends Function ? K : never
) => {
  const original = object[method];
  if (typeof original !== 'function') {
    throw new Error(`Cannot spy on non-function property: ${String(method)}`);
  }
  const spy = vi.spyOn(object as Record<string, UnknownFn>, method as string);
  return decorateSpy(spy as unknown as UnknownFn, original as UnknownFn);
}) as typeof spyOn;

expect.extend({
  toBeTrue(received: unknown) {
    const pass = received === true;
    return {
      pass,
      message: () =>
        `Expected ${String(received)} ${pass ? 'not ' : ''}to be true`,
    };
  },
  toBeFalse(received: unknown) {
    const pass = received === false;
    return {
      pass,
      message: () =>
        `Expected ${String(received)} ${pass ? 'not ' : ''}to be false`,
    };
  },
});

const scope = globalThis as unknown as {
  jasmine?: Partial<typeof jasmine>;
  pending?: (reason?: string) => void;
  spyOn?: typeof spyOn;
};

scope.jasmine = {
  ...(scope.jasmine ?? {}),
  any(expectedClass: unknown) {
    return expect.any(expectedClass as never);
  },
  objectContaining(sample: unknown) {
    return expect.objectContaining(sample as never);
  },
  createSpy: createSpy as typeof jasmine.createSpy,
  createSpyObj: createSpyObj as typeof jasmine.createSpyObj,
  clock: () => jasmineClock,
};
scope.pending = () => undefined;
scope.spyOn = jasmineSpyOn;

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
      return data.has(key) ? data.get(key)! : null;
    },
    key(index: number) {
      const keys = Array.from(data.keys());
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      data.delete(key);
    },
    setItem(key: string, value: string) {
      data.set(key, String(value));
    },
  };
};

const patchStorage = (name: 'localStorage' | 'sessionStorage') => {
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

patchStorage('localStorage');
patchStorage('sessionStorage');
