import React, { useEffect, useState, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';

/* =========================
   Mock data
========================= */
type StakeSummary = { stakedAmount: number; boopInWallet?: number | null; isConnected: boolean; };
type FeeReward = { claimableSol?: number | null; claimedSol?: number | null; };
type AirdropItem = { id: string; name: string; valueSol: number; status: 'unclaimed' | 'claimed'; dateISO: string; };
type GlobalStats = { totalFeesUsd: number; totalFeesSol: number; totalTradingUsd: number; totalTradingSol: number; cultsGraduated: number; cultsCreated: number; };

async function fetchStakeSummary(): Promise<StakeSummary> { return { stakedAmount: 0, boopInWallet: null, isConnected: false }; }
async function fetchFeeReward(): Promise<FeeReward> { return { claimableSol: null, claimedSol: null }; }
async function fetchAirdrops(): Promise<AirdropItem[]> { return []; }
async function fetchGlobalStats(): Promise<GlobalStats> {
  return { totalFeesUsd: 2198522, totalFeesSol: 13080.368, totalTradingUsd: 911312259, totalTradingSol: 4702978.91, cultsGraduated: 1048, cultsCreated: 49756 };
}

/* =========================
   Helpers
========================= */
const fmtSOL = (n?: number | null) => (n == null ? '—' : `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL`);
const fmtUSD = (n?: number | null) => (n == null ? '—' : `$${n.toLocaleString()}`);

/* Info row component */
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
    <span className="text-sm opacity-50">{label}</span>
    <span className="text-sm font-semibold">{value}</span>
  </div>
);

/* =========================
   Page
========================= */
const StakingPage: React.FC = () => {
  const [stake, setStake] = useState<StakeSummary | null>(null);
  const [fees, setFees] = useState<FeeReward | null>(null);
  const [airdrops, setAirdrops] = useState<AirdropItem[] | null>(null);
  const [global, setGlobal] = useState<GlobalStats | null>(null);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    (async () => {
      const [s, f, a, g] = await Promise.all([fetchStakeSummary(), fetchFeeReward(), fetchAirdrops(), fetchGlobalStats()]);
      setStake(s); setFees(f); setAirdrops(a); setGlobal(g);
    })();
  }, []);

  const isConnected = stake?.isConnected;

  const walletDisplay = useMemo(() => {
    if (!stake?.boopInWallet) return null;
    return stake.boopInWallet.toLocaleString();
  }, [stake]);

  return (
    <Layout>
      <SEO title="Staking" description="Stake to earn ongoing trading fees and airdrops." />

      <div className="min-h-screen flex flex-col items-center py-10">
        <div className="w-full max-w-4xl px-4">

          {/* ── Title ── */}
          <div className="flex flex-col items-center mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-center">Stake</h1>
          </div>

          {/* ── Two-column layout ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">

            {/* ── LEFT: Main Staking Card ── */}
            <div className="rounded-2xl border border-white/10 overflow-hidden"
              style={{ background: 'linear-gradient(160deg, rgba(30,34,60,0.95) 0%, rgba(16,18,38,0.98) 100%)' }}
            >
              {/* Available + wallet */}
              <div className="px-5 pt-5 pb-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-widest opacity-40">Available to Stake</span>
                  {isConnected && walletDisplay && (
                    <span className="text-xs opacity-40 font-mono">{walletDisplay} SEED</span>
                  )}
                </div>
                <div className="text-3xl font-extrabold tracking-tight">
                  {stake ? `${stake.boopInWallet?.toLocaleString() ?? '0.0'} SEED` : '0.0 SEED'}
                </div>
              </div>

              {/* Staked amount + APR */}
              <div className="grid grid-cols-2 border-b border-white/5">
                <div className="px-5 py-4 border-r border-white/5">
                  <div className="text-xs opacity-40 uppercase tracking-widest mb-1">Staked Amount</div>
                  <div className="text-xl font-extrabold">
                    {stake ? `${stake.stakedAmount.toLocaleString()} SEED` : '0.0 SEED'}
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="text-xs opacity-40 uppercase tracking-widest mb-1">Est. APR</div>
                  <div className="text-xl font-extrabold" style={{ color: 'var(--accent)' }}>—</div>
                </div>
              </div>

              {/* Input + button */}
              <div className="px-5 py-4">
                <div className="flex items-center rounded-xl border border-white/10 bg-white/5 px-4 py-3 mb-3 focus-within:border-[var(--primary)]/50 transition-all">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 bg-transparent outline-none text-sm placeholder-white/25"
                  />
                  <button
                    type="button"
                    onClick={() => stake?.boopInWallet && setAmount(String(stake.boopInWallet))}
                    className="text-xs font-bold ml-2 uppercase tracking-wider"
                    style={{ color: 'var(--primary)' }}
                  >
                    MAX
                  </button>
                </div>

                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl text-sm font-extrabold tracking-wide text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent))' }}
                  disabled={!amount}
                >
                  {isConnected ? 'Stake' : 'Connect Wallet'}
                </button>
              </div>

              {/* Info rows */}
              <div className="px-5 pb-5">
                <InfoRow label="You will receive" value={fees?.claimableSol != null ? fmtSOL(fees.claimableSol) : '0 SOL'} />
                <InfoRow label="Claimed to date" value={fmtSOL(fees?.claimedSol)} />
                <InfoRow label="Reward fee" value="10%" />
                <InfoRow label="Airdrops" value={airdrops?.length ? `${airdrops.length} pending` : 'none'} />
              </div>
            </div>

            {/* ── RIGHT: Global Stats Card ── */}
            <div className="rounded-2xl border border-white/10 overflow-hidden flex flex-col h-full"
              style={{ background: 'linear-gradient(160deg, rgba(30,34,60,0.95) 0%, rgba(16,18,38,0.98) 100%)' }}
            >
              {/* Earth animation — grows to fill remaining height */}
              <div className="flex flex-1 justify-center items-center py-6">
                <img
                  src="/earth.png"
                  alt="Earth"
                  className="w-full max-w-[260px] select-none pointer-events-none"
                  style={{ animation: 'earth-spin 14s linear infinite' }}
                />
              </div>

              <div className="px-5 pb-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-sm font-extrabold">Global Statistics</span>
              </div>
              <div className="px-5 py-2">
                <InfoRow label="Total fees earned" value={`${fmtUSD(global?.totalFeesUsd)} (${global ? global.totalFeesSol.toLocaleString() : '—'} SOL)`} />
                <InfoRow label="Trading volume" value={fmtUSD(global?.totalTradingUsd)} />
                <InfoRow label="Tokens graduated" value={global ? global.cultsGraduated.toLocaleString() : '—'} />
                <InfoRow label="Tokens created" value={global ? global.cultsCreated.toLocaleString() : '—'} />
              </div>
            </div>

            <style>{`
              @keyframes earth-spin {
                from { transform: rotate(0deg); }
                to   { transform: rotate(360deg); }
              }
            `}</style>

          </div>
        </div>
      </div>
    </Layout>
  );
};

export default StakingPage;
