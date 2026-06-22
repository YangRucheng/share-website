import { DOWNLOAD_PROXY_OPTIONS, type DownloadProxyId } from './localPreferences';

const GITHUB_DOWNLOAD_HOSTS = new Set([
  'github.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);
const GITHUB_RELEASE_DOWNLOAD_PATH = /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/releases\/download\/[^/]+\/.+$/;

const isGitHubReleaseDownloadUrl = (url: URL) => (
  url.protocol === 'https:'
  && url.hostname.toLowerCase() === 'github.com'
  && GITHUB_RELEASE_DOWNLOAD_PATH.test(url.pathname)
);

export const getDownloadProxyOptions = () => (
  DOWNLOAD_PROXY_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  }))
);

export const proxifyDownloadUrl = (url: string, proxyId: DownloadProxyId) => {
  const option = DOWNLOAD_PROXY_OPTIONS.find((item) => item.value === proxyId);
  if (!option?.baseUrl) {
    return url;
  }

  try {
    const parsed = new URL(url);
    if (option.value === 'edge' && !isGitHubReleaseDownloadUrl(parsed)) {
      return url;
    }

    if (!GITHUB_DOWNLOAD_HOSTS.has(parsed.hostname)) {
      return url;
    }
  } catch {
    return url;
  }

  return `${option.baseUrl}${option.encodeUrl ? encodeURIComponent(url) : url}`;
};
