export type PlatformId = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'unknown';

// userAgentData is Chromium-only and not reliably in lib.dom — use a local structural type.
type NavigatorWithUAData = Navigator & {
  userAgentData?: { platform: string };
};

const isLikelyIPadOS = () => {
  const ua = navigator.userAgent;
  return navigator.maxTouchPoints > 1 && /macintosh|mac os/i.test(ua);
};

const matchMobileTokens = (text: string): PlatformId | null => {
  if (text.includes('android')) {
    return 'android';
  }
  if (text.includes('iphone') || text.includes('ipod') || text.includes('ipad')) {
    return 'ios';
  }
  return null;
};

const matchDesktopTokens = (text: string): PlatformId | null => {
  if (text.includes('win')) {
    return 'windows';
  }
  if (text.includes('mac')) {
    return isLikelyIPadOS() ? 'ios' : 'macos';
  }
  if (text.includes('linux')) {
    return 'linux';
  }
  return null;
};

export const detectPlatform = (): PlatformId => {
  const uaData = (navigator as NavigatorWithUAData).userAgentData;
  if (uaData?.platform) {
    const platform = uaData.platform.toLowerCase();
    const mobile = matchMobileTokens(platform);
    if (mobile) {
      return mobile;
    }
    const desktop = matchDesktopTokens(platform);
    if (desktop) {
      return desktop;
    }
  }

  const ua = navigator.userAgent.toLowerCase();
  const uaMobile = matchMobileTokens(ua);
  if (uaMobile) {
    return uaMobile;
  }
  const uaDesktop = matchDesktopTokens(ua);
  if (uaDesktop) {
    return uaDesktop;
  }

  const platform = navigator.platform?.toLowerCase() || '';
  const navMobile = matchMobileTokens(platform);
  if (navMobile) {
    return navMobile;
  }
  const navDesktop = matchDesktopTokens(platform);
  if (navDesktop) {
    return navDesktop;
  }

  return 'unknown';
};

export const PLATFORM_PREFERENCE_OPTIONS = [
  { label: '自动检测', value: 'auto' },
  { label: 'Windows', value: 'windows' },
  { label: 'macOS', value: 'macos' },
  { label: 'Linux', value: 'linux' },
  { label: 'Android', value: 'android' },
  { label: 'iOS', value: 'ios' },
] as const;

export const getPlatformOptions = () => (
  PLATFORM_PREFERENCE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  }))
);
