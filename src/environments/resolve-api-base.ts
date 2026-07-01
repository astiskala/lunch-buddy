import { runtimeEnv as runtimeEnvironment } from './runtime-env.generated';

const DEFAULT_API_BASE = 'https://api.lunchmoney.dev/v2';

type MaybeEnvironment = Record<string, string | undefined>;

declare const process: {
  env?: {
    NG_APP_LUNCHMONEY_API_BASE?: string;
  };
};

const readFromImportMeta = (): string | undefined => {
  try {
    const meta = import.meta as { env?: MaybeEnvironment } | undefined;
    return meta?.env?.['NG_APP_LUNCHMONEY_API_BASE'];
  } catch {
    return undefined;
  }
};

const readFromGlobalThis = (): string | undefined => {
  const globalCandidate = globalThis as typeof globalThis & {
    NG_APP_LUNCHMONEY_API_BASE?: string;
    process?: { env?: MaybeEnvironment };
  };

  return (
    globalCandidate.NG_APP_LUNCHMONEY_API_BASE ??
    globalCandidate.process?.env?.['NG_APP_LUNCHMONEY_API_BASE'] ??
    undefined
  );
};

const readFromProcessEnvironment = (): string | undefined => {
  try {
    return process.env?.NG_APP_LUNCHMONEY_API_BASE;
  } catch {
    return undefined;
  }
};

const readFromRuntimeModule = (): string | undefined =>
  runtimeEnvironment['NG_APP_LUNCHMONEY_API_BASE'];

export const resolveLunchMoneyApiBase = (): string => {
  return (
    readFromImportMeta() ??
    readFromProcessEnvironment() ??
    readFromRuntimeModule() ??
    readFromGlobalThis() ??
    DEFAULT_API_BASE
  );
};
