import React, { useMemo, useRef, useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';

/* =========================
   CONFIG
========================= */
const SYMBOLS = ['🌱', '🌿', '🌳', '🍀', '🌼'] as const;

// Multiplier 1..5
const MULTIPLIER: Record<string, number> = { '🌱': 1, '🌿': 2, '🌳': 3, '🍀': 4, '🌼': 5 };

const REELS = 5;
const SYMBOL_PX = 84;
const STRIP_REPEAT = 80;
const BASE_CYCLES = 8;
const STOP_GAP_MS = 220;
const STOP_DURATION_MS = 900;

/* Precision: micro-SOL (6 decimals) */
const DECIMALS = 6;
const BASE_REWARD_MICRO = 1000;     // 0.001 SOL
const JACKPOT_MICRO = 10000;        // 0.01 SOL

/* =========================
   UTILS
========================= */
function getTranslateY(el: HTMLElement): number {
  const st = getComputedStyle(el);
  const tr = st.transform || (st as any).webkitTransform || 'none';
  if (tr === 'none') return 0;
  const m = tr.match(/matrix\(([^)]+)\)/);
  if (!m) return 0;
  const parts = m[1].split(',').map((n) => parseFloat(n.trim()));
  return parts.length === 6 ? parts[5] : 0; // matrix(a,b,c,d,tx,ty) -> ty
}

// Display format
const fmtDisplay = (micro: number) => {
  if (micro === 0) return '0.000';
  const s = (micro / 10 ** DECIMALS).toFixed(DECIMALS)
    .replace(/0+$/,'')
    .replace(/\.$/, '');
  return s;
};
const fmtSOL = (micro: number) => (micro / 10 ** DECIMALS).toFixed(DECIMALS);

/**
 * Payout theo TẦN SUẤT (không cần liên tiếp):
 * - 5 of a kind -> JACKPOT (0.01 SOL)
 * - 4 of a kind -> 0.001 * multiplier(symbol)
 * - 3 of a kind -> 0.001 * multiplier(symbol)
 * Nếu nhiều symbol cùng thỏa (>=3), chọn multiplier cao hơn.
 */
function computePayoutMicro(symbols: string[]): number {
  const counts: Record<string, number> = {};
  for (const s of symbols) counts[s] = (counts[s] ?? 0) + 1;

  let bestSymbol: string | null = null;
  let bestCount = 0;

  for (const s of Object.keys(counts)) {
    const c = counts[s];
    if (c > bestCount) {
      bestCount = c;
      bestSymbol = s;
    } else if (c === bestCount && c >= 3 && bestSymbol) {
      if (MULTIPLIER[s] > MULTIPLIER[bestSymbol]) bestSymbol = s;
    }
  }

  if (!bestSymbol) return 0;

  if (bestCount >= 5) return JACKPOT_MICRO;
  if (bestCount === 4) return BASE_REWARD_MICRO * MULTIPLIER[bestSymbol];
  if (bestCount === 3) return BASE_REWARD_MICRO * MULTIPLIER[bestSymbol];
  return 0;
}

