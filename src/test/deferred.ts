export const createDeferred = <T>() => {
  let resolveFn: (value: T | PromiseLike<T>) => void = () => {
    throw new Error('Deferred resolver not initialized');
  };
  const promise = new Promise<T>(res => {
    resolveFn = res;
  });
  return {
    promise,
    resolve(value: T | PromiseLike<T>) {
      resolveFn(value);
    },
  };
};
