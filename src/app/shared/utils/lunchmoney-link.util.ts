const LUNCH_MONEY_HOST = 'https://my.lunchmoney.app';

export interface BuildTransactionDeepLinkInput {
  transactionId: number;
}

// On mobile with the Lunch Money app installed, the OS routes this URL into
// the native app via Universal/App Links; otherwise it opens in the browser.
export const buildTransactionDeepLink = (
  input: BuildTransactionDeepLinkInput
): string => {
  const parameters = new URLSearchParams();
  parameters.set('transaction_id', input.transactionId.toString());

  return `${LUNCH_MONEY_HOST}/transactions?${parameters.toString()}`;
};
