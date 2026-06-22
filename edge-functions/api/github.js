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
  };
};

const normalizePath = (path) => {
  if (!path || typeof path !== 'string') {
    return '';
  }

  const trimmed = path.trim();
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

export const onRequestOptions = () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
};

export const onRequestGet = async (context) => {
  const requestUrl = new URL(context.request.url);
  const githubPath = normalizePath(requestUrl.searchParams.get('path'));
  const acceptMode = requestUrl.searchParams.get('accept') === 'raw' ? 'raw' : 'json';

  if (!ALLOWED_PATH.test(githubPath)) {
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
  }

  const upstreamUrl = new URL(githubPath, GITHUB_API);
  requestUrl.searchParams.forEach((value, key) => {
    if (key !== 'path' && key !== 'accept') {
      upstreamUrl.searchParams.append(key, value);
    }
  });

  const headers = new Headers({
    Accept: acceptMode === 'raw' ? RAW_ACCEPT : JSON_ACCEPT,
    'X-GitHub-Api-Version': API_VERSION,
    'User-Agent': 'edgeone-pages-github-release-viewer',
  });

  const token = context.env && context.env.GITHUB_TOKEN;
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const upstream = await fetch(upstreamUrl.toString(), { headers });
  const responseHeaders = new Headers(corsHeaders());
  responseHeaders.set('Content-Type', upstream.headers.get('Content-Type') || (acceptMode === 'raw' ? 'text/plain; charset=utf-8' : 'application/json; charset=utf-8'));
  responseHeaders.set('Cache-Control', upstream.ok ? 'public, max-age=60' : 'no-store');

  for (const header of ['ETag', 'Last-Modified', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']) {
    const value = upstream.headers.get(header);
    if (value) {
      responseHeaders.set(header, value);
    }
  }

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: responseHeaders,
  });
};
