import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { getArenaDetail, placeBet } from '@/utils/api';
import { ArenaDetail, Arena } from '@/interface/types';
import { MOCK_ARENAS } from '@/constants/arena-mock';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Clock, ExternalLink, ChevronDown, ChevronUp,
  BarChart3, Info, CheckCircle2, Circle,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// SSR-safe: lightweight-charts uses window/canvas
const ArenaChart = dynamic(() => import('@/components/arena/ArenaChart'), { ssr: false });

/* ─── helpers ─── */
function timeLeft(end: string): string {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function fmtPool(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${Math.round(v)}`;
}

/* ─── Fake order book rows ─── */
function generateOrderBook(side: 'asks' | 'bids', basePrice: number) {
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const offset = (i + 1) * (side === 'asks' ? 0.01 : -0.01);
    const price = Math.max(0.01, Math.min(0.99, basePrice + offset));
    rows.push({
      price: price.toFixed(2),
      shares: Math.floor(Math.random() * 500) + 50,
      total: `$${(Math.floor(Math.random() * 2000) + 100).toLocaleString()}`,
    });
  }
  return rows;
}


/* ================================================================
   ArenaDetailPage — Probable.ag style layout
   Left:  chance %, chart, order book, rules, timeline
   Right: sidebar bet form, related arenas
   ================================================================ */
export default function ArenaDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const wallet = useWallet();
  const { connection } = useConnection();

  const [arena, setArena] = useState<ArenaDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Bet form state
  const [betSide, setBetSide] = useState<'yes' | 'no'>('yes');
  const [betTab, setBetTab] = useState<'buy' | 'sell'>('buy');
  const [betAmount, setBetAmount] = useState('');
  const [placing, setPlacing] = useState(false);

  // UI state
  const [orderBookTab, setOrderBookTab] = useState<'yes' | 'no'>('yes');
  const [showRules, setShowRules] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'related' | 'trending' | 'popular'>('related');

  /* ─── fetch arena (mock fallback) ─── */
  const fetchArena = useCallback(async () => {
    if (!id || typeof id !== 'string') return;
    setLoading(true);
    try {
      const data = await getArenaDetail(id);
      setArena(data);
    } catch {
      // API not ready — fallback to mock
      const mock = MOCK_ARENAS.find(a => a.id === id);
      if (mock) setArena({ ...mock, myBets: null } as ArenaDetail);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchArena(); }, [fetchArena]);

  /* ─── derived ─── */
  const optA = arena?.options[0];
  const optB = arena?.options[1];
  const chanceA = useMemo(() => {
    if (!arena || !optA || arena.totalPool <= 0) return 50;
    return Math.round((optA.totalBet / arena.totalPool) * 100);
  }, [arena, optA]);
  const chanceB = 100 - chanceA;

  const selectedOption = useMemo(() => {
    if (!arena) return null;
    return betSide === 'yes' ? optA : optB;
  }, [arena, betSide, optA, optB]);

  // Order book data changes based on which tab (yes/no) is selected
  const orderBookChance = orderBookTab === 'yes' ? chanceA : chanceB;
  const asksData = useMemo(() => generateOrderBook('asks', orderBookChance / 100), [orderBookChance]);
  const bidsData = useMemo(() => generateOrderBook('bids', orderBookChance / 100), [orderBookChance]);

  // Related arenas (exclude current)
  const relatedArenas = useMemo(() => {
    return MOCK_ARENAS.filter(a => a.id !== id).slice(0, 5);
  }, [id]);

  const canBet = useMemo(() => {
    if (!arena || arena.status !== 'active') return false;
    if (!wallet.publicKey) return false;
    const amt = Number(betAmount);
    if (!amt || amt < arena.minBet || amt > arena.maxBet) return false;
    return !placing;
  }, [arena, wallet.publicKey, betAmount, placing]);

  /* ─── place bet ─── */
  const handleBet = async () => {
    if (!arena || !selectedOption || !canBet) return;
    setPlacing(true);
    try {
      const amt = Number(betAmount);
      const res = await placeBet({
        arenaId: arena.id,
        optionId: selectedOption.id,
        amount: amt,
      });
      if (res.txHash && wallet.signTransaction) {
        const txBuf = Buffer.from(res.txHash, 'base64');
        const tx = VersionedTransaction.deserialize(txBuf);
        const signedTx = await wallet.signTransaction(tx);
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('processed');
        const sig = await connection.sendRawTransaction(signedTx.serialize(), { preflightCommitment: 'processed' });
        await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, 'processed');
      }
      toast.success('Bet placed!');
      setBetAmount('');
      fetchArena();
    } catch (e: any) {
      console.error('[Arena] Bet failed:', e);
      toast.error(e?.message || 'Failed to place bet');
    } finally {
      setPlacing(false);
    }
  };

  /* ─── loading / not found ─── */
  if (loading) {
    return (
      <Layout>
        <SEO title="Arena" description="Loading..." />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-400">Loading arena...</div>
      </Layout>
    );
  }

  if (!arena) {
    return (
      <Layout>
        <SEO title="Arena Not Found" description="" />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="text-gray-400 mb-4">Arena not found</div>
          <button onClick={() => router.push('/arena')} className="text-[var(--primary)] hover:underline">Back to Arena</button>
        </div>
      </Layout>
    );
  }

  const isActive = arena.status === 'active';

  return (
    <Layout>
      <SEO title={`${arena.title} - Arena`} description={arena.description} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => router.push('/arena')} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-5 text-sm">
          <ArrowLeft size={15} /> Back to Arena
        </button>

        {/* ═══════════════ Two-column layout ═══════════════ */}
        <div className="flex flex-col lg:flex-row gap-6">

          {/* ──────── LEFT COLUMN (main) ──────── */}
          <div className="flex-1 min-w-0">

            {/* Title row */}
            <div className="flex items-start gap-3 mb-1">
              {arena.image ? (
                <img src={arena.image} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 mt-0.5" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[var(--card2)] border border-[var(--card-border)] shrink-0 flex items-center justify-center text-gray-500 text-lg mt-0.5">?</div>
              )}
              <div className="flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">{arena.title}</h1>
              </div>
              <ExternalLink size={16} className="text-gray-500 shrink-0 mt-1.5 cursor-pointer hover:text-white" />
            </div>

            {/* Chance % + volume + date */}
            <div className="mb-5">
              <div className="text-4xl sm:text-5xl font-extrabold text-white mt-3">
                {chanceA}%
                <span className="text-lg font-normal text-gray-400 ml-2">Chance</span>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                <span className="flex items-center gap-1">
                  <BarChart3 size={14} /> {fmtPool(arena.totalPool)} Vol.
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {fmtDate(arena.endTime)}
                </span>
                {isActive && (
                  <span className="text-green-400 text-xs font-semibold ml-auto flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> LIVE
                  </span>
                )}
              </div>
            </div>

            {/* ──── Probability Chart — shows all options ──── */}
            <ArenaChart
              arenaId={arena.id}
              options={arena.options.map(opt => ({
                label: opt.label,
                chance: arena.totalPool > 0
                  ? Math.round((opt.totalBet / arena.totalPool) * 100)
                  : Math.round(100 / arena.options.length),
              }))}
              startTime={arena.startTime}
              endTime={arena.endTime}
              className="mb-5"
            />

            {/* ──── Order Book ──── */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 mb-5">
              <h3 className="text-sm font-bold text-white mb-3">Order Book</h3>

              {/* Trade Yes / No tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setOrderBookTab('yes')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    orderBookTab === 'yes'
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'text-gray-400 hover:text-white bg-[var(--card2)]'
                  }`}
                >
                  Trade {optA?.label || 'Yes'}
                </button>
                <button
                  onClick={() => setOrderBookTab('no')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    orderBookTab === 'no'
                      ? 'bg-red-400/20 text-red-400 border border-red-400/30'
                      : 'text-gray-400 hover:text-white bg-[var(--card2)]'
                  }`}
                >
                  Trade {optB?.label || 'No'}
                </button>
              </div>

              {/* Asks */}
              <div className="mb-3">
                <div className="grid grid-cols-3 text-xs text-gray-500 font-semibold mb-1.5 px-2">
                  <span>Price</span>
                  <span className="text-center">Shares</span>
                  <span className="text-right">Total</span>
                </div>
                {asksData.map((row, i) => (
                  <div key={`ask-${i}`} className="grid grid-cols-3 text-xs py-1.5 px-2 rounded hover:bg-red-400/5 transition-colors">
                    <span className="text-red-400 font-mono">{row.price}¢</span>
                    <span className="text-center text-gray-300 font-mono">{row.shares}</span>
                    <span className="text-right text-gray-400 font-mono">{row.total}</span>
                  </div>
                ))}
              </div>

              {/* Spread */}
              <div className="border-y border-[var(--card-border)] py-2 mb-3 text-center">
                <span className="text-xs text-gray-500">Spread: 1¢</span>
              </div>

              {/* Bids */}
              <div>
                {bidsData.map((row, i) => (
                  <div key={`bid-${i}`} className="grid grid-cols-3 text-xs py-1.5 px-2 rounded hover:bg-blue-500/5 transition-colors">
                    <span className="text-blue-400 font-mono">{row.price}¢</span>
                    <span className="text-center text-gray-300 font-mono">{row.shares}</span>
                    <span className="text-right text-gray-400 font-mono">{row.total}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ──── Rules Summary ──── */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 mb-5">
              <button
                onClick={() => setShowRules(!showRules)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Info size={14} className="text-gray-400" /> Rules Summary
                </h3>
                {showRules ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>

              {showRules && (
                <div className="mt-3 space-y-2 text-sm text-gray-400">
                  <p>This market will resolve based on the outcome of: <span className="text-white">{arena.title}</span></p>
                  <p>Resolution source: Official results from verified sources.</p>
                  <p>If the event is cancelled or postponed beyond the end date, all bets will be refunded.</p>
                  <div className="flex gap-3 mt-3">
                    <button className="text-[var(--primary)] text-xs hover:underline">View full rules</button>
                    <button className="text-gray-500 text-xs hover:underline">Propose Resolution</button>
                  </div>
                </div>
              )}
            </div>

            {/* ──── Timeline & Payout ──── */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 mb-5">
              <h3 className="text-sm font-bold text-white mb-4">Timeline & Payout</h3>
              <div className="space-y-4">
                <TimelineItem
                  label="Market Created"
                  date={fmtDate(arena.createdAt)}
                  done
                />
                <TimelineItem
                  label="Betting Starts"
                  date={fmtDate(arena.startTime)}
                  done={arena.status !== 'upcoming'}
                />
                <TimelineItem
                  label="Betting Ends"
                  date={fmtDate(arena.endTime)}
                  done={arena.status === 'completed'}
                />
                <TimelineItem
                  label="Resolution & Payout"
                  date={arena.status === 'completed' ? 'Resolved' : 'Pending'}
                  done={arena.status === 'completed'}
                />
              </div>

              <div className="mt-4 pt-3 border-t border-[var(--card-border)] text-xs text-gray-500">
                Payouts are distributed automatically to winners after resolution. Platform fee: 2%.
              </div>
            </div>

            {/* ──── My Bets (if any) ──── */}
            {arena.myBets && arena.myBets.length > 0 && (
              <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4">
                <h3 className="text-sm font-bold text-white mb-3">Your Positions</h3>
                <div className="space-y-2">
                  {arena.myBets.map((bet, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-[var(--card2)] rounded-xl p-3">
                      <div>
                        <span className="text-white font-semibold">{bet.optionLabel}</span>
                        <span className="text-gray-400 ml-2">{bet.amount} {bet.currency}</span>
                      </div>
                      <span className={`text-xs font-bold ${
                        bet.status === 'won' ? 'text-green-400' :
                        bet.status === 'lost' ? 'text-red-400' :
                        bet.status === 'refunded' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {bet.status === 'won' ? `Won +${bet.payout?.toFixed(2)}` :
                         bet.status === 'lost' ? 'Lost' :
                         bet.status === 'refunded' ? 'Refunded' : 'Active'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ──────── RIGHT COLUMN (sidebar) ──────── */}
          <div className="w-full lg:w-[360px] shrink-0">

            {/* ──── Bet Form Card ──── */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 mb-5 sticky top-20">
              {/* Buy / Sell tabs — same style as token SwapPanel */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setBetTab('buy')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border border-[var(--card-border)] transition-colors ${
                    betTab === 'buy'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--card)] text-gray-300 hover:text-white'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setBetTab('sell')}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border border-[var(--card-border)] transition-colors ${
                    betTab === 'sell'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-[var(--card)] text-gray-300 hover:text-white'
                  }`}
                >
                  Sell
                </button>
              </div>

              {/* Market dropdown (static for now) */}
              <div className="flex items-center justify-between bg-[var(--card2)] rounded-lg px-3 py-2.5 mb-4 text-sm">
                <span className="text-gray-400">Market</span>
                <span className="text-white font-semibold flex items-center gap-1">
                  Market <ChevronDown size={14} />
                </span>
              </div>

              {/* Yes / No price buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setBetSide('yes')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    betSide === 'yes'
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                      : 'bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20'
                  }`}
                >
                  {optA?.label || 'Yes'} {chanceA}¢
                </button>
                <button
                  onClick={() => setBetSide('no')}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    betSide === 'no'
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                      : 'bg-red-400/10 text-red-400 border border-red-400/30 hover:bg-red-400/20'
                  }`}
                >
                  {optB?.label || 'No'} {chanceB}¢
                </button>
              </div>

              {/* Amount input */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>Amount</span>
                  <span>Balance: $0.00</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={e => setBetAmount(e.target.value)}
                    placeholder="0"
                    min={arena.minBet}
                    max={arena.maxBet}
                    step="0.01"
                    className="w-full pl-7 pr-4 py-3 rounded-xl bg-[var(--card2)] border border-[var(--card-border)] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
                  />
                </div>
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2 mb-4">
                {[1, 10, 100].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(String(amt))}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--card2)] border border-[var(--card-border)] text-gray-400 hover:text-white hover:border-[var(--primary)] transition-colors"
                  >
                    +${amt}
                  </button>
                ))}
                <button
                  onClick={() => setBetAmount(String(arena.maxBet))}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[var(--card2)] border border-[var(--card-border)] text-gray-400 hover:text-white hover:border-[var(--primary)] transition-colors"
                >
                  MAX
                </button>
              </div>

              {/* Potential return */}
              {betAmount && Number(betAmount) > 0 && selectedOption && (
                <div className="flex items-center justify-between text-xs text-gray-400 mb-4 bg-[var(--card2)] rounded-lg px-3 py-2">
                  <span>Potential return</span>
                  <span className="text-green-400 font-bold">
                    ${(Number(betAmount) * (selectedOption.odds ?? 1)).toFixed(2)}
                    <span className="text-gray-500 font-normal ml-1">
                      ({((selectedOption.odds ?? 1) * 100 - 100).toFixed(0)}%)
                    </span>
                  </span>
                </div>
              )}

              {/* Action button — same gradient as token trading */}
              {!wallet.publicKey ? (
                <button className="btn btn-primary w-full py-3 text-sm font-bold">
                  Connect Wallet
                </button>
              ) : !isActive ? (
                <button disabled className="btn btn-primary w-full py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                  {arena.status === 'upcoming' ? 'Starting Soon' : 'Market Closed'}
                </button>
              ) : (
                <button
                  onClick={handleBet}
                  disabled={!canBet}
                  className="btn btn-primary w-full py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {placing ? 'Placing...' : `${betTab === 'buy' ? 'Buy' : 'Sell'} ${betSide === 'yes' ? optA?.label || 'Yes' : optB?.label || 'No'}`}
                </button>
              )}
            </div>

            {/* ──── Related Arenas ──── */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4">
              {/* Tabs: Related / Trending / Popular */}
              <div className="flex gap-1 mb-4">
                {(['related', 'trending', 'popular'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setSidebarTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      sidebarTab === tab
                        ? 'bg-[var(--primary)] text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                {relatedArenas.map(ra => {
                  const pct = ra.totalPool > 0
                    ? Math.round((ra.options[0]?.totalBet ?? 0) / ra.totalPool * 100)
                    : 50;
                  return (
                    <Link
                      key={ra.id}
                      href={`/arena/${ra.id}`}
                      className="flex items-start gap-3 p-2 rounded-xl hover:bg-[var(--card2)] transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[var(--card2)] border border-[var(--card-border)] shrink-0 flex items-center justify-center text-gray-500 text-sm">
                        ?
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-white group-hover:text-[var(--primary)] line-clamp-2 leading-snug transition-colors">
                          {ra.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                          <span>{fmtPool(ra.totalPool)} Vol</span>
                          <span>•</span>
                          <span>{pct}% Yes</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ─── Sub-components ─── */

function TimelineItem({ label, date, done }: { label: string; date: string; done: boolean }) {
  return (
    <div className="flex items-start gap-3">
      {done ? (
        <CheckCircle2 size={18} className="text-green-400 shrink-0 mt-0.5" />
      ) : (
        <Circle size={18} className="text-gray-600 shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <div className={`text-sm font-semibold ${done ? 'text-white' : 'text-gray-500'}`}>{label}</div>
        <div className="text-xs text-gray-500">{date}</div>
      </div>
    </div>
  );
}