/* =========================
   REEL COMPONENT
========================= */
function Reel({
  index,
  finalSymbol,
  spinning,
}: { index: number; finalSymbol: string | null; spinning: boolean; }) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [looping, setLooping] = useState(false);
  const [stopOffset, setStopOffset] = useState<number | null>(null);

  const repeated = useMemo(
    () => Array.from({ length: STRIP_REPEAT }, (_, i) => SYMBOLS[i % SYMBOLS.length]),
    []
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
      const currentIndex = Math.floor(currentOffset / SYMBOL_PX);

      const targetIdx = SYMBOLS.indexOf(finalSymbol as any);
      const cycles = BASE_CYCLES + index;

      const deltaSteps =
        cycles * SYMBOLS.length +
        ((targetIdx - (currentIndex % SYMBOLS.length) + SYMBOLS.length) % SYMBOLS.length);

      const totalSymbols = STRIP_REPEAT * SYMBOLS.length;
      const totalHeight = totalSymbols * SYMBOL_PX;

      let targetPx = (currentIndex + deltaSteps) * SYMBOL_PX;

      // Clamp + wrap
      while (targetPx <= currentOffset) targetPx += totalHeight;
      targetPx = ((targetPx % totalHeight) + totalHeight) % totalHeight;
      if (targetPx <= (currentOffset % totalHeight)) targetPx += totalHeight;

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
  }, [spinning, finalSymbol, index]);

  return (
    <div
      className="reel-window shrink-0 bg-[var(--card2)] border border-[var(--card-border)] rounded-2xl shadow-inner overflow-hidden"
      style={{ width: SYMBOL_PX, height: SYMBOL_PX }}
    >
      <div
        ref={stripRef}
        className={`reel-strip ${looping ? 'spin-fast' : ''}`}
        style={{ transform: stopOffset != null ? `translateY(-${stopOffset}px)` : undefined }}
      >
        {repeated.map((s, i) => (
          <div key={i} className="grid place-items-center text-[54px]" style={{ height: SYMBOL_PX }}>
            {s}
          </div>
        ))}
      </div>

      <style jsx>{`
        .reel-window { position: relative; }
        .reel-strip { will-change: transform; }
        .spin-fast { animation: spinY 120ms linear infinite; }
        @keyframes spinY {
          from { transform: translateY(0); }
          to   { transform: translateY(-${SYMBOLS.length * SYMBOL_PX}px); }
        }
      `}</style>
    </div>
  );
}

/* =========================
   TROPHY SVG (đổi CAM → XANH)
========================= */
const TrophySVG: React.FC = () => (
  <svg width="112" height="112" viewBox="0 0 112 112" fill="none" aria-hidden="true">
    <defs>
      {/* thân cúp: xanh lá đậm → nhạt */}
      <linearGradient id="tgrad" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
        <stop stopColor="#22C55E"/>
        <stop offset="1" stopColor="#16A34A"/>
      </linearGradient>
      {/* tim: xanh nhạt */}
      <linearGradient id="hgrad" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#A7F3D0"/>
        <stop offset="1" stopColor="#6EE7B7"/>
      </linearGradient>
    </defs>
    <g filter="url(#f1)">
      <path d="M32 18h48v12a20 20 0 0 1-20 20h-8a20 20 0 0 1-20-20V18Z" fill="url(#tgrad)"/>
      <path d="M42 52h28v8a14 14 0 0 1-14 14h0A14 14 0 0 1 42 60v-8Z" fill="url(#tgrad)"/>
      <rect x="48" y="74" width="16" height="10" rx="3" fill="url(#tgrad)"/>
      <rect x="38" y="86" width="36" height="8" rx="3" fill="url(#tgrad)"/>
      <path d="M32 24H18c0 13 8 22 20 22" stroke="url(#tgrad)" strokeWidth="6" strokeLinecap="round"/>
      <path d="M80 24h14c0 13-8 22-20 22" stroke="url(#tgrad)" strokeWidth="6" strokeLinecap="round"/>
    </g>
    {/* hearts */}
    <path d="M56 6c4-6 12-2 10 5-1 3-6 7-10 10-4-3-9-7-10-10-2-7 6-11 10-5Z" fill="url(#hgrad)"/>
    <path d="M86 10c3-4 9-1 8 4-1 2-4 5-8 7-3-2-6-5-8-7-1-5 5-8 8-4Z" fill="url(#hgrad)" opacity=".75"/>
    <path d="M28 12c3-4 9-1 8 4-1 2-4 5-8 7-3-2-6-5-8-7-1-5 5-8 8-4Z" fill="url(#hgrad)" opacity=".6"/>
    <defs>
      <filter id="f1" x="0" y="0" width="112" height="112" filterUnits="userSpaceOnUse">
        <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000" floodOpacity=".15"/>
      </filter>
    </defs>
  </svg>
);

