type MaybeEnv = Record<string, string | undefined>;

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

export const resolveLunchMoneyApiKey = (): string | undefined => {
  return readFromImportMeta() ?? readFromGlobalThis();
};
