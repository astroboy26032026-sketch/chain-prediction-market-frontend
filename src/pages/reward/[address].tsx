// src/pages/reward/[address].tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Buffer } from 'buffer';
import { VersionedTransaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { COMMON, SEO as SEO_TEXT, REWARD } from '@/constants/ui-text';
import {
  claimReward,
  convertRewardPoints,
  getRewardInfo,
  getRewardMarquee,
  type RewardInfoResponse,
  type RewardMarqueeItem,
} from '@/utils/api';

/* =========================
   CONFIG
========================= */
const CLAIM_STATUS_TIMEOUT_MS = 20000;
const CLAIM_STATUS_POLL_MS = 1500;

/* =========================
   UTILS
========================= */
function fmtSol(value: number, min = 3, max = 6): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return '0.000';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

function maskUserId(userId: string): string {
  const s = String(userId ?? '').trim();
  if (!s) return 'Guest';
  if (/^guest/i.test(s)) return s;
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function extractErrorInfo(error: any): { status: number; code: string; message: string } {
  const status = Number(error?.response?.status ?? 0);
  const raw = error?.response?.data;
  const text =
    typeof raw === 'string'
      ? raw
      : typeof raw?.message === 'string'
        ? raw.message
        : typeof raw?.error === 'string'
          ? raw.error
          : typeof error?.message === 'string'
            ? error.message
            : '';

  return {
    status,
    code: String(text || '').trim().toLowerCase(),
    message: String(text || '').trim(),
  };
}

function getConvertMessageFromError(error: any): { title: string; text: string; tone: 'success' | 'error' } {
  const { status, code } = extractErrorInfo(error);

  if (status === 400) {
    if (code.includes('insufficient_points_or_invalid_rate')) {
      return {
        title: 'Cannot Convert Points',
        text: 'You do not have enough points to convert right now, or the current conversion rate is not available.',
        tone: 'error',
      };
    }
    return {
      title: 'Convert Request Invalid',
      text: 'Your convert request could not be processed. Please refresh the page and try again.',
      tone: 'error',
    };
  }

  if (status === 404) {
    return {
      title: 'User Not Found',
      text: 'We could not find this reward user. Please reconnect your wallet and try again.',
      tone: 'error',
    };
  }

  if (status === 500) {
    return {
      title: 'Server Error',
      text: 'Something went wrong while converting points into tickets. Please try again later.',
      tone: 'error',
    };
  }

  return {
    title: 'Convert Failed',
    text: 'Your points could not be converted right now. Please try again.',
    tone: 'error',
  };
}

function getClaimMessageFromError(error: any): { title: string; text: string; tone: 'success' | 'error' } {
  const { status, code } = extractErrorInfo(error);

  if (status === 400) {
    return {
      title: 'Claim Request Invalid',
      text: 'This reward claim could not be processed. Please refresh the page and try again.',
      tone: 'error',
    };
  }

  if (status === 404) {
    return {
      title: 'User Not Found',
      text: 'We could not find reward data for this wallet. Please reconnect your wallet and try again.',
      tone: 'error',
    };
  }

  if (status === 500) {
    return {
      title: 'Server Error',
      text: 'Something went wrong while preparing your claim. Please try again later.',
      tone: 'error',
    };
  }

  if (status === 503 || code.includes('reward_claim_unavailable')) {
    return {
      title: 'Claim Unavailable',
      text: 'The reward claim system is temporarily unavailable right now. Please try again later.',
      tone: 'error',
    };
  }

  return {
    title: 'Claim Failed',
    text: 'Your reward could not be claimed right now. Please try again.',
    tone: 'error',
  };
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}:${String(seconds).padStart(2, '0')}`;
  return `${seconds}s`;
}

function isWalletRejected(error: any): boolean {
  const msg = String(error?.message ?? '').toLowerCase();
  return (
    msg.includes('user rejected') ||
    msg.includes('user declined') ||
    msg.includes('rejected the request') ||
    msg.includes('cancelled') ||
    msg.includes('canceled')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================
   ICONS
========================= */
const TrophySVG: React.FC = () => (
  <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="tgrad" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22C55E" />
        <stop offset="1" stopColor="#16A34A" />
      </linearGradient>
      <linearGradient id="hgrad" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#A7F3D0" />
        <stop offset="1" stopColor="#6EE7B7" />
      </linearGradient>
    </defs>
    <g filter="url(#f1)">
      <path d="M32 18h48v12a20 20 0 0 1-20 20h-8a20 20 0 0 1-20-20V18Z" fill="url(#tgrad)" />
      <path d="M42 52h28v8a14 14 0 0 1-14 14h0A14 14 0 0 1 42 60v-8Z" fill="url(#tgrad)" />
      <rect x="48" y="74" width="16" height="10" rx="3" fill="url(#tgrad)" />
      <rect x="38" y="86" width="36" height="8" rx="3" fill="url(#tgrad)" />
      <path d="M32 24H18c0 13 8 22 20 22" stroke="url(#tgrad)" strokeWidth="6" strokeLinecap="round" />
      <path d="M80 24h14c0 13-8 22-20 22" stroke="url(#tgrad)" strokeWidth="6" strokeLinecap="round" />
    </g>
    <path d="M56 6c4-6 12-2 10 5-1 3-6 7-10 10-4-3-9-7-10-10-2-7 6-11 10-5Z" fill="url(#hgrad)" />
    <path d="M86 10c3-4 9-1 8 4-1 2-4 5-8 7-3-2-6-5-8-7-1-5 5-8 8-4Z" fill="url(#hgrad)" opacity=".75" />
    <path d="M28 12c3-4 9-1 8 4-1 2-4 5-8 7-3-2-6-5-8-7-1-5 5-8 8-4Z" fill="url(#hgrad)" opacity=".6" />
    <defs>
      <filter id="f1" x="0" y="0" width="112" height="112" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity=".15" />
      </filter>
    </defs>
  </svg>
);

const ErrorSVG: React.FC = () => (
  <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden="true">
    <defs>
      <linearGradient id="ered" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F87171" />
        <stop offset="1" stopColor="#DC2626" />
      </linearGradient>
    </defs>
    <circle cx="56" cy="56" r="32" fill="url(#ered)" opacity=".16" />
    <circle cx="56" cy="56" r="24" fill="url(#ered)" opacity=".22" />
    <path d="M56 32c2.8 0 5 2.2 5 5v20c0 2.8-2.2 5-5 5s-5-2.2-5-5V37c0-2.8 2.2-5 5-5Z" fill="url(#ered)" />
    <circle cx="56" cy="74" r="5" fill="url(#ered)" />
  </svg>
);

/* =========================
   MESSAGE BOXES
========================= */
type StatusModalProps = {
  open: boolean;
  title: string;
  text: string;
  tone?: 'success' | 'error';
  onClose: () => void;
};

const StatusModal: React.FC<StatusModalProps> = ({ open, title, text, tone = 'success', onClose }) => {
  if (!open) return null;

  const isError = tone === 'error';

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center">
      <div className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-[min(92vw,520px)] rounded-[28px]
                   bg-[var(--card)] border border-[var(--card-border)]
                   shadow-[0_20px_70px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        <div className="p-8">
          <div className="grid place-items-center mb-5">{isError ? <ErrorSVG /> : <TrophySVG />}</div>

          <h4 className={`text-2xl font-extrabold text-center mb-1 ${isError ? 'text-red-400' : 'text-[var(--primary)]'}`}>
            {title}
          </h4>

          <p className="text-center text-[15px] text-[var(--foreground)]/90 mb-6">{text}</p>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onClose}
              className={`w-[180px] h-10 rounded-full text-[14px] font-semibold tracking-wide transition-colors ${
                isError ? 'bg-red-500 hover:bg-red-500/90 text-white' : 'btn btn-primary text-white'
              }`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type ClaimModalProps = {
  open: boolean;
  amountText: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
};

const ClaimModal: React.FC<ClaimModalProps> = ({ open, amountText, onCancel, onConfirm, loading }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center">
      <div className="absolute inset-0 bg-black/50" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-[min(92vw,520px)] rounded-[28px]
                   bg-[var(--card)] border border-[var(--card-border)]
                   shadow-[0_20px_70px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        <div className="p-8">
          <div className="grid place-items-center mb-5">
            <TrophySVG />
          </div>
          <h4 className="text-2xl font-extrabold text-[var(--primary)] text-center mb-1">Claim Reward</h4>
          <p className="text-center text-[15px] text-[var(--foreground)]/90 mb-6">
            You are about to claim <strong>{amountText}</strong>.
          </p>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className="btn btn-primary w-[180px] h-10 text-[14px] font-semibold tracking-wide text-white disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? REWARD.PROCESSING : COMMON.CONFIRM}
            </button>
            <button
              onClick={onCancel}
              disabled={loading}
              className="w-[180px] h-10 rounded-full font-semibold tracking-wide text-[14px]
                         border border-[var(--primary)]/50
                         text-[var(--primary)] hover:bg-[var(--card2)]/60 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {COMMON.CANCEL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   LUCKY WHEEL COMPONENT
========================= */
const WHEEL_SEGMENTS = [
  { label: '0.1 SOL',  value: 0.1,  color: '#F9A8D4', textColor: '#831843', emoji: '🌙' },
  { label: '0.5 SOL',  value: 0.5,  color: '#93C5FD', textColor: '#1e3a8a', emoji: '⭐' },
  { label: '1 SOL',    value: 1,    color: '#C4B5FD', textColor: '#4c1d95', emoji: '🪐' },
  { label: '0.05 SOL', value: 0.05, color: '#FDA4AF', textColor: '#881337', emoji: '☄️' },
  { label: '5 SOL',    value: 5,    color: '#7DD3FC', textColor: '#075985', emoji: '🚀' },
  { label: '0.2 SOL',  value: 0.2,  color: '#DDD6FE', textColor: '#4c1d95', emoji: '🌟' },
  { label: '10 SOL',   value: 10,   color: '#F9A8D4', textColor: '#831843', emoji: '🌌' },
  { label: 'Try Again',value: 0,    color: '#93C5FD', textColor: '#1e3a8a', emoji: '🌑' },
  { label: '0.01 SOL', value: 0.01, color: '#C4B5FD', textColor: '#4c1d95', emoji: '✨' },
  { label: '50 SOL',   value: 50,   color: '#FDA4AF', textColor: '#881337', emoji: '💫' },
  { label: '0.5 SOL',  value: 0.5,  color: '#7DD3FC', textColor: '#075985', emoji: '🛸' },
  { label: 'Try Again',value: 0,    color: '#DDD6FE', textColor: '#4c1d95', emoji: '🌑' },
];

const LuckyWheel: React.FC<{ tickets: number; onSpinComplete: (prize: typeof WHEEL_SEGMENTS[0]) => void }> = ({ tickets, onSpinComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>(0);
  const segments = WHEEL_SEGMENTS;
  const segAngle = (2 * Math.PI) / segments.length;

  const drawWheel = useCallback((rot: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 8;

    ctx.clearRect(0, 0, size, size);

    // White outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();

    // Draw segments
    segments.forEach((seg, i) => {
      const startA = rot + i * segAngle;
      const endA = startA + segAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startA, endA);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // White border between segments
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = (seg as any).textColor || '#1e1b4b';
      ctx.font = `bold ${Math.max(9, r * 0.08)}px sans-serif`;
      ctx.shadowColor = 'rgba(255,255,255,0.5)';
      ctx.shadowBlur = 2;
      ctx.fillText(seg.label, r - 10, 4);
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Center hub — dark circle with "Spin" text
    const hubR = r * 0.18;
    ctx.beginPath();
    ctx.arc(cx, cy, hubR, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.font = `bold ${r * 0.09}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Spin', cx, cy);
    ctx.textBaseline = 'alphabetic';

    // Teardrop pointer at top
    const ptrY = cy - r - 4;
    ctx.beginPath();
    ctx.moveTo(cx, ptrY + 18);
    ctx.lineTo(cx - 9, ptrY);
    ctx.lineTo(cx + 9, ptrY);
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [segments, segAngle]);

  useEffect(() => {
    drawWheel(rotation);
  }, [rotation, drawWheel]);

  const handleSpin = () => {
    if (spinning || tickets <= 0) return;
    setSpinning(true);

    // Pick random winner
    const winIdx = Math.floor(Math.random() * segments.length);
    // Calculate target rotation: multiple full spins + land on segment
    // Pointer is at top (angle 0 = right, so top = -PI/2)
    // We want segment winIdx to be at the pointer
    const targetSegAngle = -(winIdx * segAngle + segAngle / 2) - Math.PI / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5-7 full rotations
    const targetRotation = rotation + fullSpins * Math.PI * 2 + (targetSegAngle - (rotation % (Math.PI * 2)));

    const startRot = rotation;
    const duration = 4000 + Math.random() * 1000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - t, 3);
      const currentRot = startRot + (targetRotation - startRot) * ease;

      setRotation(currentRot);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        setRotation(targetRotation);
        setSpinning(false);
        onSpinComplete(segments[winIdx]);
      }
    };

    animRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Galaxy glow backdrop */}
      <div className="relative" style={{ width: 340, height: 340 }}>
        {/* Outer glow */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,111,255,0.25) 0%, rgba(64,191,255,0.10) 50%, transparent 70%)', pointerEvents: 'none' }}
        />
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          className="cursor-pointer rounded-full"
          style={{ filter: 'drop-shadow(0 0 18px rgba(124,111,255,0.55))' }}
          onClick={handleSpin}
        />
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning || tickets <= 0}
        className="btn btn-primary mt-5 px-10 py-3 text-sm font-bold tracking-widest uppercase disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundImage: 'linear-gradient(135deg, #7C6FFF, #40BFFF)' }}
      >
        {spinning ? '🌀 Spinning…' : tickets <= 0 ? '🎟 No Tickets' : '🚀 SPIN'}
      </button>

      <p className="text-xs text-gray-500 mt-2">1 ticket per spin · {tickets} ticket{tickets !== 1 ? 's' : ''} left</p>
    </div>
  );
};

