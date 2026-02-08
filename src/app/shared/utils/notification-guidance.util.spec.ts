import { buildBlockedNotificationGuidance } from './notification-guidance.util';

describe('notification guidance util', () => {
  it.each([
    {
      name: 'Edge',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
      messageContains: 'Microsoft Edge',
      primaryLinkContains: 'Edge',
      secondaryLinkContains: 'Windows',
    },
    {
      name: 'Firefox',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0',
      messageContains: 'Firefox',
      primaryLinkContains: 'Firefox',
      secondaryLinkContains: 'macOS',
    },
    {
      name: 'Safari',
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
      messageContains: 'Safari',
      primaryLinkContains: 'Safari',
      secondaryLinkContains: 'macOS',
    },
    {
      name: 'Chromium',
      userAgent:
        'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
      messageContains: 'Your browser',
      primaryLinkContains: 'Chrome',
      secondaryLinkContains: 'Android',
    },
  ])(
    'returns $name browser-specific docs',
    ({
      userAgent,
      messageContains,
      primaryLinkContains,
      secondaryLinkContains,
    }) => {
      const guidance = buildBlockedNotificationGuidance(userAgent);

      expect(guidance.message).toContain(messageContains);
      expect(guidance.links[0]?.label).toContain(primaryLinkContains);
      expect(guidance.links[1]?.label).toContain(secondaryLinkContains);
    }
  );
});
