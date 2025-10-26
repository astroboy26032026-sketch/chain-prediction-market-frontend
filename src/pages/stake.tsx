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
const fmtSOL = (n?: number | null) => (n == null ? '??? SOL' : `${n.toLocaleString(undefined, { maximumFractionDigits: 3 })} SOL`);
const fmtUSD = (n?: number | null) => (n == null ? '$—' : `$${n.toLocaleString()}`);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' });

const Card: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`rounded-xl border border-[var(--card-border)] bg-[var(--card)] ${className}`}>{children}</div>
);
const SectionTitle: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-[var(--card-border)]">
    {subtitle && <div className="text-sm opacity-80">{subtitle}</div>}
    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">{title}</h2>
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

  useEffect(() => {
    (async () => {
      const [s, f, a, g] = await Promise.all([fetchStakeSummary(), fetchFeeReward(), fetchAirdrops(), fetchGlobalStats()]);
      setStake(s); setFees(f); setAirdrops(a); setGlobal(g);
    })();
  }, []);

  const isConnected = stake?.isConnected;
  const stakeDisplay = useMemo(() => {
    if (!stake) return { amount: '—', wallet: '???' };
    return { amount: stake.stakedAmount.toLocaleString(), wallet: stake.boopInWallet == null ? '???' : stake.boopInWallet.toLocaleString() };
  }, [stake]);

  return (
    <Layout>
      <SEO title="Staking" description="Stake to earn ongoing trading fees and airdrops." />

      <div className="relative min-h-screen flex flex-col items-center py-8 sm:py-10">
        <div className="w-full max-w-6xl px-4 sm:px-6 lg:px-10 xl:px-16">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-6">Stake</h1>

          {/* GRID: left column (logo + stake), right column (rewards) */}
          <div className="grid grid-cols-1 lg:[grid-template-columns:320px_1fr] gap-6 items-start">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* ✅ LOGO: đẩy sang phải nhẹ bằng ml-auto + translate-x */}
              <img
                src="/logo-seed.png"
                alt="Seed Logo"
                className="seed-bounce w-[160px] sm:w-[180px] lg:w-[200px] opacity-90 drop-shadow-md ml-12"
              />

              <Card className="bg-[var(--card2)]">
                <SectionTitle title="Your Stake" />
                <div className="p-4 sm:p-5">
                  <div className="text-sm opacity-80 mb-1">Your Staked SEED</div>
                  <div className="text-2xl font-extrabold">{stakeDisplay.amount}</div>
                  <div className="text-xs opacity-70 mt-1">SEED in wallet: {stakeDisplay.wallet}</div>

                  <button className="mt-4 w-full rounded-lg px-4 py-2 font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition">
                    {isConnected ? 'stake more' : 'connect'}
                  </button>
                </div>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              <Card>
                <SectionTitle title="your staking rewards" />
                <div className="p-4 sm:p-5 space-y-4">
                  <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card2)] p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[var(--card)] border border-[var(--card-border)] grid place-items-center text-lg">≡</div>
                      <div>
                        <div className="text-sm opacity-80">fees</div>
                        <div className="text-xl font-extrabold">{fmtSOL(fees?.claimableSol)}</div>
                        <div className="text-xs opacity-70">claimed to date {fmtSOL(fees?.claimedSol)}</div>
                      </div>
                    </div>
                    <button className="rounded-lg px-4 py-2 font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition">
                      {isConnected ? 'claim' : 'connect'}
                    </button>
                  </div>

                  <Card className="bg-[var(--card2)] border-dashed">
                    <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-[var(--card-border)]/70 flex justify-between">
                      <div className="font-extrabold text-sm">airdrops</div>
                      <div className="text-xs opacity-80">unclaimed</div>
                    </div>

                    {!airdrops?.length ? (
                      <div className="px-4 sm:px-6 py-10 text-center">
                        <div className="mx-auto mb-4 h-12 w-12 opacity-60 grid place-items-center">
                          <div className="h-10 w-10 rounded-full border-2 border-dashed border-[var(--card-border)]" />
                        </div>
                        <div className="text-sm font-extrabold tracking-wide mb-1">nothing here…</div>
                        <div className="text-sm opacity-80">stake SEED to get airdrops, dummy</div>
                      </div>
                    ) : (
                      airdrops.map((a) => (
                        <div key={a.id} className="px-4 sm:px-5 py-3 flex items-center justify-between border-t border-[var(--card-border)]">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-[var(--card)] border border-[var(--card-border)] grid place-items-center text-sm">🎁</div>
                            <div>
                              <div className="font-bold">{a.name}</div>
                              <div className="text-xs opacity-70">{fmtDate(a.dateISO)}</div>
                            </div>
                          </div>
                          <button className="rounded-md px-3 py-1.5 text-sm font-bold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition">
                            {a.status === 'claimed' ? 'view' : 'claim'}
                          </button>
                        </div>
                      ))
                    )}
                  </Card>
                </div>
              </Card>
            </div>
          </div>

          {/* GLOBAL STATS — FULL WIDTH */}
          <div className="mt-6">
            <Card>
              <SectionTitle title="global stats" />
              <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-lg bg-[var(--card2)] border border-[var(--card-border)] p-4">
                  <div className="text-xs opacity-70 mb-1">total fees earned</div>
                  <div className="text-xl font-extrabold">
                    {fmtUSD(global?.totalFeesUsd)}{' '}
                    <span className="opacity-70 text-sm">({global ? `${global.totalFeesSol.toLocaleString()} sol` : '—'})</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--card2)] border border-[var(--card-border)] p-4">
                  <div className="text-xs opacity-70 mb-1">trading Volume at all </div>
                  <div className="text-xl font-extrabold">
                    {fmtUSD(global?.totalTradingUsd)}{' '}
                    <span className="opacity-70 text-sm">({global ? `${global.totalTradingSol.toLocaleString()} sol` : '—'})</span>
                  </div>
                </div>
                <div className="rounded-lg bg-[var(--card2)] border border-[var(--card-border)] p-4">
                  <div className="text-xs opacity-70 mb-1">Token graduated</div>
                  <div className="text-xl font-extrabold">{global ? global.cultsGraduated.toLocaleString() : '—'}</div>
                </div>
                <div className="rounded-lg bg-[var(--card2)] border border-[var(--card-border)] p-4">
                  <div className="text-xs opacity-70 mb-1">Token created</div>
                  <div className="text-xl font-extrabold">{global ? global.cultsCreated.toLocaleString() : '—'}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Animation */}
      <style jsx>{`
        @keyframes seed-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .seed-bounce {
          animation: seed-bounce 2.4s ease-in-out infinite;
        }
      `}</style>
    </Layout>
  );
};

export default StakingPage;
