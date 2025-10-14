import { resolveLunchMoneyApiKey } from './resolve-api-key';
import { resolveLunchMoneyApiBase } from './resolve-api-base';

export const environment = {
  production: false,
  lunchmoneyApiKey: resolveLunchMoneyApiKey(),
  lunchmoneyApiBase: resolveLunchMoneyApiBase(),
};
