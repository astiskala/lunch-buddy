import { buildBlockedNotificationGuidance } from './notification-guidance.util';

describe('notification guidance util', () => {
  it('returns Edge browser docs for Edge user agents', () => {
    const guidance = buildBlockedNotificationGuidance(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0'
    );

    expect(guidance.message).toContain('Microsoft Edge');
    expect(guidance.links[0]?.label).toContain('Edge');
    expect(guidance.links[1]?.label).toContain('Windows');
  });

  it('returns Firefox docs for Firefox user agents', () => {
    const guidance = buildBlockedNotificationGuidance(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14.6; rv:132.0) Gecko/20100101 Firefox/132.0'
    );

    expect(guidance.message).toContain('Firefox');
    expect(guidance.links[0]?.label).toContain('Firefox');
    expect(guidance.links[1]?.label).toContain('macOS');
  });

  it('returns Safari docs for Safari user agents', () => {
    const guidance = buildBlockedNotificationGuidance(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
    );

    expect(guidance.message).toContain('Safari');
    expect(guidance.links[0]?.label).toContain('Safari');
    expect(guidance.links[1]?.label).toContain('macOS');
  });

  it('returns Chrome docs for generic Chromium user agents', () => {
    const guidance = buildBlockedNotificationGuidance(
      'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36'
    );

    expect(guidance.message).toContain('Your browser');
    expect(guidance.links[0]?.label).toContain('Chrome');
    expect(guidance.links[1]?.label).toContain('Android');
  });
});
