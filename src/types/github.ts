export type ConfigRepository = {
  owner: string;
  repo: string;
  name?: string;
  branch?: string;
};

export type AppConfig = {
  title: string;
  description?: string;
  repositories: ConfigRepository[];
};

export type LoadSource = 'local' | 'backend';

export type FetchResult<T> = {
  data: T;
  source: LoadSource;
};

export type GitHubLicense = {
  key: string;
  name: string;
  spdx_id: string | null;
  url: string | null;
  html_url?: string;
};

export type GitHubOwner = {
  login: string;
  avatar_url: string;
};

export type GitHubRepository = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  owner: GitHubOwner;
  description: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  default_branch: string;
  license: GitHubLicense | null;
};

export type GitHubLicenseFile = {
  name: string;
  path: string;
  html_url: string;
  download_url: string | null;
  license: GitHubLicense | null;
};

export type GitHubAsset = {
  id: number;
  name: string;
  label: string | null;
  state: string;
  content_type: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  created_at: string;
  updated_at: string;
};

export type GitHubRelease = {
  id: number;
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  assets_url: string;
  published_at: string | null;
  created_at: string;
  assets: GitHubAsset[];
};

export type RepositoryBundle = {
  config: ConfigRepository;
  repository: GitHubRepository;
  licenseFile: GitHubLicenseFile | null;
  readmeMarkdown: string | null;
  releases: GitHubRelease[];
  latestReleaseId: number | null;
  releasePage: number;
  hasNextReleasePage: boolean;
  source: LoadSource;
};

export type RepositoryState = {
  key: string;
  config: ConfigRepository;
  loading: boolean;
  detailLoading: boolean;
  releaseLoading: boolean;
  repository: GitHubRepository | null;
  data: RepositoryBundle | null;
  error: string | null;
  detailError: string | null;
};
