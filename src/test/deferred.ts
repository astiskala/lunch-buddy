export const createDeferred = <T>() => {
  const { promise, resolve: resolveFunction } = Promise.withResolvers<T>();
  return {
    promise,
    resolve(value: T | PromiseLike<T>) {
      resolveFunction(value);
    },
  };
};
