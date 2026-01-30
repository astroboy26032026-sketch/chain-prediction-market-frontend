// src/pages/api/proxy/[...path].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  api: {
    bodyParser: true, // giữ như bạn đang dùng
  },
};

const getBackendBaseUrl = () => {
  // ✅ Server-side nên ưu tiên biến không public
  // NEXT_PUBLIC_* không sai, nhưng không cần dùng ở đây.
  return (process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://dev.pumpfunclone2025.win').replace(
    /\/+$/,
    ''
  );
};

// ✅ CORS: chỉ mở khi thật sự cần, và chỉ mở đúng origin
function setCors(req: NextApiRequest, res: NextApiResponse) {
  const origin = req.headers.origin;

  // Nếu bạn chỉ chạy same-origin thì có thể bỏ hẳn setCors().
  // Nhưng nếu muốn để tránh case preflight lạ: allow whitelist.
  const allowList = new Set<string>([
    'http://localhost:3000',
    // thêm domain prod/staging của bạn tại đây:
    // 'https://pumpfunclone2025.win',
    // 'https://dev.pumpfunclone2025.win',
  ]);

  if (origin && allowList.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCors(req, res);

  // ✅ Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  try {
    const baseUrl = getBackendBaseUrl();
    const pathParts = (req.query.path as string[]) || [];
    const path = '/' + pathParts.join('/');

    // ✅ Keep querystring
    const url = new URL(baseUrl + path);
    for (const [k, v] of Object.entries(req.query)) {
      if (k === 'path') continue;
      if (Array.isArray(v)) v.forEach((vv) => url.searchParams.append(k, vv));
      else if (v != null) url.searchParams.set(k, String(v));
    }

    // ✅ Forward headers hợp lý
    const headers: Record<string, string> = {
      accept: req.headers.accept ? String(req.headers.accept) : 'application/json',
    };

    // forward auth
    if (req.headers.authorization) headers['authorization'] = String(req.headers.authorization);

    // forward content-type nếu có (đừng set cứng)
    if (req.headers['content-type']) headers['content-type'] = String(req.headers['content-type']);

    const method = (req.method || 'GET').toUpperCase();

    const upstream = await fetch(url.toString(), {
      method,
      headers,
      // body chỉ gửi khi cần
      body:
        method === 'GET' || method === 'HEAD'
          ? undefined
          : headers['content-type']?.includes('application/json')
            ? JSON.stringify(req.body ?? {})
            : // nếu content-type không phải json, để nguyên (bodyParser true sẽ “ăn” mất stream upload,
              // nhưng ít nhất không JSON.stringify bừa)
              (req.body as any),
    });

    // ✅ Pass-through status + content-type
    res.status(upstream.status);
    const ct = upstream.headers.get('content-type');
    if (ct) res.setHeader('content-type', ct);

    const text = await upstream.text();

    // ✅ Nếu BE trả json → trả object
    if (ct?.includes('application/json')) {
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
