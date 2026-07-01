import { vi, type Mock } from 'vitest';

type MethodKeys<T extends object> = {
  [K in keyof T]-?: T[K] extends (...arguments_: infer _Arguments) => unknown
    ? K
    : never;
}[keyof T];

type PropertyKeys<T extends object> = Exclude<keyof T, MethodKeys<T>>;

export type SpyObj<T extends object> = T & {
  [K in MethodKeys<T>]: T[K] extends (...arguments_: infer A) => infer R
    ? Mock<(...arguments_: A) => R>
    : never;
};

export const createSpyObj = <T extends object>(
  _baseName: string,
  methodNames: readonly MethodKeys<T>[],
  properties?: Partial<Pick<T, PropertyKeys<T>>>
): SpyObj<T> => {
  const spyObject: Record<string, unknown> = {};

  for (const methodName of methodNames) {
    spyObject[String(methodName)] = vi.fn();
  }

  if (properties) {
    Object.assign(spyObject, properties);
  }

  return spyObject as SpyObj<T>;
};
