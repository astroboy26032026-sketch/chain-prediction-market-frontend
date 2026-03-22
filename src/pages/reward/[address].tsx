// src/pages/reward/[address].tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { Buffer } from 'buffer';
import { VersionedTransaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Gift, Trophy } from 'lucide-react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { COMMON, SEO as SEO_TEXT, REWARD } from '@/constants/ui-text';
import {
  claimReward,
  convertRewardPoints,
  getRewardInfo,
  getRewardMarquee,
  getRewardSpinConfig,
  spinReward,
  type RewardInfoResponse,
  type RewardMarqueeItem,
  type RewardSpinConfigResponse,
  type RewardSpinHistoryItem,
} from '@/utils/api';

/* =========================
   CONFIG
========================= */
const FALLBACK_SYMBOLS = ['seed', 'leaf', 'clover', 'flower', 'flame', 'gem', 'star'];
const FALLBACK_MULTIPLIER: Record<string, number> = {
  seed: 1,
  leaf: 1.5,
  clover: 2,
  flower: 3,
  flame: 5,
  gem: 10,
  star: 25,
};
const FALLBACK_REELS = 5;
const FALLBACK_RULE = `# Spin Game Rules

## How to play
- Press SPIN to spin all reels.
- The screen will freeze until the spin completes.

## Winning
- Win if you get 3 or more of the same symbol.
- Symbols do not need to be adjacent.

## Claim
- When you win, SOL is pending.
- Press CLAIM to collect your SOL.`;

const SYMBOL_UI_MAP: Record<string, string> = {
  seed: '🌱',
  leaf: '🌿',
  clover: '🍀',
  flower: '🌼',
  flame: '🔥',
  gem: '💎',
  star: '⭐',
};

const SYMBOL_PX = 84;
const SYMBOL_PX_MOBILE = 56;
const STRIP_REPEAT = 80;
const BASE_CYCLES = 8;
const STOP_GAP_MS = 220;
const STOP_DURATION_MS = 900;
const CLAIM_STATUS_TIMEOUT_MS = 20000;
const CLAIM_STATUS_POLL_MS = 1500;

