import { parse } from 'smol-toml';
import type { AppConfig, ConfigRepository } from '../types/github';

type RawConfig = {
  title?: unknown;
  description?: unknown;
  repositories?: unknown;
};

type RawRepository = {
  repo?: unknown;
  name?: unknown;
  branch?: unknown;
};

const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const REPO_PART = /^[A-Za-z0-9_.-]+$/;

const parseRepositoryPath = (repo: unknown): Pick<ConfigRepository, 'owner' | 'repo'> | null => {
  if (!isString(repo)) {
    return null;
  }

  const parts = repo.trim().split('/').map((part) => part.trim()).filter(Boolean);

  if (parts.length !== 2 || !REPO_PART.test(parts[0]) || !REPO_PART.test(parts[1])) {
    return null;
  }

  return {
    owner: parts[0],
    repo: parts[1],
  };
};

const normalizeRepository = (value: unknown): ConfigRepository | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const repo = value as RawRepository;
  const repositoryPath = parseRepositoryPath(repo.repo);
  if (!repositoryPath) {
    return null;
  }

  return {
    ...repositoryPath,
    name: isString(repo.name) ? repo.name.trim() : undefined,
    branch: isString(repo.branch) ? repo.branch.trim() : undefined,
  };
};

export const loadConfig = async (): Promise<AppConfig> => {
  const response = await fetch('/config.toml', {
    headers: {
      Accept: 'text/plain',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`无法读取 config.toml：${response.status}`);
  }

  const text = await response.text();
  const raw = parse(text) as RawConfig;
  const repositories = Array.isArray(raw.repositories)
    ? raw.repositories.map(normalizeRepository).filter((item): item is ConfigRepository => Boolean(item))
    : [];

  if (repositories.length === 0) {
    throw new Error('config.toml 中没有可用的 repositories 配置');
  }

  return {
    title: isString(raw.title) ? raw.title.trim() : 'Misaka 文件下载站',
    description: isString(raw.description) ? raw.description.trim() : undefined,
    repositories,
  };
};
