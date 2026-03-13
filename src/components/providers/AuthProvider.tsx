// src/components/providers/AuthProvider.tsx
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

import type { AuthMeResponse } from '@/interface/auth.type';
import { authMe, issueChallenge, loginWallet, logoutAuth, refreshAuth, setToken } from '@/utils/authApi';
import { trackReferral } from '@/utils/api.index';

const REFERRAL_KEY = 'pf_referral_code';
const REFERRAL_TRACKED_KEY = 'pf_referral_tracked';

type AuthState = {
  loading: boolean;
  authenticated: boolean;
  me: AuthMeResponse | null;

  loadMe: () => Promise<void>;
  signInWithSolana: (ref?: string) => Promise<void>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, signMessage, disconnect, connected } = useWallet();

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<AuthMeResponse | null>(null);

  const authenticated = !!me?.authenticated;

  // prevent repeated auto sign attempts & concurrent sign-in
  const autoTriedRef = useRef<Record<string, boolean>>({});
  const signingInRef = useRef(false);

  const loadMe = useCallback(async () => {
    try {
      const data = await authMe();
      setMe(data);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signInWithSolana = useCallback(
    async (ref?: string) => {
      if (!publicKey) throw new Error('Wallet chưa connect');
      if (!signMessage) throw new Error('Wallet này không hỗ trợ signMessage');

      if (signingInRef.current) return;
      signingInRef.current = true;

      try {
        const wallet = publicKey.toBase58();
        const { challenge } = await issueChallenge(wallet, ref);

        const messageBytes = new TextEncoder().encode(challenge);
        const sigBytes = await signMessage(messageBytes);

        const signature = uint8ToBase64(sigBytes);

        await loginWallet(wallet, signature);
        await loadMe();
      } finally {
        signingInRef.current = false;
      }
    },
    [publicKey, signMessage, loadMe]
  );

  const refresh = useCallback(async () => {
    await refreshAuth();
    await loadMe();
  }, [loadMe]);

  const signOut = useCallback(async () => {
    try {
      await logoutAuth();
    } catch {
      // ignore
    }

    setMe(null);
    setToken(undefined);

    try {
      await disconnect();
    } catch {
      // ignore
    }
  }, [disconnect]);

  // Initial session check
  useEffect(() => {
    loadMe();
  }, [loadMe]);

  // ✅ AUTO SIGN-IN AFTER CONNECT + REFERRAL TRACKING
  useEffect(() => {
    const pk = publicKey?.toBase58();
    if (!connected || !pk) return;

    if (authenticated) return;

    // one auto attempt per wallet connect
    if (autoTriedRef.current[pk]) return;
    autoTriedRef.current[pk] = true;

    // Read referral code from localStorage (saved by /join/[code] page)
    const refCode = localStorage.getItem(REFERRAL_KEY) || undefined;

    signInWithSolana(refCode)
      .then(() => {
        // Track referral for first-time users
        const alreadyTracked = localStorage.getItem(REFERRAL_TRACKED_KEY);
        if (refCode && !alreadyTracked) {
          trackReferral(pk)
            .then(() => {
              localStorage.setItem(REFERRAL_TRACKED_KEY, '1');
              localStorage.removeItem(REFERRAL_KEY);
            })
            .catch((err) => {
              console.warn('[AuthProvider] Referral track failed:', err?.message || err);
            });
        }
      })
      .catch((err) => {
        // user reject signature -> log but don't loop
        console.warn('[AuthProvider] Auto sign-in failed:', err?.message || err);
      });
  }, [connected, publicKey, authenticated, signInWithSolana]);

  // If wallet disconnected manually -> clear FE auth state/token (no /auth/logout)
  useEffect(() => {
    if (!connected || !publicKey) {
      setMe(null);
      setToken(undefined);
    }
  }, [connected, publicKey]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      authenticated,
      me,
      loadMe,
      signInWithSolana,
      refresh,
      signOut,
    }),
    [loading, authenticated, me, loadMe, signInWithSolana, refresh, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}