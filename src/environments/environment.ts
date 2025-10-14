import { resolveLunchMoneyApiKey } from './resolve-api-key';
import { resolveLunchMoneyApiBase } from './resolve-api-base';

export const environment = {
  production: true,
  lunchmoneyApiKey: resolveLunchMoneyApiKey(),
  lunchmoneyApiBase: resolveLunchMoneyApiBase(),
};