/* =========================
   MESSAGE BOXES (nền ĐẶC, nút = var(--primary))
========================= */
type WinModalProps = {
  open: boolean;
  text: string;
  onClose: () => void;
};
const WinModal: React.FC<WinModalProps> = ({ open, text, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center">
      {/* overlay tối nhẹ, giữ mờ nền sau – box sẽ đặc */}
      <div className="absolute inset-0 bg-black/50" />
      <div
        role="dialog" aria-modal="true"
        className="relative z-10 w-[min(92vw,520px)] rounded-[28px]
                   bg-[var(--card)] border border-[var(--card-border)]
                   shadow-[0_20px_70px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        <div className="p-8">
          <div className="grid place-items-center mb-5">
            <TrophySVG />
          </div>
          <h4 className="text-2xl font-extrabold text-[var(--primary)] text-center mb-1">
            Congratulations!
          </h4>
          {/* giữ nguyên nội dung */}
          <p className="text-center text-[15px] text-[var(--foreground)]/90 mb-6">{text}</p>

          {/* buttons: màu đồng bộ var(--primary) */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onClose}
              className="w-[220px] h-11 rounded-full font-semibold text-[15px]
                         bg-[var(--primary)] hover:bg-[var(--primary)]/90
                         text-black transition-colors"
            >
              Share results
            </button>
            <button
              onClick={onClose}
              className="w-[220px] h-11 rounded-full font-semibold text-[15px]
                         border border-[var(--primary)]/50
                         text-[var(--primary)] hover:bg-[var(--card2)]/60 transition-colors"
            >
              Ignore
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

type ClaimModalProps = {
  open: boolean;
  amountText: string;   // “… claim X SOL”
  onCancel: () => void;
  onConfirm: () => void;
};
const ClaimModal: React.FC<ClaimModalProps> = ({ open, amountText, onCancel, onConfirm }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center">
      <div className="absolute inset-0 bg-black/50" />
      <div
        role="dialog" aria-modal="true"
        className="relative z-10 w-[min(92vw,520px)] rounded-[28px]
                   bg-[var(--card)] border border-[var(--card-border)]
                   shadow-[0_20px_70px_rgba(0,0,0,0.35)] overflow-hidden"
      >
        <div className="p-8">
          <div className="grid place-items-center mb-5">
            <TrophySVG />
          </div>
          <h4 className="text-2xl font-extrabold text-[var(--primary)] text-center mb-1">
            Claim Reward
          </h4>
          {/* giữ nguyên nội dung */}
          <p className="text-center text-[15px] text-[var(--foreground)]/90 mb-6">
            You are about to claim <strong>{amountText}</strong>.
          </p>

          {/* buttons: màu đồng bộ var(--primary) */}
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onConfirm}
              className="w-[220px] h-11 rounded-full font-semibold text-[15px]
                         bg-[var(--primary)] hover:bg-[var(--primary)]/90
                         text-black transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={onCancel}
              className="w-[220px] h-11 rounded-full font-semibold text-[15px]
                         border border-[var(--primary)]/50
                         text-[var(--primary)] hover:bg-[var(--card2)]/60 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================
   MAIN PAGE
========================= */
type HistoryItem = {
  id: string;
  time: string;
  bet: number;
  result: string;
  payoutMicro: number;
};

const RewardPage: React.FC = () => {
  // micro-SOL
  const [rewardMicro, setRewardMicro] = useState<number>(0);
  const [tickets, setTickets] = useState(5);
  const [betTickets, setBetTickets] = useState(0);

  const [spinning, setSpinning] = useState(false);
  const [finals, setFinals] = useState<(string | null)[]>(Array(REELS).fill(null));

  // Modals – giữ nguyên nội dung text
  const [winModal, setWinModal] = useState<{ open: boolean; text: string }>(
    { open: false, text: '' }
  );
  const [claimModal, setClaimModal] = useState<{ open: boolean }>(
    { open: false }
  );

  // History
  const [history, setHistory] = useState<HistoryItem[]>([
    { id: 'seed1', time: '12:00:00', bet: 1, result: '🌱🌱🌱', payoutMicro: 1000 },
    { id: 'seed2', time: '12:05:00', bet: 2, result: '🌿🌿🌿🌿', payoutMicro: 2000 * 2 },
    { id: 'seed3', time: '12:10:00', bet: 3, result: '🌳🌳🌳', payoutMicro: 3000 },
  ]);

  useEffect(() => {
    setBetTickets((n) => Math.max(0, Math.min(n, tickets)));
  }, [tickets]);

  // Fake marquee
  const winners = useMemo(
    () => [
      'Guest #9308943 bet 1 ticket won 0.003916 SOL 5d ago',
      'Guest #4472019 bet 2 tickets won 0.001000 SOL 2d ago',
      'Guest #1183420 bet 3 tickets won 0.005102 SOL 1h ago',
      'Guest #7720103 bet 1 ticket won 0.001000 SOL 12m ago',
      'Guest #5520021 bet 5 tickets won 0.007451 SOL 3d ago',
      'Guest #3348901 bet 1 ticket won 0.001000 SOL 8h ago',
    ],
    []
  );

  const decBet = () => setBetTickets((n) => Math.max(0, n - 1));
  const incBet = () => setBetTickets((n) => Math.min(tickets, n + 1));

  const spin = () => {
    if (spinning || tickets < betTickets || betTickets <= 0) return;
    setSpinning(true);
    setFinals(Array(REELS).fill(null));
    setTickets((t) => Math.max(0, t - betTickets));

    const chosen = Array.from({ length: REELS }, () => SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);

    chosen.forEach((sym, i) => {
      setTimeout(() => {
        setFinals((prev) => { const c = [...prev]; c[i] = sym; return c; });
      }, 600 + i * STOP_GAP_MS);
    });

    const totalStop = 600 + (REELS - 1) * STOP_GAP_MS + STOP_DURATION_MS + 240;

    setTimeout(() => {
      const gainMicro = computePayoutMicro(chosen);

      if (gainMicro > 0) {
        setRewardMicro((v) => v + gainMicro);
        setWinModal({
          open: true,
          text: `🎉 Congratulations! You won +${fmtDisplay(gainMicro)} SOL`,
        });
      }

      // Append history (client time)
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const tstr = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

      setHistory((h) => [
        {
          id: `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
          time: tstr,
          bet: betTickets,
          result: chosen.join(''),
          payoutMicro: gainMicro,
        },
        ...h.slice(0, 49),
      ]);

      setSpinning(false);
    }, totalStop);
  };

  const onClaim = () => {
    if (rewardMicro === 0 || spinning) return;
    setClaimModal({ open: true });
  };

  const confirmClaim = () => {
    setClaimModal({ open: false });
    alert(`Claimed ${fmtDisplay(rewardMicro)} SOL`);
    setRewardMicro(0);
  };

  const canSpin = !spinning && tickets >= betTickets && betTickets > 0;
  const canClaim = rewardMicro > 0 && !spinning;

  return (
    <Layout>
      {/* SEO: Title tab */}
      <SEO title="Rewards" />

      {/* ===== Winners Marquee ===== */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10 pt-6">
        <div className="relative overflow-hidden rounded-2xl border border-[var(--navbar-border)] bg-[var(--navbar-bg)]">
          {/* fades */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-24" style={{ background: 'linear-gradient(90deg, var(--navbar-bg), transparent)' }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-24" style={{ background: 'linear-gradient(270deg, var(--navbar-bg), transparent)' }} />

          <div className="marquee-wrapper group">
            <div className="marquee-track group-hover:[animation-play-state:paused]">
              {winners.concat(winners).map((w, i) => {
                const m = w.match(/(Guest\s*#\d+)(.*)/);
                const guestPart = m ? m[1] : w;
                const restPart = m ? m[2] : '';
                return (
                  <span
                    key={i}
                    className="mx-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                               bg-[var(--card2)]/75 border border-[var(--card-border)]
                               text-[15px] font-semibold leading-snug"
                  >
                    <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
                    {/* Guest + id: màu giống text Reward (primary) */}
                    <span className="font-extrabold text-[var(--primary)]">{guestPart}</span>
                    <span className="text-[var(--primary)]/95">{restPart}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Main ===== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pb-12 pt-6">
        {/* Title LEFT */}
        <h1 className="text-2xl sm:text-3xl font-extrabold my-6 text-[var(--primary)]">
          Rewards
        </h1>

        {/* Reward + Tickets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <div className="card text-center">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Reward</p>
            <div className="text-3xl font-extrabold text-[var(--primary)]">
              {fmtDisplay(rewardMicro)} SOL
            </div>
            <button
              onClick={onClaim}
              disabled={!canClaim}
              className={`btn-primary mt-4 ${!canClaim ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              CLAIM
            </button>
          </div>

          <div className="card text-center">
            <p className="text-xs uppercase tracking-wider text-gray-400 mb-2">Your Tickets</p>
            <div className="text-3xl font-extrabold text-[var(--primary)] mb-3">{tickets}</div>
            <div className="flex justify-center items-center gap-3 mb-4">
              <button
                className="btn-secondary w-10 h-10 grid place-items-center"
                onClick={decBet}
                disabled={spinning || betTickets <= 0}
              >−</button>

              <div className="w-16 h-10 grid place-items-center rounded-lg border border-[var(--card-border)] bg-[var(--card2)] font-bold select-none">
                {betTickets}
              </div>

              <button
                className="btn-secondary w-10 h-10 grid place-items-center"
                onClick={incBet}
                disabled={spinning || betTickets >= tickets}
              >+</button>
            </div>
            <button onClick={spin} disabled={!canSpin} className={`btn-primary w-full ${!canSpin ? 'opacity-60 cursor-not-allowed' : ''}`}>
              {spinning ? 'SPINNING…' : 'BET'}
            </button>
          </div>
        </div>

        {/* Slot Machine – 5 reels */}
        <div className="card py-10 flex flex-col items-center justify-center">
          <div className="w-full md:w-auto overflow-x-auto md:overflow-visible">
            <div className="inline-flex flex-nowrap items-center justify-center gap-4 sm:gap-6 px-1">
              {Array.from({ length: REELS }).map((_, i) => (
                <Reel key={i} index={i} spinning={spinning} finalSymbol={finals[i]} />
              ))}
            </div>
          </div>
        </div>

        {/* Multipliers + Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <div className="card">
            <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">Multipliers</h3>
            <div className="grid grid-cols-5 gap-3 text-center">
              {Object.entries(MULTIPLIER).map(([k, v]) => (
                <div key={k} className="bg-[var(--card2)] rounded-lg p-2 border border-[var(--card-border)]">
                  <div className="text-2xl">{k}</div>
                  <div className="text-xs text-gray-400">x{v}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">Rules</h3>
            <ul className="text-xs leading-relaxed text-gray-400 list-disc pl-5">
              <li>Press <strong>BET</strong> to spin all 5 reels.</li>
              <li>The screen will <strong>freeze</strong> until the spin completes.</li>
              <li>Single payout per spin if you have <strong>3+</strong> of the same symbol (not required to be adjacent).</li>
              <li>3 or 4 of a kind → reward = <strong>0.001 SOL × symbol multiplier</strong>.</li>
              <li>5 of a kind → reward = <strong>0.01 SOL</strong> (ignores multiplier).</li>
              <li>Press <strong>CLAIM</strong> to collect your SOL.</li>
            </ul>
          </div>
        </div>

        {/* History */}
        <div className="card mt-6">
          <h3 className="text-lg font-bold mb-3 text-[var(--primary)]">History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Bet</th>
                  <th className="py-2 pr-4">Result</th>
                  <th className="py-2 pr-4">Payout</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-[var(--card-border)]">
                    <td className="py-2 pr-4">{h.time}</td>
                    <td className="py-2 pr-4">{h.bet}</td>
                    <td className="py-2 pr-4 font-semibold">{h.result}</td>
                    <td className="py-2 pr-4">{fmtDisplay(h.payoutMicro)} SOL</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Freeze overlay */}
      {spinning && (
        <div
          className="fixed inset-0 z-[60] bg-black/35 backdrop-blur-[1px] cursor-wait"
          style={{ pointerEvents: 'auto' }}
          aria-hidden="true"
        />
      )}

      {/* Message Boxes (solid) */}
      <WinModal
        open={winModal.open}
        text={winModal.text}
        onClose={() => setWinModal({ open: false, text: '' })}
      />
      <ClaimModal
        open={claimModal.open}
        amountText={`${fmtDisplay(rewardMicro)} SOL`}
        onCancel={() => setClaimModal({ open: false })}
        onConfirm={confirmClaim}
      />

      {/* Styles cho marquee */}
      <style jsx>{`
        .marquee-wrapper { position: relative; overflow: hidden; padding: 12px 0; }
        .marquee-track {
          display: inline-block;
          white-space: nowrap;
          animation: marqueeX 23s linear infinite;
          will-change: transform;
          padding-left: 100%;
        }
        @keyframes marqueeX {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </Layout>
  );
};

export default RewardPage;
