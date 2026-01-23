// src/utils/authApi.ts
import axios from 'axios';

const PROXY_BASE = '/api/proxy';
const isServer = typeof window === 'undefined';

const computeSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
};
const SITE_URL = computeSiteUrl();

const absProxy = (path: string) =>
  isServer ? `${SITE_URL}${PROXY_BASE}${path}` : `${PROXY_BASE}${path}`;

// ---- token storage (simple) ----
const TOKEN_KEY = 'access_token';

export function setToken(token?: string) {
  if (typeof window === 'undefined') return;
  if (!token) localStorage.removeItem(TOKEN_KEY);
  else localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

const authAxios = axios.create();

// attach bearer token automatically
authAxios.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export type IssueChallengeResponse = {
  nonce: string;
  expiresInSeconds: number;
  challenge: string;
  domain: string;
};

export async function issueChallenge(wallet: string, ref?: string) {
  const url = absProxy('/auth/wallet/challenge');
  const { data } = await authAxios.post<IssueChallengeResponse>(url, { wallet, ref });
  return data;
}

export type LoginWalletResponse = {
  access_token: string;
  token_type: string;
  isNewUser: boolean;
  userProfile: { walletAddress: string; createdAt: string };
  expiresInSec: number;
};

export async function loginWallet(wallet: string, signature: string) {
  const url = absProxy('/auth/wallet/login');
  const { data } = await authAxios.post<LoginWalletResponse>(url, { wallet, signature });
  if (data?.access_token) setToken(data.access_token);
  return data;
}

export type AuthMeResponse = {
  wallet: string;
  role: string;
  id: number;
  authenticated: boolean;
  address: string;
  expiresInSec: number;
};

export async function authMe() {
  const url = absProxy('/auth/me');
  const { data } = await authAxios.get<AuthMeResponse>(url);
  return data;
}

export async function refreshAuth() {
  const url = absProxy('/auth/refresh');
  const { data } = await authAxios.post<{ jwt: string; expiresInSec: number }>(url);
  if (data?.jwt) setToken(data.jwt);
  return data;
}

export async function logoutAuth() {
  const url = absProxy('/auth/logout');
  const { data } = await authAxios.post<{ ok: boolean }>(url);
  setToken(undefined);
  return data;
}
