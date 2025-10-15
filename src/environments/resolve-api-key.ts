import { runtimeEnv } from './runtime-env.generated';

type MaybeEnv = Record<string, string | undefined>;

declare const process: {
  env?: {
    NG_APP_LUNCHMONEY_API_KEY?: string;
  };
};

const readFromImportMeta = (): string | undefined => {
  try {
    const meta = import.meta as { env?: MaybeEnv } | undefined;
    return meta?.env?.['NG_APP_LUNCHMONEY_API_KEY'];
  } catch {
    return undefined;
  }
};

const readFromGlobalThis = (): string | undefined => {
  const globalCandidate = globalThis as typeof globalThis & {
    NG_APP_LUNCHMONEY_API_KEY?: string;
    process?: { env?: MaybeEnv };
  };

  return (
    globalCandidate.NG_APP_LUNCHMONEY_API_KEY ??
    globalCandidate.process?.env?.['NG_APP_LUNCHMONEY_API_KEY'] ??
    undefined
  );
};

const readFromProcessEnv = (): string | undefined => {
  try {
    return process.env?.NG_APP_LUNCHMONEY_API_KEY;
  } catch {
    return undefined;
  }
};

const readFromRuntimeModule = (): string | undefined =>
  runtimeEnv['NG_APP_LUNCHMONEY_API_KEY'];

export const resolveLunchMoneyApiKey = (): string | null => {
  return (
    readFromImportMeta() ??
    readFromProcessEnv() ??
    readFromRuntimeModule() ??
    readFromGlobalThis()
  ) ?? null;
};
