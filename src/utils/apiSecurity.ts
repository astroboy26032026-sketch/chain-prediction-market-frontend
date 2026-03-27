// src/utils/apiSecurity.ts
// Shared security utilities for Next.js API routes

import type { NextApiRequest, NextApiResponse } from 'next';

// =====================
// 1. PAGINATION BOUNDS
// =====================
const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 10_000;

/** Clamp page/pageSize to safe bounds */
export function clampPagination(query: NextApiRequest['query']) {
  const rawPage = Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1;
  const rawPageSize = Number(Array.isArray(query.pageSize) ? query.pageSize[0] : query.pageSize) || 20;

  return {
    page: Math.max(1, Math.min(rawPage, MAX_PAGE)),
    pageSize: Math.max(1, Math.min(rawPageSize, MAX_PAGE_SIZE)),
  };
}

// =====================
// 2. RATE LIMITING (in-memory, per-IP)
// =====================
type RateBucket = { count: number; resetAt: number };
const buckets = new Map<string, RateBucket>();

// Clean up stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}, 5 * 60_000);

/**
 * Simple sliding-window rate limiter.
 * Returns true if request is allowed, false if rate-limited.
 */
export function checkRateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  opts: { windowMs?: number; max?: number; keyPrefix?: string } = {}
): boolean {
  const { windowMs = 60_000, max = 60, keyPrefix = 'global' } = opts;

  const ip =
    (Array.isArray(req.headers['x-forwarded-for'])
      ? req.headers['x-forwarded-for'][0]
      : req.headers['x-forwarded-for']?.split(',')[0]?.trim()) ||
    req.socket.remoteAddress ||
    'unknown';

  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count++;

  res.setHeader('X-RateLimit-Limit', String(max));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));

  if (bucket.count > max) {
    res.status(429).json({ error: 'Too many requests, please try again later.' });
    return false;
  }

  return true;
}

// =====================
// 3. AUTH TOKEN VERIFICATION
// =====================
/**
 * Extract Bearer token from Authorization header.
 * Returns the token string or null.
 */
export function extractBearerToken(req: NextApiRequest): string | null {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7).trim() || null;
}

/**
 * Require a valid Bearer token on the request.
 * Returns false (and sends 401) if missing.
 * NOTE: This only checks presence. For full JWT verification,
 * the backend API handles token validation when forwarding.
 */
export function requireAuth(req: NextApiRequest, res: NextApiResponse): boolean {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return false;
  }
  return true;
}

// =====================
// 4. CSRF PROTECTION
// =====================
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Check CSRF for state-changing requests.
 * Validates Origin/Referer against allowed origins.
 * Returns false (and sends 403) if check fails.
 */
export function checkCsrf(req: NextApiRequest, res: NextApiResponse): boolean {
  if (SAFE_METHODS.has(req.method || 'GET')) return true;

  const allowedOrigins = new Set(
    (
      process.env.CORS_ALLOWED_ORIGINS ||
      'http://localhost:3000,https://zugar.app,https://dev.zugar.app'
    )
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // If origin header is present, check it
  if (origin) {
    if (allowedOrigins.has(origin)) return true;
    res.status(403).json({ error: 'Forbidden: invalid origin' });
    return false;
  }

  // Fall back to referer
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refOrigin)) return true;
    } catch {
      // invalid referer URL
    }
    res.status(403).json({ error: 'Forbidden: invalid referer' });
    return false;
  }

  // No origin or referer on state-changing request = deny
  // Exception: server-side calls (from Next.js API routes calling each other)
  // These won't have origin headers, so allow if there's a valid auth token
  if (extractBearerToken(req)) return true;

  res.status(403).json({ error: 'Forbidden: missing origin' });
  return false;
}

// =====================
// 5. INPUT SANITIZATION
// =====================
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
};

/** Escape HTML special characters to prevent XSS */
export function escapeHtml(str: string): string {
  return str.replace(/[&<>"'/]/g, (char) => HTML_ENTITIES[char] || char);
}

/** Sanitize a chat message: trim, limit length, escape HTML */
export function sanitizeMessage(message: string, maxLength = 2000): string {
  return escapeHtml(message.trim().slice(0, maxLength));
}

// =====================
// 6. SOLANA ADDRESS VALIDATION
// =====================
const BASE58_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Validate a Solana base58 address */
export function isValidSolanaAddress(address: string): boolean {
  return BASE58_REGEX.test(address);
}

// =====================
// 7. PROXY PATH VALIDATION
// =====================
const ALLOWED_PROXY_PREFIXES = [
  '/api/',
  '/auth/',
  '/token/',
  '/chats',
  '/chat/',
  '/rewards/',
  '/reward/',
  '/points/',
  '/trading/',
  '/user/',
  '/staking/',
  '/leaderboard/',
  '/ports/',
  '/wallet/',
  '/upload-to-ipfs',
  '/health',
];

/** Validate that a proxy path is in the allowed list */
export function isAllowedProxyPath(path: string): boolean {
  const normalized = path.startsWith('/') ? path : '/' + path;
  // Block path traversal
  if (normalized.includes('..') || normalized.includes('//')) return false;
  return ALLOWED_PROXY_PREFIXES.some((prefix) => normalized.startsWith(prefix));
}

// =====================
// 8. FILE UPLOAD VALIDATION
// =====================
const ALLOWED_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

const MAX_FILENAME_LENGTH = 255;
const FILENAME_UNSAFE_CHARS = /[^a-zA-Z0-9._-]/g;

/** Validate file mimetype is an allowed image type */
export function isAllowedImageType(mimetype: string): boolean {
  return ALLOWED_IMAGE_MIMES.has(mimetype.toLowerCase());
}

/** Sanitize a filename: remove path traversal, special chars, limit length */
export function sanitizeFilename(filename: string): string {
  // Extract just the filename (remove any directory components)
  const base = filename.split(/[\\/]/).pop() || 'unnamed_file';
  // Remove unsafe characters
  const clean = base.replace(FILENAME_UNSAFE_CHARS, '_');
  // Limit length
  return clean.slice(0, MAX_FILENAME_LENGTH) || 'unnamed_file';
}
