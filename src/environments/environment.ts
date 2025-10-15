import { resolveLunchMoneyApiKey } from './resolve-api-key';
import { resolveLunchMoneyApiBase } from './resolve-api-base';

export interface Environment {
  production: boolean;
  lunchmoneyApiKey: string | null;
  lunchmoneyApiBase: string;
}

export const environment: Environment = {
  production: true,
  lunchmoneyApiKey: resolveLunchMoneyApiKey(),
  lunchmoneyApiBase: resolveLunchMoneyApiBase(),
};
