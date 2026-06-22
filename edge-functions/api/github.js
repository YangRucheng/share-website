const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';
const JSON_ACCEPT = 'application/vnd.github+json';
const RAW_ACCEPT = 'application/vnd.github.raw+json';

const ALLOWED_PATH = /^\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/(?:releases(?:\/latest)?|license|readme))?$/;

const json = (data, init = {}) => {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  });
};

const corsHeaders = () => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Expose-Headers': 'Link',
  };
};

const normalizePath = (path) => {
  if (!path || typeof path !== 'string') return '';

  const trimmed = path.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getGitHubToken = (env = {}) => {
  const token = env.GITHUB_TOKEN;
  return typeof token === 'string' ? token.trim() : '';
};

const sanitizeLinkHeader = (linkHeader, { acceptMode, githubPath, requestUrl }) => {
  if (!linkHeader) return '';

  const links = [];

  linkHeader.split(',').forEach((part) => {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/);
    if (!match) return;

    const [, upstreamLink, rel] = match;
    if (!['first', 'last', 'next', 'prev'].includes(rel)) return;

    const upstreamLinkUrl = new URL(upstreamLink);
    if (upstreamLinkUrl.origin !== GITHUB_API || normalizePath(upstreamLinkUrl.pathname) !== githubPath) return;

    const proxiedLinkUrl = new URL('/api/github', requestUrl.origin);
    proxiedLinkUrl.searchParams.set('path', githubPath);
    proxiedLinkUrl.searchParams.set('accept', acceptMode);
    upstreamLinkUrl.searchParams.forEach((value, key) => {
      proxiedLinkUrl.searchParams.set(key, value);
    });

    links.push(`<${proxiedLinkUrl.pathname}${proxiedLinkUrl.search}>; rel="${rel}"`);
  });

  return links.join(', ');
};

export const onRequestOptions = () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
};

export const onRequestGet = async ({ request, env = {} }) => {
  const requestUrl = new URL(request.url);
  const githubPath = normalizePath(requestUrl.searchParams.get('path'));
  const acceptMode = requestUrl.searchParams.get('accept') === 'raw' ? 'raw' : 'json';

  if (!ALLOWED_PATH.test(githubPath))
    return json(
      {
        message: 'Unsupported GitHub API path',
        allowed: [
          '/repos/{owner}/{repo}',
          '/repos/{owner}/{repo}/license',
          '/repos/{owner}/{repo}/readme',
          '/repos/{owner}/{repo}/releases',
          '/repos/{owner}/{repo}/releases/latest',
        ],
      },
      { status: 400, headers: corsHeaders() },
    );

  const upstreamUrl = new URL(githubPath, GITHUB_API);
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== 'path' && key !== 'accept') upstreamUrl.searchParams.append(key, value);
  });

  const headers = new Headers({
    Accept: acceptMode === 'raw' ? RAW_ACCEPT : JSON_ACCEPT,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'edgeone-pages-github-release-viewer',
  });

  const token = getGitHubToken(env);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const upstream = await fetch(upstreamUrl.toString(), { headers });
  const responseHeaders = new Headers(corsHeaders());
  responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') || (acceptMode === 'raw' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8'));
  responseHeaders.set('Cache-Control', upstream.ok ? 'public, max-age=60' : 'no-store');

  const linkHeader = sanitizeLinkHeader(upstream.headers.get('Link'), { acceptMode, githubPath, requestUrl });
  if (linkHeader) responseHeaders.set('Link', linkHeader);

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
};
