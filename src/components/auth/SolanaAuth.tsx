// src/components/auth/SolanaAuth.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { toastSuccess, toastError } from '@/utils/customToast';

import { useAuth } from '@/components/providers/AuthProvider';

function shortAddr(addr: string, head = 4, tail = 4) {
  if (!addr) return '';
  if (addr.length <= head + tail) return addr;
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`;
}

export default function SolanaAuth({ compact = false }: { compact?: boolean }) {
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
      toastSuccess('Copied');
    } catch {
      toastError('Copy failed');
    }
  };

  const onDisconnect = async () => {
    try {
      // ✅ đúng yêu cầu: "xoá Sign out" -> dùng modal disconnect
      // signOut() sẽ gọi /auth/logout + clear token + disconnect wallet (theo AuthProvider bạn đã sửa)
      await signOut();
      toastSuccess('Disconnected');
    } catch (e: any) {
      // fallback nếu signOut lỗi thì vẫn disconnect wallet
      try {
        await disconnect();
      } catch {}
      toastError(e?.message || 'Disconnect failed');
    } finally {
      setOpenAccount(false);
    }
  };

  return (
    <div className={compact ? undefined : 'flex flex-col gap-2'}>
      <button
        onClick={onMainButtonClick}
        className={compact
          ? 'btn btn-primary px-6 py-2.5 text-base font-semibold whitespace-nowrap flex items-center justify-center gap-2'
          : 'btn btn-primary w-full font-semibold flex items-center justify-center gap-2'}
      >
        <span>{label}</span>
      </button>


      {/* ✅ Account modal (disconnect) — portal to body so backdrop-filter parents don't trap it */}
      {openAccount && createPortal(
        <div className="fixed inset-0 z-[999] flex items-center justify-center">
          {/* overlay */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpenAccount(false)}
          />

          {/* modal — dark space theme */}
          <div
            className="relative w-[340px] max-w-[92vw] rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #2A1024 0%, #351530 100%)' }}
          >
            <button
              onClick={() => setOpenAccount(false)}
              className="absolute right-3 top-3 h-8 w-8 rounded-full bg-white/8 border border-white/10 text-gray-400 flex items-center justify-center hover:bg-white/15 transition text-sm"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex flex-col items-center gap-3 px-6 pt-8 pb-6">
              {/* avatar — gradient circle */}
              <div
                className="h-16 w-16 rounded-full flex items-center justify-center text-3xl border-2 border-white/10"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                🍭
              </div>

              <div className="text-base font-extrabold text-white tracking-wide">
                {shortAddr(walletAddress, 6, 6)}
              </div>

              <div className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                {balanceSol} SOL
              </div>

              <div className="mt-3 grid w-full grid-cols-2 gap-3">
                <button
                  onClick={onCopy}
                  className="h-12 rounded-xl bg-white/5 border border-white/10 font-semibold text-gray-200 text-sm hover:bg-white/10 transition"
                >
                  Copy Address
                </button>

                <button
                  onClick={onDisconnect}
                  className="h-12 rounded-xl font-semibold text-sm text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
