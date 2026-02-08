import { isValidSupportCode, normalizeSupportCode } from './utils';

export function normalizeValidSupportCode(value: string): string | undefined {
  const supportCode = normalizeSupportCode(value);
  if (!isValidSupportCode(supportCode)) {
    return undefined;
  }

  return supportCode;
}
