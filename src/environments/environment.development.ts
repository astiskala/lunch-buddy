import { resolveLunchMoneyApiKey } from './resolve-api-key';

export const environment = {
  production: false,
  lunchmoneyApiKey: resolveLunchMoneyApiKey(),
};
