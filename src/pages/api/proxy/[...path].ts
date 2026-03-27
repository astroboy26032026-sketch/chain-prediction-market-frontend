// src/pages/api/proxy/[...path].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { checkRateLimit, isAllowedProxyPath } from '@/utils/apiSecurity';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb', // base64 image upload can be ~1.33MB for a 1MB file
    },
  },
};

const getBackendBaseUrl = () => {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://dev.zugar.app'
  ).replace(/\/+$/, '');
};

function setCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;

  const allowList = new Set<string>(
    (
      process.env.CORS_ALLOWED_ORIGINS ||
      'http://localhost:3000,https://zugar.app,https://dev.zugar.app'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  if (origin && allowList.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Idempotency-Key');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

function buildUpstreamUrl(req: NextApiRequest, baseUrl: string) {
  const pathParts = (req.query.path as string[]) || [];
  const path = '/' + pathParts.join('/');

  // Security: block path traversal
  if (path.includes('..') || path.includes('//')) {
    return null;
  }

  // Security: validate path against whitelist
  if (!isAllowedProxyPath(path)) {
    return null;
  }

  const url = new URL(baseUrl + path);

  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue;
    if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, String(vv)));
    else if (v != null) url.searchParams.set(k, String(v));
  }

  return url;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'OPTIONS') return res.status(204).end();

  // Security: rate limit proxy
  if (!checkRateLimit(req, res, { max: 120, keyPrefix: 'proxy' })) return;

  try {
    const baseUrl = getBackendBaseUrl();
    const url = buildUpstreamUrl(req, baseUrl);

    // Security: reject invalid paths
    if (!url) {
      return res.status(403).json({ ok: false, error: 'FORBIDDEN', message: 'Path not allowed' });
    }

    const method = (req.method || 'GET').toUpperCase();

    const headers: Record<string, string> = {
      accept: req.headers.accept ? String(req.headers.accept) : 'application/json',
    };

    if (req.headers.authorization) headers.authorization = String(req.headers.authorization);

    // Forward Idempotency-Key if present (required by BE for POST/PUT operations)
    if (req.headers['idempotency-key']) headers['idempotency-key'] = String(req.headers['idempotency-key']);

    // Security: do NOT forward cookies blindly - only forward auth header
    // if (req.headers.cookie) headers.cookie = String(req.headers.cookie);

    if (req.headers['user-agent']) headers['user-agent'] = String(req.headers['user-agent']);

    const ctIn = req.headers['content-type'] ? String(req.headers['content-type']) : '';
    if (ctIn) {
      headers['content-type'] = ctIn;
    } else if (method !== 'GET' && method !== 'HEAD') {
      headers['content-type'] = 'application/json';
    }

    const body =
      method === 'GET' || method === 'HEAD'
        ? undefined
        : headers['content-type']?.includes('application/json')
          ? JSON.stringify(req.body ?? {})
          : (req.body as any);

    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    res.status(upstream.status);
    const ctOut = upstream.headers.get('content-type');
    if (ctOut) res.setHeader('content-type', ctOut);

    const text = await upstream.text();
    if (!text) return res.end();

    if (ctOut?.includes('application/json')) {
      try {
        return res.send(JSON.parse(text));
      } catch {
        return res.send(text);
      }
    }

    return res.send(text);
  } catch (e: any) {
    // Security: don't leak internal error details
    console.error('[proxy] error:', e?.message || e);
    return res.status(502).json({
      ok: false,
      error: 'PROXY_ERROR',
      message: 'Upstream request failed',
    });
  }
}
