export interface NotificationHelpLink {
  label: string;
  url: string;
}

export interface NotificationGuidance {
  message: string;
  links: NotificationHelpLink[];
}

interface BrowserAndOsProfile {
  browserLabel: string;
  browserLink: NotificationHelpLink;
  osLabel: string | null;
  osLink: NotificationHelpLink | null;
}

const CHROME_DOC: NotificationHelpLink = {
  label: 'Chrome: Allow site notifications',
  url: 'https://support.google.com/chrome/answer/3220216',
};

const EDGE_DOC: NotificationHelpLink = {
  label: 'Edge: Manage website notifications',
  url: 'https://support.microsoft.com/en-us/microsoft-edge/manage-website-notifications-in-microsoft-edge-0c555609-5bf2-479d-a59d-fb30a0b80b2b',
};

const FIREFOX_DOC: NotificationHelpLink = {
  label: 'Firefox: Push notification settings',
  url: 'https://support.mozilla.org/en-US/kb/push-notifications-firefox',
};

const SAFARI_DOC: NotificationHelpLink = {
  label: 'Safari: Website notification settings',
  url: 'https://support.apple.com/guide/safari/customize-website-notifications-sfri40734/mac',
};

const WINDOWS_DOC: NotificationHelpLink = {
  label: 'Windows: Notification settings',
  url: 'https://support.microsoft.com/windows/change-notification-settings-in-windows-8942c744-6198-fe56-4639-34320cf9444e',
};

const MAC_DOC: NotificationHelpLink = {
  label: 'macOS: Notification settings',
  url: 'https://support.apple.com/guide/mac-help/change-notifications-settings-mh40583/mac',
};

const ANDROID_DOC: NotificationHelpLink = {
  label: 'Android: App notification settings',
  url: 'https://support.google.com/android/answer/9079661',
};

const IOS_DOC: NotificationHelpLink = {
  label: 'iOS: Notification settings',
  url: 'https://support.apple.com/guide/iphone/change-notification-settings-iph7c3d96bab/ios',
};

export const buildBlockedNotificationGuidance = (
  userAgent: string
): NotificationGuidance => {
  const profile = detectProfile(userAgent);
  const links: NotificationHelpLink[] = [profile.browserLink];
  if (profile.osLink) {
    links.push(profile.osLink);
  }

  const osHint = profile.osLabel
    ? `, and verify ${profile.osLabel} notifications are enabled`
    : '';

  return {
    message: `${profile.browserLabel} blocked this notification request. If you are in a private/incognito window, switch to a regular window first. Re-enable notifications for Lunch Buddy in ${profile.browserLabel}${osHint}.`,
    links,
  };
};

const detectProfile = (userAgent: string): BrowserAndOsProfile => {
  const normalized = userAgent.toLowerCase();
  const includesAny = (...needles: string[]): boolean =>
    needles.some(needle => normalized.includes(needle));

  const isIos = /(iphone|ipad|ipod)/.test(normalized);
  const isAndroid = normalized.includes('android');
  const isWindows = normalized.includes('windows nt');
  const isMac = !isIos && /mac os x|macintosh/.test(normalized);

  const isFirefox = /firefox\/|fxios\//.test(normalized);
  const isEdge = /edg\/|edga\/|edgios\//.test(normalized);
  const isOpera = /opr\/|opera/.test(normalized);
  const isSafari =
    normalized.includes('safari/') &&
    !includesAny(
      'chrome/',
      'crios/',
      'edg/',
      'edga/',
      'edgios/',
      'opr/',
      'firefox/',
      'fxios/'
    );

  const osInfo = getOsInfo({ isIos, isAndroid, isWindows, isMac });

  if (isEdge) {
    return {
      browserLabel: 'Microsoft Edge',
      browserLink: EDGE_DOC,
      ...osInfo,
    };
  }

  if (isFirefox) {
    return {
      browserLabel: 'Firefox',
      browserLink: FIREFOX_DOC,
      ...osInfo,
    };
  }

  if (isSafari) {
    return {
      browserLabel: 'Safari',
      browserLink: SAFARI_DOC,
      ...osInfo,
    };
  }

  if (isOpera) {
    return {
      browserLabel: 'Opera',
      browserLink: CHROME_DOC,
      ...osInfo,
    };
  }

  return {
    browserLabel: 'Your browser',
    browserLink: CHROME_DOC,
    ...osInfo,
  };
};

const getOsInfo = (flags: {
  isIos: boolean;
  isAndroid: boolean;
  isWindows: boolean;
  isMac: boolean;
}): Pick<BrowserAndOsProfile, 'osLabel' | 'osLink'> => {
  if (flags.isIos) {
    return {
      osLabel: 'iOS',
      osLink: IOS_DOC,
    };
  }

  if (flags.isAndroid) {
    return {
      osLabel: 'Android',
      osLink: ANDROID_DOC,
    };
  }

  if (flags.isWindows) {
    return {
      osLabel: 'Windows',
      osLink: WINDOWS_DOC,
    };
  }

  if (flags.isMac) {
    return {
      osLabel: 'macOS',
      osLink: MAC_DOC,
    };
  }

  return {
    osLabel: null,
    osLink: null,
  };
};
