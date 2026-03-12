// Helpers for resolving token identifiers and building hrefs

const TOKEN_BASE_PATH = '/token';

export const isLikelySolanaAddress = (s: string): boolean =>
  /^[1-9A-HJ-NP-Za-km-z]{32,48}$/.test(s);

export const isLikelyEvmAddress = (s: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(s);

export const normalizeCandidate = (raw: any): string | null => {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  s = s.replace(/^(sol|eth|bsc|arb|op|base|poly|matic|shibarium):/i, '');
  s = s.replace(/^\/+/, '');
  return s || null;
};

export const getTokenIdentifier = (t: any): string | null => {
  const candidates = [t?.address, t?.mint, t?.tokenAddress, t?.ca, t?.id];
  for (const raw of candidates) {
    const normalized = normalizeCandidate(raw);
    if (!normalized) continue;
    if (/^https?:\/\//i.test(normalized)) return normalized;
    if (isLikelyEvmAddress(normalized) || isLikelySolanaAddress(normalized)) return normalized;
  }
  return null;
};

export const getTokenHref = (t: any): string => {
  const identifier = getTokenIdentifier(t);
  if (!identifier) return TOKEN_BASE_PATH;
  if (/^https?:\/\//i.test(identifier)) return identifier;
  return `${TOKEN_BASE_PATH}/${encodeURIComponent(identifier)}`;
};

export const getTokenAddress = (t: any): string | null => {
  const raw = t?.address || t?.mint || t?.tokenAddress || t?.ca || null;
  return raw ? String(raw).trim() : null;
};
