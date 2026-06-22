const ALLOWED_RELEASE_PATH = /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/releases\/download\/[^/]+\/.+$/;
const EXPOSED_HEADERS = [
  'Accept-Ranges',
  'Content-Disposition',
  'Content-Length',
  'Content-Range',
  'Content-Type',
  'ETag',
  'Last-Modified',
];

const corsHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Range',
  'Access-Control-Expose-Headers': EXPOSED_HEADERS.join(', '),
});

const json = (data, init = {}) => (
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {}),
    },
  })
);

const parseReleaseDownloadUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com') {
      return null;
    }

    if (!ALLOWED_RELEASE_PATH.test(url.pathname)) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
};

const makeUpstreamHeaders = (request) => {
  const headers = new Headers({
    Accept: request.headers.get('Accept') || 'application/octet-stream',
    'User-Agent': 'edgeone-pages-github-release-download-proxy',
  });

  const range = request.headers.get('Range');
  if (range) {
    headers.set('Range', range);
  }

  return headers;
};

const sanitizeFilename = (value) => {
  let filename = value;

  try {
    filename = decodeURIComponent(value);
  } catch {
    filename = value;
  }

  return filename.replace(/[\r\n"\\]/g, '_');
};

const fallbackContentDisposition = (downloadUrl) => {
  const rawFilename = downloadUrl.pathname.split('/').pop();
  if (!rawFilename) {
    return '';
  }

  const filename = sanitizeFilename(rawFilename);
  const asciiFilename = filename.replace(/[^\x20-\x7E]/g, '_');
  return `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
};

const makeResponseHeaders = (upstream, downloadUrl) => {
  const headers = new Headers(corsHeaders());

  EXPOSED_HEADERS.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) {
      headers.set(name, value);
    }
  });

  if (!headers.has('Content-Disposition')) {
    const disposition = fallbackContentDisposition(downloadUrl);
    if (disposition) {
      headers.set('Content-Disposition', disposition);
    }
  }

  headers.set('Cache-Control', upstream.ok ? 'public, max-age=300' : 'no-store');
  return headers;
};

export const onRequestOptions = () => (
  new Response(null, {
    status: 204,
    headers: corsHeaders(),
  })
);

export const onRequest = async ({ request }) => {
  if (request.method === 'OPTIONS') {
    return onRequestOptions();
  }

  if (!['GET', 'HEAD'].includes(request.method)) {
    return json(
      { message: 'Method not allowed' },
      { status: 405, headers: { ...corsHeaders(), Allow: 'GET, HEAD, OPTIONS' } },
    );
  }

  const requestUrl = new URL(request.url);
  const downloadUrl = parseReleaseDownloadUrl(requestUrl.searchParams.get('url'));

  if (!downloadUrl) {
    return json(
      {
        message: 'Unsupported release download URL',
        allowed: 'https://github.com/{owner}/{repo}/releases/download/{tag}/{asset}',
      },
      { status: 400, headers: corsHeaders() },
    );
  }

  const upstream = await fetch(downloadUrl.toString(), {
    method: request.method,
    headers: makeUpstreamHeaders(request),
    redirect: 'follow',
  });

  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: makeResponseHeaders(upstream, downloadUrl),
  });
};