/** Returns reel size: 56px on mobile (<640px), 84px on desktop */
function useReelSize(): number {
  const [size, setSize] = useState(SYMBOL_PX);
  useEffect(() => {
    const update = () => setSize(window.innerWidth < 640 ? SYMBOL_PX_MOBILE : SYMBOL_PX);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

/* =========================
   UTILS
========================= */
function getTranslateY(el: HTMLElement): number {
  const st = getComputedStyle(el);
  const tr = st.transform || (st as any).webkitTransform || 'none';
  if (tr === 'none') return 0;
  const m = tr.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const parts = m[1].split(',').map((n: string) => parseFloat(n.trim()));
  return parts.length === 6 ? parts[5] : 0;
}

function fmtSol(value: number, min = 3, max = 6): string {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n === 0) return '0.000';
  return n.toLocaleString(undefined, {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

function symbolToUi(symbol: string): string {
  return SYMBOL_UI_MAP[symbol] ?? symbol;
}

function maskUserId(userId: string): string {
  const s = String(userId ?? '').trim();
  if (!s) return 'Guest';
  if (/^guest/i.test(s)) return s;
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

function formatSpinTime(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return input || '-';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function normalizeRuleText(rule: string): string {
  return String(rule ?? '')
    .replace(/^#{1,6}\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\|/g, ' | ')
    .trim();
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

function getSpinMessageFromError(error: any): { title: string; text: string; tone: 'success' | 'error' } {
  const { status, code } = extractErrorInfo(error);

  if (status === 400) {
    if (code.includes('insufficient_tickets')) {
      return {
        title: REWARD.NOT_ENOUGH_TICKETS_TITLE,
        text: REWARD.NOT_ENOUGH_TICKETS_TEXT,
        tone: 'error',
      };
    }
    return {
      title: REWARD.SPIN_INVALID_TITLE,
      text: 'Your spin request could not be processed. Please refresh the page and try again.',
      tone: 'error',
    };
  }

  if (status === 404) {
    return {
      title: 'Reward Account Not Found',
      text: 'We could not find reward data for this wallet address. Please reconnect your wallet and try again.',
      tone: 'error',
    };
  }

  if (status === 429) {
    return {
      title: 'Spin On Cooldown',
      text: 'Your next spin is still on cooldown. Please wait a moment, then try again.',
      tone: 'error',
    };
  }

  if (status === 500) {
    return {
      title: 'Server Error',
      text: 'Something went wrong on the server while spinning. Please try again in a bit.',
      tone: 'error',
    };
  }

  if (status === 503 || code.includes('reward_spin_unavailable')) {
    return {
      title: 'Spin Unavailable',
      text: 'The reward spin system is temporarily unavailable right now. Please try again later.',
      tone: 'error',
    };
  }

  return {
    title: 'Spin Failed',
    text: 'Your spin could not be completed. Please try again.',
    tone: 'error',
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
   REEL COMPONENT
========================= */
function Reel({
  index,
  finalSymbol,
  spinning,
  symbols,
  sizePx = SYMBOL_PX,
}: {
  index: number;
  finalSymbol: string | null;
  spinning: boolean;
  symbols: string[];
  sizePx?: number;
}) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [looping, setLooping] = useState(false);
  const [stopOffset, setStopOffset] = useState<number | null>(null);

  const safeSymbols = symbols.length > 0 ? symbols : FALLBACK_SYMBOLS;

  const repeated = useMemo(
    () => Array.from({ length: STRIP_REPEAT * safeSymbols.length }, (_, i) => safeSymbols[i % safeSymbols.length]),
    [safeSymbols]
  );

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    if (spinning) {
      strip.style.transition = 'none';
      setLooping(true);
      setStopOffset(null);
      return;
    }

    if (finalSymbol) {
      const currentTy = getTranslateY(strip);
      const currentOffset = Math.max(0, -currentTy);
      const currentIndex = Math.floor(currentOffset / sizePx);

      const targetIdx = safeSymbols.indexOf(finalSymbol);
      if (targetIdx < 0) return;

      const cycles = BASE_CYCLES + index;
      const deltaSteps =
        cycles * safeSymbols.length +
        ((targetIdx - (currentIndex % safeSymbols.length) + safeSymbols.length) % safeSymbols.length);

      const totalSymbols = STRIP_REPEAT * safeSymbols.length;
      const totalHeight = totalSymbols * sizePx;

      let targetPx = (currentIndex + deltaSteps) * sizePx;

      while (targetPx <= currentOffset) targetPx += totalHeight;
      targetPx = ((targetPx % totalHeight) + totalHeight) % totalHeight;
      if (targetPx <= currentOffset % totalHeight) targetPx += totalHeight;

      const duration = STOP_DURATION_MS + index * 180;

      setLooping(false);
      requestAnimationFrame(() => {
        if (!stripRef.current) return;
        stripRef.current.style.transition = `transform ${duration}ms cubic-bezier(.12,.72,.08,1)`;
        setStopOffset(targetPx);
      });

      const timer = setTimeout(() => {
        if (stripRef.current) stripRef.current.style.transition = 'none';
      }, duration + 80);
      return () => clearTimeout(timer);
    }
  }, [spinning, finalSymbol, index, safeSymbols]);

  return (
    <div
      className="reel-window shrink-0 bg-[var(--card2)] border border-[var(--card-border)] rounded-2xl shadow-inner overflow-hidden"
      style={{ width: sizePx, height: sizePx }}
    >
      <div
        ref={stripRef}
        className={`reel-strip ${looping ? 'spin-fast' : ''}`}
        style={{ transform: stopOffset != null ? `translateY(-${stopOffset}px)` : undefined }}
      >
        {repeated.map((s, i) => (
          <div key={`${s}_${i}`} className="grid place-items-center" style={{ height: sizePx, fontSize: sizePx * 0.64 }}>
            {symbolToUi(s)}
          </div>
        ))}
      </div>

      <style jsx>{`
        .reel-window {
          position: relative;
        }
        .reel-strip {
          will-change: transform;
        }
        .spin-fast {
          animation: spinY 120ms linear infinite;
        }
        @keyframes spinY {
          from {
            transform: translateY(0);
          }
          to {
            transform: translateY(-${safeSymbols.length * sizePx}px);
          }
        }
      `}</style>
    </div>
  );
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
  { label: '0.1 SOL', value: 0.1, color: '#22c55e' },
  { label: '0.5 SOL', value: 0.5, color: '#3b82f6' },
  { label: '1 SOL', value: 1, color: '#a855f7' },
  { label: '0.05 SOL', value: 0.05, color: '#f59e0b' },
  { label: '5 SOL', value: 5, color: '#ef4444' },
  { label: '0.2 SOL', value: 0.2, color: '#06b6d4' },
  { label: '10 SOL', value: 10, color: '#ec4899' },
  { label: 'Try Again', value: 0, color: '#6b7280' },
  { label: '0.01 SOL', value: 0.01, color: '#84cc16' },
  { label: '50 SOL', value: 50, color: '#f97316' },
  { label: '0.5 SOL', value: 0.5, color: '#8b5cf6' },
  { label: 'Try Again', value: 0, color: '#4b5563' },
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

      // Border
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Label
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(startA + segAngle / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, r * 0.08)}px sans-serif`;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 3;
      ctx.fillText(seg.label, r - 14, 4);
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();
    ctx.strokeStyle = 'var(--primary)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // "SPIN" text in center
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${r * 0.09}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', cx, cy);

    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(201,142,107,0.4)';
    ctx.lineWidth = 6;
    ctx.stroke();

    // Pointer (triangle at top)
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(cx - 12, -8);
    ctx.lineTo(cx + 12, -8);
    ctx.closePath();
    ctx.fillStyle = '#C98E6B';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
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
      <div className="relative" style={{ width: 340, height: 340 }}>
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-[14px] border-r-[14px] border-t-[22px] border-l-transparent border-r-transparent" style={{ borderTopColor: '#C98E6B' }} />
        </div>
        <canvas
          ref={canvasRef}
          width={340}
          height={340}
          className="cursor-pointer"
          onClick={handleSpin}
        />
      </div>

      <button
        onClick={handleSpin}
        disabled={spinning || tickets <= 0}
        className="btn btn-primary mt-6 px-8 py-3 text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {spinning ? 'Spinning...' : tickets <= 0 ? 'No Tickets' : 'SPIN THE WHEEL'}
      </button>

      <p className="text-xs text-gray-400 mt-2">1 ticket per spin</p>
    </div>
  );
};

/* =========================
   MAIN PAGE
========================= */
type HistoryRow = {
  id: string;
  time: string;
  bet: number;
  result: string;
  payoutSol: number;
};

const RewardPage: React.FC = () => {
  const router = useRouter();
  const { connection } = useConnection();
  const wallet = useWallet();

  const address = useMemo(() => {
    const raw = router.query.address;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [router.query.address]);

  // Tab from query param (?tab=wheel)
  const rewardTab = useMemo(() => {
    const t = router.query.tab;
    return t === 'wheel' ? 'wheel' : 'slots';
  }, [router.query.tab]);

  const setRewardTab = (tab: 'slots' | 'wheel') => {
    router.replace({ pathname: router.pathname, query: { ...router.query, tab } }, undefined, { shallow: true });
  };

  const [rewardInfo, setRewardInfo] = useState<RewardInfoResponse | null>(null);
  const [spinConfig, setSpinConfig] = useState<RewardSpinConfigResponse | null>(null);
  const [marqueeItems, setMarqueeItems] = useState<RewardMarqueeItem[]>([]);
  const [wheelResult, setWheelResult] = useState<{ label: string; value: number } | null>(null);

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [converting, setConverting] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [cooldownNow, setCooldownNow] = useState<number>(Date.now());

  const reelSize = useReelSize();
  const symbols = spinConfig?.symbols?.length ? spinConfig.symbols : FALLBACK_SYMBOLS;
  const reels = Number(spinConfig?.reels ?? FALLBACK_REELS) || FALLBACK_REELS;
  const multiplier = spinConfig?.multiplier ?? FALLBACK_MULTIPLIER;
  const rulesText = spinConfig?.rule || FALLBACK_RULE;

  const [finals, setFinals] = useState<(string | null)[]>(Array(reels).fill(null));
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
    setFinals(Array(reels).fill(null));
  }, [reels]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCooldownNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const history = useMemo<HistoryRow[]>(() => {
    const recent = rewardInfo?.recentSpins ?? [];
    return recent.map((item: RewardSpinHistoryItem, idx) => ({
      id: `${item.time}_${idx}`,
      time: formatSpinTime(item.time),
      bet: 1,
      result: item.result.map(symbolToUi).join(''),
      payoutSol: Number(item.payoutSol ?? 0),
    }));
  }, [rewardInfo?.recentSpins]);

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
      const [infoRes, marqueeRes, spinConfigRes] = await Promise.all([
        getRewardInfo(address),
        getRewardMarquee(),
        getRewardSpinConfig(),
      ]);

      setRewardInfo(infoRes);
      setMarqueeItems(Array.isArray(marqueeRes?.items) ? marqueeRes.items : []);
      setSpinConfig(spinConfigRes);
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
  const spinLabel = spinning ? REWARD.SPINNING : cooldownActive ? `COOLDOWN ${formatCountdown(remainingCooldownMs)}` : REWARD.SPIN;

  const canSpin = !loading && !spinning && tickets > 0 && !cooldownActive;
  const canClaim = !loading && !spinning && !claiming && claimableSol > 0;
  const convertConfig = rewardInfo?.convertConfig;
  const canConvert = !loading && !spinning && !converting && points > 0;

  const actionBtnClass = 'btn btn-primary w-[160px] h-10 text-[14px] font-semibold tracking-wide text-white';

  const handleSpin = async () => {
    if (!address || !canSpin) return;

    try {
      const res = await spinReward(address);

      const apiResult = Array.isArray(res.result) ? res.result.slice(0, reels) : [];
      const paddedResult = Array.from({ length: reels }, (_, i) => apiResult[i] ?? symbols[i % symbols.length]);

      setSpinning(true);
      setFinals(Array(reels).fill(null));

      paddedResult.forEach((sym, i) => {
        setTimeout(() => {
          setFinals((prev) => {
            const next = [...prev];
            next[i] = sym;
            return next;
          });
        }, 600 + i * STOP_GAP_MS);
      });

      const totalStop = 600 + (reels - 1) * STOP_GAP_MS + STOP_DURATION_MS + 240;

      setTimeout(() => {
        const nowIso = new Date().toISOString();

        setRewardInfo((prev) => {
          if (!prev) return prev;
          const nextSpin: RewardSpinHistoryItem = {
            time: nowIso,
            result: paddedResult,
            payoutSol: Number(res.payoutSol ?? 0),
          };

          return {
            ...prev,
            tickets: Number(res.ticketsLeft ?? Math.max(prev.tickets - 1, 0)),
            claimableSol: Number(res.claimableSol ?? prev.claimableSol),
            cooldownUntil: String(res.cooldownUntil ?? prev.cooldownUntil ?? ''),
            recentSpins: [nextSpin, ...(prev.recentSpins ?? [])].slice(0, 10),
          };
        });

        if (Number(res.payoutSol ?? 0) > 0) {
          openStatusModal(
            REWARD.SPIN_SUCCESS_TITLE,
            `🎉 Congratulations! You won +${fmtSol(Number(res.payoutSol ?? 0))} SOL.`,
            'success'
          );
        } else {
          openStatusModal(
            REWARD.SPIN_NO_REWARD_TITLE,
            REWARD.SPIN_NO_REWARD_TEXT,
            'success'
          );
        }

        setSpinning(false);
      }, totalStop);
    } catch (error: any) {
      console.error('[Reward] Spin error:', error);
      const msg = getSpinMessageFromError(error);
      openStatusModal(msg.title, msg.text, msg.tone);
    }
  };

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
        <h1 className="text-2xl sm:text-3xl font-extrabold my-6 text-[var(--primary)]">{SEO_TEXT.REWARDS_TITLE}</h1>

        {/* ═══ Tabs: Slot Machine / Lucky Wheel ═══ */}
        <div className="flex bg-[var(--card2)] rounded-xl p-1 mb-8">
          {([
            { key: 'slots' as const, label: 'Slot Machine', icon: <Gift size={16} /> },
            { key: 'wheel' as const, label: 'Lucky Wheel', icon: <Trophy size={16} /> },
          ]).map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setRewardTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                rewardTab === key
                  ? 'text-white shadow-sm'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
              style={rewardTab === key ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {/* Stats row — different per tab */}
        {rewardTab === 'slots' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <div className="card text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Slot Reward</p>
              <div className="text-3xl font-extrabold text-[var(--primary)]">{fmtSol(claimableSol)} SOL</div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={onClaim}
                  disabled={!canClaim}
                  className={`${actionBtnClass} ${!canClaim ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {claiming ? REWARD.CLAIMING : REWARD.CLAIM}
                </button>
              </div>
            </div>

            <div className="card text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">{REWARD.YOUR_TICKETS}</p>
              <div className="text-3xl font-extrabold text-[var(--primary)] mb-4">{tickets}</div>

              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSpin}
                  disabled={!canSpin}
                  className={`${actionBtnClass} ${!canSpin ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {spinLabel}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Lucky Wheel stats — fake data (comment: replace with BE/API when ready) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="card text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Wheel Reward</p>
              <div className="text-3xl font-extrabold text-[var(--primary)]">{fmtSol(wheelResult?.value ?? 0)} SOL</div>
              <div className="mt-4 flex justify-center">
                {/* fake claim — comment: replace with BE/API when ready */}
                <button
                  onClick={() => {
                    if (!wheelResult || wheelResult.value <= 0) return;
                    openStatusModal(
                      'Claim Successful',
                      `You claimed ${fmtSol(wheelResult.value)} SOL from the Lucky Wheel! (Demo mode — BE not connected yet)`,
                      'success'
                    );
                    setWheelResult(null);
                  }}
                  disabled={!wheelResult || wheelResult.value <= 0}
                  className={`${actionBtnClass} ${!wheelResult || wheelResult.value <= 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  Claim SOL
                </button>
              </div>
            </div>

            <div className="card text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Wheel Tickets</p>
              {/* fake — separate ticket pool for wheel (comment: replace with API) */}
              <div className="text-3xl font-extrabold text-[var(--primary)] mb-4">2</div>
              <p className="text-xs text-gray-500">Earned from Trading Volume</p>
            </div>

            <div className="card text-center">
              <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Total Won</p>
              {/* fake total (comment: replace with API) */}
              <div className="text-3xl font-extrabold text-[var(--primary)]">0.000 SOL</div>
              <p className="text-xs text-gray-500">Lifetime wheel winnings</p>
            </div>
          </div>
        )}

        {/* ═══ Slot Machine Tab ═══ */}
        {rewardTab === 'slots' && (
          <>
            <div className="card py-10 flex flex-col items-center justify-center">
              <div className="w-full md:w-auto overflow-x-auto md:overflow-visible">
                <div className="inline-flex flex-nowrap items-center justify-center gap-2 sm:gap-6 px-1">
                  {Array.from({ length: reels }).map((_, i) => (
                    <Reel key={i} index={i} spinning={spinning} finalSymbol={finals[i]} symbols={symbols} sizePx={reelSize} />
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 items-stretch">
              <div className="flex flex-col gap-6">
                <div className="card">
                  <div className="flex flex-col gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-[var(--primary)]">{REWARD.CONVERT_POINTS}</h3>
                      <p className="text-sm text-gray-400 mt-1">{REWARD.CURRENT_POINTS}: {points}</p>
                    </div>

                    {(convertConfig?.options?.length || convertConfig?.allowAll) ? (
                      <div className="grid grid-cols-3 gap-2">
                        {(convertConfig?.options ?? []).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleConvert(opt, 'exact')}
                            disabled={!canConvert || points < opt}
                            className={`btn btn-primary h-9 text-[13px] font-semibold text-white ${!canConvert || points < opt ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {converting ? '...' : `${opt} Ticket${opt > 1 ? 's' : ''}`}
                          </button>
                        ))}
                        {convertConfig?.allowAll && (
                          <button
                            onClick={() => handleConvert(convertConfig.maxTicketsConvertible || points, 'all')}
                            disabled={!canConvert}
                            className={`btn btn-primary h-9 text-[13px] font-semibold text-white ${!canConvert ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            {converting ? '...' : (convertConfig.labelAll || 'All Tickets')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Not enough points to convert tickets.</p>
                    )}
                  </div>
                </div>

                <div className="card flex-1">
                  <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">{REWARD.MULTIPLIERS}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 text-center max-w-[420px]">
                    {symbols.map((key) => (
                      <div key={key} className="bg-[var(--card2)] rounded-lg p-2 border border-[var(--card-border)]">
                        <div className="text-2xl">{symbolToUi(key)}</div>
                        <div className="text-[11px] text-gray-400 truncate">{key}</div>
                        <div className="text-xs text-gray-400">x{Number(multiplier[key] ?? 0)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card h-full">
                <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">{REWARD.RULES}</h3>
                <div className="text-xs leading-relaxed text-gray-400 whitespace-pre-wrap break-words">
                  {normalizeRuleText(rulesText)}
                </div>
              </div>
            </div>

            <div className="card mt-6">
              <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">{REWARD.HISTORY}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm min-w-[360px]">
                  <thead>
                    <tr className="text-left text-gray-400">
                      <th className="py-2 pr-2 sm:pr-4">Time</th>
                      <th className="py-2 pr-2 sm:pr-4">Bet</th>
                      <th className="py-2 pr-2 sm:pr-4">Result</th>
                      <th className="py-2 pr-2 sm:pr-4">Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length ? (
                      history.map((h) => (
                        <tr key={h.id} className="border-t border-[var(--card-border)]">
                          <td className="py-2 pr-2 sm:pr-4">{h.time}</td>
                          <td className="py-2 pr-2 sm:pr-4">{h.bet}</td>
                          <td className="py-2 pr-2 sm:pr-4 font-semibold">{h.result}</td>
                          <td className="py-2 pr-2 sm:pr-4">{fmtSol(h.payoutSol)} SOL</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-[var(--card-border)]">
                        <td className="py-4 text-gray-400" colSpan={4}>
                          {REWARD.NO_SPINS}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ═══ Lucky Wheel Tab ═══ */}
        {rewardTab === 'wheel' && (
          <>
            <div className="card py-10 flex flex-col items-center justify-center">
              <LuckyWheel
                tickets={tickets}
                onSpinComplete={(prize) => {
                  setWheelResult(prize);
                  if (prize.value > 0) {
                    openStatusModal(
                      'You Won!',
                      `🎉 Congratulations! You won ${prize.label}! The prize will be added to your claimable balance.`,
                      'success'
                    );
                  } else {
                    openStatusModal(
                      'Try Again',
                      'No luck this time. Spin again for another chance!',
                      'success'
                    );
                  }
                  // Deduct ticket locally — do NOT touch claimableSol (that belongs to slot machine API)
                  setRewardInfo(prev => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      tickets: Math.max(0, prev.tickets - 1),
                    };
                  });
                }}
              />
            </div>

            {/* Wheel prizes info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="card">
                <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">Prize Table</h3>
                <div className="grid grid-cols-2 gap-2">
                  {WHEEL_SEGMENTS.filter((s, i, arr) =>
                    arr.findIndex(x => x.label === s.label) === i
                  ).map((seg, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--card2)] border border-[var(--card-border)]">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-sm text-gray-300 font-semibold">{seg.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">How it Works</h3>
                <div className="space-y-2 text-sm text-gray-400">
                  <p>1. Each spin costs <strong className="text-white">1 ticket</strong></p>
                  <p>2. Click the wheel or the SPIN button to start</p>
                  <p>3. The wheel spins and lands on a random prize</p>
                  <p>4. Winnings are added to your claimable SOL balance</p>
                  <p>5. Click <strong className="text-white">CLAIM</strong> to withdraw to your wallet</p>
                  <p className="text-[var(--primary)] font-semibold mt-3">Earn tickets from Daily Quests & Trading Volume events!</p>
                </div>
              </div>
            </div>

            {/* Convert points section for wheel tab too */}
            <div className="card mt-6">
              <div className="flex flex-col gap-4">
                <div>
                  <h3 className="text-lg font-bold text-[var(--primary)]">{REWARD.CONVERT_POINTS}</h3>
                  <p className="text-sm text-gray-400 mt-1">{REWARD.CURRENT_POINTS}: {points}</p>
                </div>

                {(convertConfig?.options?.length || convertConfig?.allowAll) ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(convertConfig?.options ?? []).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => handleConvert(opt, 'exact')}
                        disabled={!canConvert || points < opt}
                        className={`btn btn-primary h-9 text-[13px] font-semibold text-white ${!canConvert || points < opt ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {converting ? '...' : `${opt} Ticket${opt > 1 ? 's' : ''}`}
                      </button>
                    ))}
                    {convertConfig?.allowAll && (
                      <button
                        onClick={() => handleConvert(convertConfig.maxTicketsConvertible || points, 'all')}
                        disabled={!canConvert}
                        className={`btn btn-primary h-9 text-[13px] font-semibold text-white ${!canConvert ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {converting ? '...' : (convertConfig.labelAll || 'All Tickets')}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Not enough points to convert tickets.</p>
                )}
              </div>
            </div>
          </>
        )}

        {loading && <p className="mt-4 text-sm text-gray-400">Loading reward data...</p>}
      </div>

      {spinning && (
        <div
          className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px] cursor-wait"
          style={{ pointerEvents: 'auto' }}
          aria-hidden="true"
        />
      )}

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