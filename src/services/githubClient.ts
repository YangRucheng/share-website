import type {
  ConfigRepository,
  FetchResult,
  GitHubLicenseFile,
  GitHubRelease,
  GitHubRepository,
  LoadSource,
  RepositoryBundle,
} from '../types/github';
import {
  getGitHubToken,
  makeCacheKey,
  readLocalCache,
  writeLocalCache,
} from './localPreferences';

const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const RELEASE_PAGE_SIZE = 10;

type RequestOptions = {
  accept?: 'json' | 'raw';
  search?: Record<string, string | number | undefined>;
};

const makeRepoKey = (repo: ConfigRepository) => `${repo.owner}/${repo.repo}`;

const buildGitHubUrl = (path: string, search: RequestOptions['search'] = {}) => {
  const url = new URL(path, GITHUB_API);
  Object.entries(search).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const buildBackendUrl = (path: string, search: RequestOptions['search'] = {}, accept: RequestOptions['accept'] = 'json') => {
  const url = new URL('/api/github', window.location.origin);
  url.searchParams.set('path', path);
  url.searchParams.set('accept', accept);
  Object.entries(search).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value));
    }
  });
  return url;
};

const serializeSearch = (search: RequestOptions['search'] = {}) => {
  return Object.entries(search)
    .filter(([, value]) => value !== undefined)
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
};

const buildCacheKey = (kind: 'json' | 'json-page' | 'text', path: string, options: RequestOptions = {}) => {
  return makeCacheKey([
    kind,
    options.accept || 'json',
    path,
    serializeSearch(options.search),
  ].join('|'));
};

const buildDirectHeaders = (accept: RequestOptions['accept'] = 'json') => {
  const headers = new Headers({
    Accept: accept === 'raw' ? 'application/vnd.github.raw+json' : 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
  });
  const token = getGitHubToken();

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
};

const parseError = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return `${response.status} ${response.statusText}`;
  }

  try {
    const payload = JSON.parse(text) as { message?: string };
    return payload.message ? `${response.status} ${payload.message}` : `${response.status} ${text}`;
  } catch {
    return `${response.status} ${text}`;
  }
};

const requestDirect = async (path: string, options: RequestOptions = {}) => {
  const url = buildGitHubUrl(path, options.search);
  const response = await fetch(url, {
    headers: buildDirectHeaders(options.accept),
  });

  if (!response.ok) {
    throw new Error(await parseError(response));
  }

  return response;
};

const requestBackend = async (path: string, options: RequestOptions = {}) => {
  const response = await fetch(buildBackendUrl(path, options.search, options.accept));
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  return response;
};

const requestWithFallback = async (path: string, options: RequestOptions = {}): Promise<FetchResult<Response>> => {
  try {
    return {
      data: await requestDirect(path, options),
      source: 'local',
    };
  } catch (localError) {
    try {
      return {
        data: await requestBackend(path, options),
        source: 'backend',
      };
    } catch (backendError) {
      throw new Error(`本地调用失败：${localError instanceof Error ? localError.message : String(localError)}；后端调用失败：${backendError instanceof Error ? backendError.message : String(backendError)}`);
    }
  }
};

const requestJson = async <T>(path: string, options: RequestOptions = {}): Promise<FetchResult<T>> => {
  const cacheKey = buildCacheKey('json', path, options);
  const cached = readLocalCache<T, LoadSource>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await requestWithFallback(path, options);
  const data = await result.data.json() as T;
  writeLocalCache(cacheKey, data, result.source);

  return {
    data,
    source: result.source,
  };
};

const requestJsonPage = async <T>(path: string, options: RequestOptions = {}): Promise<FetchResult<T[]> & { hasNextPage: boolean }> => {
  const cacheKey = buildCacheKey('json-page', path, options);
  const cached = readLocalCache<{ items: T[]; hasNextPage: boolean }, LoadSource>(cacheKey);
  if (cached) {
    return {
      data: cached.data.items,
      source: cached.source,
      hasNextPage: cached.data.hasNextPage,
    };
  }

  const result = await requestWithFallback(path, options);
  const data = await result.data.json() as T[];
  const hasNextPage = /\brel="next"/.test(result.data.headers.get('Link') || '');

  writeLocalCache(cacheKey, { items: data, hasNextPage }, result.source);

  return {
    data,
    source: result.source,
    hasNextPage,
  };
};

const requestText = async (path: string, options: RequestOptions = {}): Promise<FetchResult<string>> => {
  const rawOptions = { ...options, accept: 'raw' as const };
  const cacheKey = buildCacheKey('text', path, rawOptions);
  const cached = readLocalCache<string, LoadSource>(cacheKey);
  if (cached) {
    return cached;
  }

  const result = await requestWithFallback(path, rawOptions);
  const data = await result.data.text();
  writeLocalCache(cacheKey, data, result.source);

  return {
    data,
    source: result.source,
  };
};

const mergeSource = (sources: LoadSource[]): LoadSource => sources.includes('backend') ? 'backend' : 'local';

const loadLicense = async (repo: ConfigRepository) => {
  try {
    return await requestJson<GitHubLicenseFile>(`/repos/${repo.owner}/${repo.repo}/license`);
  } catch {
    return {
      data: null,
      source: 'local' as LoadSource,
    };
  }
};

const loadReadme = async (repo: ConfigRepository) => {
  try {
    return await requestText(`/repos/${repo.owner}/${repo.repo}/readme`, {
      search: {
        ref: repo.branch,
      },
    });
  } catch {
    return {
      data: null,
      source: 'local' as LoadSource,
    };
  }
};

const loadLatestRelease = async (repo: ConfigRepository) => {
  try {
    return await requestJson<GitHubRelease>(`/repos/${repo.owner}/${repo.repo}/releases/latest`);
  } catch {
    return {
      data: null,
      source: 'local' as LoadSource,
    };
  }
};

export const loadReleasePage = async (repo: ConfigRepository, page: number) => {
  const result = await requestJsonPage<GitHubRelease>(`/repos/${repo.owner}/${repo.repo}/releases`, {
    search: {
      per_page: RELEASE_PAGE_SIZE,
      page,
    },
  });

  return {
    data: result.data.map(normalizeRelease),
    source: result.source,
    page,
    hasNextPage: result.hasNextPage,
  };
};

const normalizeRelease = (release: GitHubRelease) => ({
  ...release,
  assets: Array.isArray(release.assets) ? release.assets : [],
});

export const loadRepositorySummary = async (config: ConfigRepository) => {
  return requestJson<GitHubRepository>(`/repos/${config.owner}/${config.repo}`);
};

export const loadRepositoryBundle = async (config: ConfigRepository, page = 1): Promise<RepositoryBundle> => {
  const [repositoryResult, licenseResult, readmeResult, latestReleaseResult, releasesResult] = await Promise.all([
    loadRepositorySummary(config),
    loadLicense(config),
    loadReadme(config),
    loadLatestRelease(config),
    loadReleasePage(config, page),
  ]);

  return {
    config,
    repository: repositoryResult.data,
    licenseFile: licenseResult.data,
    readmeMarkdown: readmeResult.data,
    releases: releasesResult.data,
    latestReleaseId: latestReleaseResult.data?.id ?? null,
    releasePage: releasesResult.page,
    hasNextReleasePage: releasesResult.hasNextPage,
    source: mergeSource([
      repositoryResult.source,
      licenseResult.source,
      readmeResult.source,
      latestReleaseResult.source,
      releasesResult.source,
    ]),
  };
};

export const getRepositoryKey = makeRepoKey;
