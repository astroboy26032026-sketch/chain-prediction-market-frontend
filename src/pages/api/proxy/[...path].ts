// src/pages/api/proxy/[...path].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: { bodyParser: true },
};

const getBackendBaseUrl = () => {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    'https://dev.pumpfunclone2025.win'
  );
};

function setCors(res: NextApiResponse) {
  // same-origin thường không cần, nhưng thêm để dập mọi trường hợp preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(res);

  // ✅ Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const baseUrl = getBackendBaseUrl().replace(/\/$/, '');
    const pathParts = (req.query.path as string[]) || [];
    const path = '/' + pathParts.join('/'); // /auth/wallet/challenge

    // keep querystring
    const url = new URL(baseUrl + path);
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path') continue;
      if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, vv));
      else if (v != null) url.searchParams.set(k, String(v));
    }

    const headers: Record<string, string> = {};
    if (req.headers.authorization) headers['authorization'] = String(req.headers.authorization);
    headers['content-type'] = 'application/json';
    headers['accept'] = 'application/json';

    const method = (req.method || 'GET').toUpperCase();

    const upstream = await fetch(url.toString(), {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(req.body ?? {}),
    });

    const ct = upstream.headers.get('content-type') || 'application/json';
    res.status(upstream.status);
    res.setHeader('content-type', ct);

    const text = await upstream.text();
    // nếu BE trả JSON -> parse để FE nhận object
    if (ct.includes('application/json')) {
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
