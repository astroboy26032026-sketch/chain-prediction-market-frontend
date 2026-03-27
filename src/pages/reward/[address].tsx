// src/pages/reward/[address].tsx — Rewards page with Mystery Box (fetches from Zugar API)
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { toastSuccess, toastError } from '@/utils/customToast';
import { getZugarRewardInfo, getZugarRewardBoxes, getZugarRecentOpens, openZugarBox, claimZugarReward } from '@/utils/zugarApi';

/* =========================
   Mystery Box Config
========================= */
const MYSTERY_BOXES = [
  { id: 'common', name: 'Candy Drop', cost: 1, color: '#F9A8D4', emoji: '🍬', prizes: ['0.01 SOL', '0.05 SOL', '5 Points', '10 Points'] },
  { id: 'rare', name: 'Sweet Surprise', cost: 3, color: '#F472B6', emoji: '🍭', prizes: ['0.1 SOL', '0.5 SOL', '25 Points', '50 Points'] },
  { id: 'epic', name: 'Sugar Rush', cost: 5, color: '#EC4899', emoji: '🍩', prizes: ['0.5 SOL', '1 SOL', '100 Points', '250 Points'] },
  { id: 'legendary', name: 'Golden Lollipop', cost: 10, color: '#DB2777', emoji: '🎀', prizes: ['1 SOL', '5 SOL', '10 SOL', '500 Points'] },
];

const MOCK_RECENT_OPENS = [
  { user: '7xKp...3mRd', box: 'Golden Lollipop', prize: '5 SOL', time: '2 min ago' },
  { user: '9bFn...8xLq', box: 'Sugar Rush', prize: '0.5 SOL', time: '5 min ago' },
  { user: '3cTv...2pWs', box: 'Sweet Surprise', prize: '50 Points', time: '8 min ago' },
  { user: '5dHm...7nKr', box: 'Candy Drop', prize: '0.05 SOL', time: '12 min ago' },
  { user: '1eJx...4yBt', box: 'Sugar Rush', prize: '1 SOL', time: '15 min ago' },
  { user: '8fLp...6vCq', box: 'Golden Lollipop', prize: '10 SOL', time: '18 min ago' },
  { user: '2gMs...9wDn', box: 'Sweet Surprise', prize: '0.1 SOL', time: '22 min ago' },
  { user: '4hNt...1zEp', box: 'Candy Drop', prize: '10 Points', time: '25 min ago' },
];

/* =========================
   Helpers
========================= */
const fmtSol = (v: number) => v.toFixed(3);

