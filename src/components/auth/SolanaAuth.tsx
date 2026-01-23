// src/components/auth/SolanaAuth.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toast } from 'react-toastify';

import { useAuth } from '@/components/providers/AuthProvider';

function shortAddr(addr: string, head = 4, tail = 4) {
  if (!addr) return '';
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

export default function SolanaAuth() {
  const { publicKey, connected, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const { loading, authenticated, signOut } = useAuth();

  const [openAccount, setOpenAccount] = useState(false);
  const [balanceSol, setBalanceSol] = useState<string>('—');

  const walletAddress = useMemo(() => publicKey?.toBase58() || '', [publicKey]);

  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  const connection = useMemo(() => new Connection(endpoint, 'confirmed'), [endpoint]);

  // load SOL balance when account modal opens (or when wallet changes)
  useEffect(() => {
    let alive = true;

    async function loadBalance() {
      if (!publicKey) {
        setBalanceSol('—');
        return;
      }
      try {
        const lamports = await connection.getBalance(publicKey);
        const sol = lamports / LAMPORTS_PER_SOL;
        if (!alive) return;
        setBalanceSol(sol.toFixed(4));
      } catch {
        if (!alive) return;
        setBalanceSol('—');
      }
    }

    if (openAccount) loadBalance();
    return () => {
      alive = false;
    };
  }, [openAccount, publicKey, connection]);

  const onMainButtonClick = () => {
    if (!connected || !walletAddress) {
      // open wallet selector modal
      setVisible(true);
      return;
    }
    // open account modal
    setOpenAccount(true);
  };

  const label = useMemo(() => {
    if (!connected || !walletAddress) return 'Connect Wallet';
    return shortAddr(walletAddress);
  }, [connected, walletAddress]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const onDisconnect = async () => {
    try {
      // ✅ đúng yêu cầu: "xoá Sign out" -> dùng modal disconnect
      // signOut() sẽ gọi /auth/logout + clear token + disconnect wallet (theo AuthProvider bạn đã sửa)
      await signOut();
      toast.info('Disconnected');
    } catch (e: any) {
      // fallback nếu signOut lỗi thì vẫn disconnect wallet
      try {
        await disconnect();
      } catch {}
      toast.error(e?.message || 'Disconnect failed');
    } finally {
      setOpenAccount(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* ✅ Nút y hệt Create Token */}
      <button
        onClick={onMainButtonClick}
        className="btn btn-primary w-full font-semibold flex items-center justify-center gap-2"
      >
        <span>{label}</span>
      </button>

      {/* Optional: status line */}
      <div className="text-[12px] opacity-80">
        <span className="font-semibold">Auth:</span>{' '}
        {loading ? 'Loading...' : authenticated ? 'Authenticated' : 'Not authenticated'}
      </div>

      {/* ✅ Account modal (disconnect) */}
      {openAccount && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpenAccount(false)}
          />

          {/* modal */}
          <div className="relative w-[520px] max-w-[92vw] rounded-2xl bg-white p-6 shadow-2xl">
            <button
              onClick={() => setOpenAccount(false)}
              className="absolute right-4 top-4 h-10 w-10 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex flex-col items-center gap-3 pt-4">
              {/* avatar placeholder */}
              <div className="h-16 w-16 rounded-full bg-yellow-200 flex items-center justify-center text-3xl">
                🐥
              </div>

              <div className="text-xl font-semibold text-gray-900">
                {shortAddr(walletAddress, 6, 6)}
              </div>

              {/* ✅ SOL instead of BONE */}
              <div className="text-gray-500 font-semibold">
                {balanceSol} SOL
              </div>

              <div className="mt-4 grid w-full grid-cols-2 gap-4">
                <button
                  onClick={onCopy}
                  className="h-14 rounded-xl bg-gray-100 font-semibold text-gray-800 hover:bg-gray-200"
                >
                  Copy Address
                </button>

                <button
                  onClick={onDisconnect}
                  className="h-14 rounded-xl bg-gray-100 font-semibold text-gray-800 hover:bg-gray-200"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
