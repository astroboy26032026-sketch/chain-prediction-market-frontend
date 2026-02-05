// src/pages/api/proxy/[...path].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    // JSON APIs OK. Nếu sau này cần stream upload qua proxy -> bodyParser: false
    bodyParser: true,
  },
};

const getBackendBaseUrl = () => {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'https://dev.pumpfunclone2025.win'
  ).replace(/\/+$/, '');
};

// ✅ CORS (optional)
function setCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;

  const allowList = new Set<string>([
    'http://localhost:3000',
    // add prod/staging here if needed
    // 'https://pumpfunclone2025.win',
    // 'https://dev.pumpfunclone2025.win',
  ]);

  if (origin && allowList.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
}

function buildUpstreamUrl(req: NextApiRequest, baseUrl: string) {
  const pathParts = (req.query.path as string[]) || [];
  const path = '/' + pathParts.join('/');

  const url = new URL(baseUrl + path);

  // keep querystring (except "path")
  for (const [k, v] of Object.entries(req.query)) {
    if (k === 'path') continue;
    if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, String(vv)));
    else if (v != null) url.searchParams.set(k, String(v));
  }

  return url;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  // preflight
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const baseUrl = getBackendBaseUrl();
    const url = buildUpstreamUrl(req, baseUrl);

    const method = (req.method || 'GET').toUpperCase();

    // headers to upstream
    const headers: Record<string, string> = {
      accept: req.headers.accept ? String(req.headers.accept) : 'application/json',
    };

    // forward Authorization
    if (req.headers.authorization) headers.authorization = String(req.headers.authorization);

    // forward cookie (if any)
    if (req.headers.cookie) headers.cookie = String(req.headers.cookie);

    // forward user-agent (optional but useful)
    if (req.headers['user-agent']) headers['user-agent'] = String(req.headers['user-agent']);

    // forward content-type if exists
    const ctIn = req.headers['content-type'] ? String(req.headers['content-type']) : '';
    if (ctIn) {
      // IMPORTANT: keep boundary for multipart/form-data
      headers['content-type'] = ctIn;
    } else if (method !== 'GET' && method !== 'HEAD') {
      headers['content-type'] = 'application/json';
    }

    // Body handling:
    // - GET/HEAD: no body
    // - JSON: stringify
    // - others: pass through
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

    // status + content-type passthrough
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
    return res.status(502).json({
      ok: false,
      error: 'PROXY_ERROR',
      message: e?.message || String(e),
    });
  }
}