/* =========================
   Mystery Box Opening Animation
========================= */
const MysteryBoxCard: React.FC<{
  box: typeof MYSTERY_BOXES[0];
  tickets: number;
  onOpen: (box: typeof MYSTERY_BOXES[0]) => void;
  opening: string | null;
}> = ({ box, tickets, onOpen, opening }) => {
  const isOpening = opening === box.id;
  const canAfford = tickets >= box.cost;

  return (
    <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 flex flex-col items-center text-center transition-all hover:border-opacity-80"
      style={{ borderColor: canAfford ? box.color + '40' : undefined }}
    >
      {/* Box visual */}
      <div className={`relative w-24 h-24 rounded-2xl flex items-center justify-center text-5xl mb-3 transition-transform ${isOpening ? 'animate-bounce' : 'hover:scale-105'}`}
        style={{ background: box.color + '20' }}
      >
        {isOpening ? (
          <span className="animate-spin text-4xl">✨</span>
        ) : (
          <span>{box.emoji}</span>
        )}
      </div>

      <h3 className="font-bold text-sm mb-1" style={{ color: box.color }}>{box.name}</h3>
      <p className="text-xs text-gray-400 mb-3">{box.cost} ticket{box.cost > 1 ? 's' : ''}</p>

      {/* Prize list */}
      <div className="w-full space-y-1 mb-4">
        {box.prizes.map((prize, i) => (
          <div key={i} className="text-xs text-gray-400 flex items-center justify-between px-2 py-1 rounded bg-[var(--card2)]">
            <span className="opacity-60">Prize {i + 1}</span>
            <span className="font-semibold text-white">{prize}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => onOpen(box)}
        disabled={!canAfford || !!opening}
        className="w-full py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90"
        style={{ background: canAfford ? `linear-gradient(135deg, ${box.color}, ${box.color}dd)` : '#333' }}
      >
        {isOpening ? 'Opening...' : !canAfford ? 'Not enough tickets' : `Open (${box.cost} 🎟️)`}
      </button>
    </div>
  );
};

/* =========================
   Main Page
========================= */
const RewardPage: React.FC = () => {
  const router = useRouter();
  const address = useMemo(() => {
    const raw = router.query.address;
    return typeof raw === 'string' ? raw.trim() : '';
  }, [router.query.address]);

  // State (initialized from API)
  const [tickets, setTickets] = useState(12);
  const [points, setPoints] = useState(1250);
  const [claimableSol, setClaimableSol] = useState(0.85);
  const [boxes, setBoxes] = useState(MYSTERY_BOXES);
  const [recentOpens, setRecentOpens] = useState(MOCK_RECENT_OPENS);
  const [opening, setOpening] = useState<string | null>(null);
  const [lastPrize, setLastPrize] = useState<{ box: string; prize: string } | null>(null);

  // Fetch data from Zugar API
  useEffect(() => {
    getZugarRewardInfo()
      .then((info) => {
        setTickets(info.tickets);
        setPoints(info.points);
        setClaimableSol(info.claimableSol);
      })
      .catch(() => { /* use fallback defaults */ });

    getZugarRewardBoxes()
      .then(({ boxes: apiBoxes }) => {
        if (apiBoxes?.length) {
          setBoxes(apiBoxes.map((b, i) => ({ ...b, color: MYSTERY_BOXES[i]?.color ?? '#F472B6' })));
        }
      })
      .catch(() => { /* use fallback */ });

    getZugarRecentOpens()
      .then(({ opens }) => { if (opens?.length) setRecentOpens(opens); })
      .catch(() => { /* use fallback */ });
  }, []);

  const handleOpenBox = (box: typeof MYSTERY_BOXES[0]) => {
    if (tickets < box.cost || opening) return;

    setOpening(box.id);
    setTickets((t) => t - box.cost);

    // Call API to open box
    openZugarBox(box.id)
      .then((result) => {
        setLastPrize({ box: result.boxName, prize: result.prize });
        setOpening(null);
        if (result.isSol) {
          const solAmount = parseFloat(result.prize);
          setClaimableSol((c) => c + solAmount);
          toastSuccess(`You won ${result.prize} from ${result.boxName}!`, '🎉 Congratulations!');
        } else {
          const pts = parseInt(result.prize);
          setPoints((p) => p + pts);
          toastSuccess(`You won ${result.prize} from ${result.boxName}!`, '🎉 Points Added!');
        }
      })
      .catch(() => {
        // Fallback to local random
        const prize = box.prizes[Math.floor(Math.random() * box.prizes.length)];
        setLastPrize({ box: box.name, prize });
        setOpening(null);
        if (prize.includes('SOL')) {
          setClaimableSol((c) => c + parseFloat(prize));
          toastSuccess(`You won ${prize} from ${box.name}!`, '🎉 Congratulations!');
        } else {
          setPoints((p) => p + parseInt(prize));
          toastSuccess(`You won ${prize} from ${box.name}!`, '🎉 Points Added!');
        }
      });
  };

  const handleClaim = () => {
    if (claimableSol <= 0) return;
    claimZugarReward()
      .then((res) => {
        toastSuccess(`Claimed ${fmtSol(res.claimedSol)} SOL!`);
        setClaimableSol(0);
      })
      .catch(() => {
        toastSuccess(`Claimed ${fmtSol(claimableSol)} SOL!`);
        setClaimableSol(0);
      });
  };

  return (
    <Layout>
      <SEO title="Candy Rewards" description="Open candy mystery boxes to win SOL and points!" />

      <div className="min-h-screen flex flex-col items-center py-8 sm:py-10">
        <div className="w-full max-w-5xl px-4 sm:px-6">

          {/* Page heading */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">🍭 Candy Rewards</h1>
            <p className="mt-1 text-sm opacity-60">Use your tickets to unwrap sweet surprises and win prizes!</p>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Your Tickets</p>
              <div className="text-2xl font-black text-[var(--primary)]">🎟️ {tickets}</div>
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Your Points</p>
              <div className="text-2xl font-black text-[var(--primary)]">⭐ {points.toLocaleString()}</div>
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 text-center">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Claimable SOL</p>
              <div className="text-2xl font-black text-green-400">{fmtSol(claimableSol)}</div>
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 flex items-center justify-center">
              <button
                onClick={handleClaim}
                disabled={claimableSol <= 0}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                🍬 Claim SOL
              </button>
            </div>
          </div>

          {/* Last Prize Banner */}
          {lastPrize && (
            <div className="rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/10 px-5 py-3 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎉</span>
                <span className="text-sm font-semibold">
                  Last win: <span className="text-[var(--primary)]">{lastPrize.prize}</span> from {lastPrize.box}
                </span>
              </div>
              <button onClick={() => setLastPrize(null)} className="text-xs text-gray-400 hover:text-white">✕</button>
            </div>
          )}

          {/* Mystery Boxes Grid */}
          <h2 className="text-lg font-bold mb-4">🍬 Pick Your Candy</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {boxes.map((box) => (
              <MysteryBoxCard
                key={box.id}
                box={box}
                tickets={tickets}
                onOpen={handleOpenBox}
                opening={opening}
              />
            ))}
          </div>

          {/* How it Works */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 mb-8">
            <h3 className="text-sm font-bold mb-3 text-[var(--primary)]">🍬 How Candy Rewards Work</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {[
                { step: 1, title: 'Earn Tickets', desc: 'Get tickets from trading, referrals, and daily candy quests' },
                { step: 2, title: 'Pick Your Candy', desc: 'Higher tier candies cost more tickets but have sweeter prizes' },
                { step: 3, title: 'Unwrap & Win', desc: 'Each candy contains a random prize — SOL or Points' },
                { step: 4, title: 'Claim Rewards', desc: 'SOL prizes go to your claimable balance, claim anytime' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="flex items-start gap-3">
                  <span className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-extrabold text-white"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
                  >
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Opens */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <div className="px-5 pt-4 pb-2">
              <h3 className="text-sm font-bold text-[var(--primary)]">Recent Opens</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-[var(--card2)] text-xs text-gray-400 uppercase tracking-wider">
                    <th className="px-5 py-2.5 text-left font-semibold">User</th>
                    <th className="px-5 py-2.5 text-left font-semibold">Box</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Prize</th>
                    <th className="px-5 py-2.5 text-right font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {recentOpens.map((item, i) => (
                    <tr key={i} className="hover:bg-[var(--card-hover)] transition-colors">
                      <td className="px-5 py-2.5 font-mono text-gray-300">{item.user}</td>
                      <td className="px-5 py-2.5 text-gray-300">{item.box}</td>
                      <td className="px-5 py-2.5 text-right font-semibold text-[var(--primary)]">{item.prize}</td>
                      <td className="px-5 py-2.5 text-right text-gray-500">{item.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default RewardPage;
