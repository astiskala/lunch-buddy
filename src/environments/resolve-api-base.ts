import { runtimeEnv } from './runtime-env.generated';

const DEFAULT_API_BASE = 'https://dev.lunchmoney.app/v1';

type MaybeEnv = Record<string, string | undefined>;

declare const process: {
  env?: {
    NG_APP_LUNCHMONEY_API_BASE?: string;
  };
};

const readFromImportMeta = (): string | undefined => {
  try {
    const meta = import.meta as { env?: MaybeEnv } | undefined;
    return meta?.env?.['NG_APP_LUNCHMONEY_API_BASE'];
  } catch {
    return undefined;
  }
};

const readFromGlobalThis = (): string | undefined => {
  const globalCandidate = globalThis as typeof globalThis & {
    NG_APP_LUNCHMONEY_API_BASE?: string;
    process?: { env?: MaybeEnv };
  };

  return (
    globalCandidate.NG_APP_LUNCHMONEY_API_BASE ??
    globalCandidate.process?.env?.['NG_APP_LUNCHMONEY_API_BASE'] ??
    undefined
  );
};

const readFromProcessEnv = (): string | undefined => {
  try {
    return process.env?.NG_APP_LUNCHMONEY_API_BASE;
  } catch {
    return undefined;
  }
};

const readFromRuntimeModule = (): string | undefined =>
  runtimeEnv['NG_APP_LUNCHMONEY_API_BASE'];

export const resolveLunchMoneyApiBase = (): string => {
  return (
    readFromImportMeta() ??
    readFromProcessEnv() ??
    readFromRuntimeModule() ??
    readFromGlobalThis() ??
    DEFAULT_API_BASE
  );
};