/* =========================
   MAIN PAGE
========================= */
const RewardPage: React.FC = () => {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const address = useMemo(() => {
    const raw = router.query.address;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [router.query.address]);

  const [rewardInfo, setRewardInfo] = useState<RewardInfoResponse | null>(null);
  const [marqueeItems, setMarqueeItems] = useState<RewardMarqueeItem[]>([]);
  const [wheelResult, setWheelResult] = useState<{ label: string; value: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [converting, setConverting] = useState(false);
  const [cooldownNow, setCooldownNow] = useState<number>(Date.now());

  const [statusModal, setStatusModal] = useState<{
    open: boolean;
    title: string;
    text: string;
    tone: 'success' | 'error';
  }>({
    open: false,
    title: '',
    text: '',
    tone: 'success',
  });
  const [claimModal, setClaimModal] = useState<{ open: boolean }>({ open: false });

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const winners = useMemo(() => {
    if (!marqueeItems.length) return ['Loading winners...'];
    return marqueeItems.map((item) => {
      const user = maskUserId(item.userId);
      return `${user} won ${fmtSol(item.payoutSol)} SOL ${item.timeAgo}`;
    });
  }, [marqueeItems]);

  const openStatusModal = (title: string, text: string, tone: 'success' | 'error') => {
    setStatusModal({ open: true, title, text, tone });
  };

  const loadAll = async () => {
    if (!address) return null;

    try {
      setLoading(true);
      const [infoRes, marqueeRes] = await Promise.all([
        getRewardInfo(address),
        getRewardMarquee(),
      ]);

      setRewardInfo(infoRes);
      setMarqueeItems(Array.isArray(marqueeRes?.items) ? marqueeRes.items : []);
      return infoRes;
    } catch (error: any) {
      console.error('[Reward] Load error:', error);
      openStatusModal(
        REWARD.LOAD_FAILED_TITLE,
        error?.message || 'Reward data could not be loaded right now. Please refresh and try again.',
        'error'
      );
      return null;
    } finally {
      setLoading(false);
    }
  };

  const refreshRewardInfoOnly = async () => {
    if (!address) return null;
    try {
      const infoRes = await getRewardInfo(address);
      setRewardInfo(infoRes);
      return infoRes;
    } catch (error) {
      console.error('[Reward] Refresh info error:', error);
      return null;
    }
  };

  const waitForClaimSignature = async (signature: string): Promise<'success' | 'timeout'> => {
    const startedAt = Date.now();

    while (Date.now() - startedAt < CLAIM_STATUS_TIMEOUT_MS) {
      const res = await connection.getSignatureStatuses([signature]);
      const status = res?.value?.[0];

      if (status?.err) {
        throw new Error('Transaction failed on-chain');
      }

      const confirmationStatus = String(status?.confirmationStatus ?? '').toLowerCase();
      if (confirmationStatus === 'confirmed' || confirmationStatus === 'finalized') {
        return 'success';
      }

      await sleep(CLAIM_STATUS_POLL_MS);
    }

    return 'timeout';
  };

  useEffect(() => {
    if (!router.isReady || !address) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, address]);

  const claimableSol = Number(rewardInfo?.claimableSol ?? 0);
  const tickets = Number(rewardInfo?.tickets ?? 0);
  const points = Number(rewardInfo?.points ?? 0);
  const cooldownUntil = String(rewardInfo?.cooldownUntil ?? '');

  const remainingCooldownMs = useMemo(() => {
    if (!cooldownUntil) return 0;
    const until = new Date(cooldownUntil).getTime();
    if (!Number.isFinite(until)) return 0;
    return Math.max(0, until - cooldownNow);
  }, [cooldownUntil, cooldownNow]);

  const cooldownActive = remainingCooldownMs > 0;

  const canClaim = !loading && !claiming && claimableSol > 0;
  const convertConfig = rewardInfo?.convertConfig;
  const canConvert = !loading && !converting && points > 0;

  const actionBtnClass = 'btn btn-primary w-[160px] h-10 text-[14px] font-semibold tracking-wide text-white';

  const onClaim = () => {
    if (!canClaim) return;
    setClaimModal({ open: true });
  };

  const confirmClaim = async () => {
    if (!address || claiming || claimableSol <= 0) return;

    if (!wallet?.connected || !wallet.publicKey) {
      openStatusModal(REWARD.WALLET_NOT_CONNECTED_TITLE, REWARD.WALLET_NOT_CONNECTED_TEXT, 'error');
      return;
    }

    if (!wallet.sendTransaction) {
      openStatusModal(REWARD.WALLET_UNSUPPORTED_TITLE, REWARD.WALLET_UNSUPPORTED_TEXT, 'error');
      return;
    }

    setClaimModal({ open: false });
    setClaiming(true);

    try {
      const res = await claimReward(address);

      if (!res.transaction) {
        setRewardInfo((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            claimableSol: Number(res.claimableSol ?? prev.claimableSol),
          };
        });

        openStatusModal(
          REWARD.NOTHING_TO_CLAIM_TITLE,
          res.message || REWARD.NOTHING_TO_CLAIM_TEXT,
          'success'
        );
        return;
      }

      const rawTx = Buffer.from(String(res.transaction), 'base64');
      const tx = VersionedTransaction.deserialize(rawTx);

      if (!wallet.signTransaction) throw new Error('Wallet does not support signTransaction');
      const signedTx = await wallet.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        preflightCommitment: 'processed',
      });

      const waitResult = await waitForClaimSignature(signature);
      const refreshed = await refreshRewardInfoOnly();
      const latestClaimable = Number(refreshed?.claimableSol ?? 0);

      if (waitResult === 'success') {
        setRewardInfo((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            claimableSol: latestClaimable,
          };
        });

        openStatusModal(
          REWARD.CLAIM_SUCCESS_TITLE,
          `You have successfully claimed ${fmtSol(Number(res.claimedSol ?? 0))} SOL.`,
          'success'
        );
        return;
      }

      if (latestClaimable <= 0) {
        openStatusModal(
          REWARD.CLAIM_SUCCESS_TITLE,
          `You have successfully claimed ${fmtSol(Number(res.claimedSol ?? 0))} SOL.`,
          'success'
        );
        return;
      }

      openStatusModal(
        'Claim Pending',
        'Your transaction was submitted, but confirmation is taking longer than expected. Please wait a moment and refresh again.',
        'error'
      );
    } catch (error: any) {
      console.error('[Reward] Claim error:', error);

      const refreshed = await refreshRewardInfoOnly();
      const latestClaimable = Number(refreshed?.claimableSol ?? claimableSol);

      if (latestClaimable <= 0) {
        openStatusModal(
          REWARD.CLAIM_SUCCESS_TITLE,
          'Your reward appears to have been claimed successfully.',
          'success'
        );
      } else if (isWalletRejected(error)) {
        openStatusModal(
          REWARD.TX_REJECTED_TITLE,
          REWARD.TX_REJECTED_TEXT,
          'error'
        );
      } else {
        const msg = getClaimMessageFromError(error);
        openStatusModal(msg.title, msg.text, msg.tone);
      }
    } finally {
      setClaiming(false);
    }
  };

  const handleConvert = async (ticketCount: number, mode: 'exact' | 'all') => {
    if (!address || !canConvert) return;

    try {
      setConverting(true);
      const res = await convertRewardPoints(address, ticketCount, mode);

      setRewardInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tickets: Number(res.ticketsTotal ?? prev.tickets),
          points: Number(res.pointsLeft ?? prev.points),
        };
      });

      openStatusModal(
        REWARD.CONVERT_SUCCESS_TITLE,
        `Your points were converted successfully. You received +${Number(res.ticketsAdded ?? 0)} ticket(s).`,
        'success'
      );
    } catch (error: any) {
      console.error('[Reward] Convert error:', error);
      const msg = getConvertMessageFromError(error);
      openStatusModal(msg.title, msg.text, msg.tone);
    } finally {
      setConverting(false);
    }
  };

  return (
    <Layout>
      <SEO title={SEO_TEXT.REWARDS_TITLE} />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-6">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--navbar-border)] bg-[var(--navbar-bg)]">
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-24"
            style={{ background: 'linear-gradient(90deg, var(--navbar-bg), transparent)' }}
          />
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-24"
            style={{ background: 'linear-gradient(270deg, var(--navbar-bg), transparent)' }}
          />

          <div className="marquee-wrapper group">
            <div className="marquee-track group-hover:[animation-play-state:paused]">
              {winners.concat(winners).map((w, i) => {
                const parts = w.split(' won ');
                const guestPart = parts[0] ?? w;
                const restPart = parts.length > 1 ? ` won ${parts.slice(1).join(' won ')}` : '';
                return (
                  <span
                    key={`${w}_${i}`}
                    className="mx-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                               bg-[var(--card2)]/75 border border-[var(--card-border)]
                               text-[15px] font-semibold leading-snug"
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
                    <span className="font-extrabold text-[var(--primary)]">{guestPart}</span>
                    <span className="text-[var(--primary)]/95">{restPart}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pb-12 pt-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold my-4 text-[var(--primary)] text-center">{SEO_TEXT.REWARDS_TITLE}</h1>

        {/* Dashboard: left = info, right = wheel */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 items-start">

          {/* LEFT */}
          <div className="flex flex-col gap-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Wheel Reward</p>
                <div className="text-xl font-extrabold text-[var(--primary)]">{fmtSol(wheelResult?.value ?? 0)} SOL</div>
                <div className="mt-2 flex justify-center">
                  <button
                    onClick={() => {
                      if (!wheelResult || wheelResult.value <= 0) return;
                      openStatusModal('Claim Successful', `You claimed ${fmtSol(wheelResult.value)} SOL from the Lucky Wheel!`, 'success');
                      setWheelResult(null);
                    }}
                    disabled={!wheelResult || wheelResult.value <= 0}
                    className={`${actionBtnClass} text-xs px-3 py-1.5 ${!wheelResult || wheelResult.value <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    Claim SOL
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
                <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">{REWARD.YOUR_TICKETS}</p>
                <div className="text-xl font-extrabold text-[var(--primary)] mb-1">{tickets}</div>
                <p className="text-[10px] text-gray-500">Daily Quests & Events</p>
              </div>

              <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
                <h3 className="text-[11px] font-bold text-[var(--primary)] mb-1">{REWARD.CONVERT_POINTS}</h3>
                <p className="text-[10px] text-gray-400 mb-2">{REWARD.CURRENT_POINTS}: {points}</p>
                {(convertConfig?.options?.length || convertConfig?.allowAll) ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(convertConfig?.options ?? []).map((opt) => (
                      <button key={opt} onClick={() => handleConvert(opt, 'exact')} disabled={!canConvert || points < opt}
                        className={`btn btn-primary h-7 px-2 text-[10px] font-semibold text-white flex-1 min-w-0 ${!canConvert || points < opt ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {converting ? '…' : `${opt}🎟`}
                      </button>
                    ))}
                    {convertConfig?.allowAll && (
                      <button onClick={() => handleConvert(convertConfig.maxTicketsConvertible || points, 'all')} disabled={!canConvert}
                        className={`btn btn-primary h-7 px-2 text-[10px] font-semibold text-white flex-1 min-w-0 ${!canConvert ? 'opacity-60 cursor-not-allowed' : ''}`}>
                        {converting ? '…' : 'All'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400">Not enough points.</p>
                )}
              </div>
            </div>

            {/* Prize Table */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-bold mb-3 text-[var(--primary)]">Prize Table</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {WHEEL_SEGMENTS.filter((s, i, arr) => arr.findIndex(x => x.label === s.label) === i).map((seg, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl border border-[var(--card-border)]"
                    style={{ background: (seg as any).color + '22' }}>
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                    <span className="text-sm font-semibold" style={{ color: (seg as any).textColor }}>{seg.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* How it Works */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4">
              <h3 className="text-sm font-bold mb-3 text-[var(--primary)]">How it Works</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Each spin costs 1 ticket', 'Click the wheel or SPIN button', 'Wheel spins & lands on a prize', 'Winnings added to claimable SOL', 'Click CLAIM to withdraw'].map((step, i) => (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-[var(--card2)]">
                    <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-extrabold text-white mt-0.5"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}>{i + 1}</span>
                    <span className="text-sm text-gray-400">{step}</span>
                  </div>
                ))}
              </div>
              <p className="text-[var(--primary)] font-semibold text-xs mt-3">Earn tickets from Daily Quests & Trading Volume events!</p>
            </div>
          </div>

          {/* RIGHT: Wheel */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-6 flex flex-col items-center">
            <h3 className="text-sm font-bold mb-4 text-[var(--primary)] self-start">Lucky Wheel</h3>
            <LuckyWheel
              tickets={tickets}
              onSpinComplete={(prize) => {
                setWheelResult(prize);
                if (prize.value > 0) {
                  openStatusModal('You Won!', `🎉 Congratulations! You won ${prize.label}! The prize will be added to your claimable balance.`, 'success');
                } else {
                  openStatusModal('Try Again', 'No luck this time. Spin again for another chance!', 'success');
                }
                setRewardInfo(prev => {
                  if (!prev) return prev;
                  return { ...prev, tickets: Math.max(0, prev.tickets - 1) };
                });
              }}
            />
          </div>
        </div>

        {loading && <p className="mt-4 text-sm text-gray-400 text-center">Loading reward data...</p>}
      </div>

      <StatusModal
        open={statusModal.open}
        title={statusModal.title}
        text={statusModal.text}
        tone={statusModal.tone}
        onClose={() => setStatusModal({ open: false, title: '', text: '', tone: 'success' })}
      />

      <ClaimModal
        open={claimModal.open}
        amountText={`${fmtSol(claimableSol)} SOL`}
        onCancel={() => setClaimModal({ open: false })}
        onConfirm={confirmClaim}
        loading={claiming}
      />

      <style jsx>{`
        .marquee-wrapper {
          position: relative;
          overflow: hidden;
          padding: 12px 0;
        }
        .marquee-track {
          display: inline-block;
          white-space: nowrap;
          animation: marqueeX 90s linear infinite;
          will-change: transform;
          padding-left: 100%;
        }
        @keyframes marqueeX {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </Layout>
  );
};

export default RewardPage;