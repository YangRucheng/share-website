const TOKEN_KEY = 'misaka-downloads.github-token';
const PREFERENCES_KEY = 'misaka-downloads.preferences';
const CACHE_PREFIX = 'misaka-downloads.github-cache:';
const CACHE_MAX_AGE = 30 * 60 * 1000;

export const DOWNLOAD_PROXY_OPTIONS = [
  {
    label: 'Edge Functions 代理',
    value: 'edge',
    baseUrl: '/api/release-download?url=',
    encodeUrl: true,
  },
  {
    label: 'ghfast.top',
    value: 'ghfast',
    baseUrl: 'https://ghfast.top/',
    encodeUrl: false,
  },
  {
    label: 'gh-proxy.com',
    value: 'ghProxy',
    baseUrl: 'https://gh-proxy.com/',
    encodeUrl: false,
  },
  {
    label: '直连 GitHub',
    value: 'direct',
    baseUrl: '',
    encodeUrl: false,
  },
] as const;

export type DownloadProxyId = typeof DOWNLOAD_PROXY_OPTIONS[number]['value'];

export type DownloadPreferences = {
  ignoreEmptyReleases: boolean;
  ignoreTextMarkdownAssets: boolean;
  downloadProxy: DownloadProxyId;
};

export const DEFAULT_DOWNLOAD_PREFERENCES: DownloadPreferences = {
  ignoreEmptyReleases: true,
  ignoreTextMarkdownAssets: true,
  downloadProxy: 'edge',
};

type CacheEntry<T, TSource extends string> = {
  savedAt: number;
  data: T;
  source: TSource;
};

const getStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const normalizeToken = (token: string) => token.trim();

const normalizeDownloadProxy = (value: unknown): DownloadProxyId => (
  DOWNLOAD_PROXY_OPTIONS.some((option) => option.value === value)
    ? value as DownloadProxyId
    : DEFAULT_DOWNLOAD_PREFERENCES.downloadProxy
);

export const normalizeDownloadPreferences = (preferences: Partial<DownloadPreferences>): DownloadPreferences => ({
  ignoreEmptyReleases: preferences.ignoreEmptyReleases ?? DEFAULT_DOWNLOAD_PREFERENCES.ignoreEmptyReleases,
  ignoreTextMarkdownAssets: preferences.ignoreTextMarkdownAssets ?? DEFAULT_DOWNLOAD_PREFERENCES.ignoreTextMarkdownAssets,
  downloadProxy: normalizeDownloadProxy(preferences.downloadProxy),
});

export const getGitHubToken = () => normalizeToken(getStorage()?.getItem(TOKEN_KEY) || '');

export const setGitHubToken = (token: string) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  const normalized = normalizeToken(token);
  if (normalized) {
    storage.setItem(TOKEN_KEY, normalized);
  } else {
    storage.removeItem(TOKEN_KEY);
  }
};

export const clearGitHubToken = () => {
  getStorage()?.removeItem(TOKEN_KEY);
};

export const getDownloadPreferences = (): DownloadPreferences => {
  const storage = getStorage();
  if (!storage) {
    return DEFAULT_DOWNLOAD_PREFERENCES;
  }

  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (!raw) {
      return DEFAULT_DOWNLOAD_PREFERENCES;
    }

    const value = JSON.parse(raw) as Partial<DownloadPreferences>;
    return normalizeDownloadPreferences(value);
  } catch {
    storage.removeItem(PREFERENCES_KEY);
    return DEFAULT_DOWNLOAD_PREFERENCES;
  }
};

export const setDownloadPreferences = (preferences: DownloadPreferences) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(PREFERENCES_KEY, JSON.stringify(normalizeDownloadPreferences(preferences)));
};

export const makeCacheKey = (value: string) => `${CACHE_PREFIX}${value}`;

export const readLocalCache = <T, TSource extends string>(
  key: string,
  maxAge = CACHE_MAX_AGE,
): { data: T; source: TSource } | null => {
  const storage = getStorage();
  if (!storage) {
    return null;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) {
      return null;
    }

    const entry = JSON.parse(raw) as CacheEntry<T, TSource>;
    if (!entry.savedAt || Date.now() - entry.savedAt > maxAge) {
      storage.removeItem(key);
      return null;
    }

    return {
      data: entry.data,
      source: entry.source,
    };
  } catch {
    storage.removeItem(key);
    return null;
  }
};

export const writeLocalCache = <T, TSource extends string>(key: string, data: T, source: TSource) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    const entry: CacheEntry<T, TSource> = {
      savedAt: Date.now(),
      data,
      source,
    };
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cache writes are best-effort; download data should still render.
  }
};

export const clearGitHubCache = () => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  for (let index = storage.length - 1; index >= 0; index -= 1) {
    const key = storage.key(index);
    if (key?.startsWith(CACHE_PREFIX)) {
      storage.removeItem(key);
    }
  }
};
