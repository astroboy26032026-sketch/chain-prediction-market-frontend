import React, { useMemo, useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Check, Copy, Link2, Plus, Wallet, CalendarDays, Coins } from 'lucide-react';

/* =========================
   Mock API hooks
========================= */
type ReferralRow = {
  joinedAt: string;
  wallet: string;
  tradingVolumeSol: number;
  rewardSol: number;
};

type ReferralStats = {
  totalRefs: number;
  totalVolumeSol: number;
  unclaimedSol: number;
  myLink?: string;
};

async function fetchReferralStats(): Promise<ReferralStats> {
  return { totalRefs: 0, totalVolumeSol: 0, unclaimedSol: 0, myLink: '' };
}

async function fetchReferralList(): Promise<ReferralRow[]> {
  return [];
}

async function createReferralHandle(handle: string): Promise<string> {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://your.site';
  return `${base}/join/@${handle}`;
}

async function claimReferralRewards(): Promise<void> {
  return;
}

/* =========================
   Helpers
========================= */
const fmtSOL = (n: number) =>
  `${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;

const shorten = (a: string, left = 4, right = 4) =>
  a?.length > left + right + 3 ? `${a.slice(0, left)}…${a.slice(-right)}` : a;

const StatTile: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value,
}) => (
  <div className="flex-1 min-w-[180px] rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-4 sm:p-5 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl grid place-items-center bg-[var(--card2)] border border-[var(--card-border)]">
        {icon}
      </div>
      <div className="text-xs opacity-80">{label}</div>
    </div>
    <div className="mt-3 text-2xl font-extrabold tracking-tight">{value}</div>
  </div>
);

/* =========================
   Page
========================= */
const ReferralsPage: React.FC = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [rows, setRows] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [handle, setHandle] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [s, r] = await Promise.all([fetchReferralStats(), fetchReferralList()]);
        setStats(s);
        setRows(r);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const canCreate = useMemo(() => /^[a-z0-9_]{3,20}$/i.test(handle.trim()), [handle]);

  const onCreate = async () => {
    if (!canCreate || creating) return;
    try {
      setCreating(true);
      const link = await createReferralHandle(handle.trim());
      setStats((p) =>
        p ? { ...p, myLink: link } : { totalRefs: 0, totalVolumeSol: 0, unclaimedSol: 0, myLink: link }
      );
      setHandle('');
    } finally {
      setCreating(false);
    }
  };

  const onCopy = async () => {
    if (!stats?.myLink) return;
    try {
      await navigator.clipboard.writeText(stats.myLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  const onClaim = async () => {
    if (!stats || stats.unclaimedSol <= 0 || claiming) return;
    try {
      setClaiming(true);
      await claimReferralRewards();
      const s = await fetchReferralStats();
      setStats(s);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Layout>
      <SEO title="Referrals" description="Your referral dashboard" />

      {/* === Container (centered) === */}
      <div className="min-h-screen flex flex-col items-center justify-start py-10">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
          {/* Title aligned left */}
          <div className="w-full mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-left">
              Referrals
            </h1>
          </div>

          {/* Top stats + Claim */}
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 flex-1">
                <StatTile
                  icon={<UsersDotIcon />}
                  label="Total Referrals"
                  value={stats ? String(stats.totalRefs) : loading ? '—' : '0'}
                />
                <StatTile
                  icon={<Coins className="w-5 h-5" />}
                  label="Total Volume"
                  value={stats ? fmtSOL(stats.totalVolumeSol) : loading ? '—' : '0 SOL'}
                />
                <StatTile
                  icon={<Coins className="w-5 h-5" />}
                  label="Unclaimed Rewards"
                  value={stats ? fmtSOL(stats.unclaimedSol) : loading ? '—' : '0 SOL'}
                />
              </div>

              <button
                onClick={onClaim}
                disabled={!stats || stats.unclaimedSol <= 0 || claiming}
                className="btn-primary w-full sm:w-auto px-6 py-3 rounded-2xl text-base font-extrabold shadow-md disabled:opacity-60"
              >
                {claiming ? 'Claiming…' : 'CLAIM REWARD'}
              </button>
            </div>

            {/* Referral link block */}
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--card-border)] text-sm font-bold tracking-wide">
                REFERRAL LINK
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                {/* How it works */}
                <div className="text-sm opacity-90">
                  <div className="font-semibold mb-1">How it works?</div>
                  <div className="opacity-80">
                    Refer friends and earn{' '}
                    <span className="font-extrabold text-[var(--primary)]">20% of their trading fees</span>.
                  </div>
                </div>

                {/* Create / show link */}
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                  <div className="text-sm opacity-90 min-w-[140px]">Your referral link:</div>

                  {stats?.myLink ? (
                    <div className="flex items-stretch gap-2 w-full lg:max-w-2xl">
                      <div className="flex-1 grid grid-cols-[1fr_auto] rounded-xl border border-[var(--card-border)] bg-[var(--card2)] overflow-hidden">
                        <div className="px-3 sm:px-4 py-2.5 text-sm truncate flex items-center gap-2">
                          <Link2 className="w-4 h-4 opacity-70 shrink-0" />
                          <span className="truncate">{stats.myLink}</span>
                        </div>
                        <button
                          onClick={onCopy}
                          className="px-3 sm:px-4 py-2.5 border-l border-[var(--card-border)] hover:bg-[var(--card-hover)] transition-colors"
                          title="Copy link"
                        >
                          {copied ? (
                            <Check className="w-4 h-4 text-[var(--accent)]" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-stretch gap-2 w-full lg:max-w-xl">
                      <div className="flex-1 rounded-xl border border-[var(--card-border)] bg-[var(--card2)] overflow-hidden grid grid-cols-[auto_1fr]">
                        <div className="px-3 sm:px-4 py-2.5 text-xs sm:text-sm opacity-70 select-none grid place-items-center">
                          https://your.site/join/@
                        </div>
                        <input
                          value={handle}
                          onChange={(e) => setHandle(e.target.value)}
                          placeholder="link name"
                          className="bg-transparent px-3 sm:px-4 py-2.5 text-sm outline-none"
                        />
                      </div>
                      <button
                        onClick={onCreate}
                        disabled={!canCreate || creating}
                        className="btn-secondary px-4 py-2.5 rounded-xl font-bold flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        CREATE
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="border-t border-[var(--card-border)]">
                <div className="w-full overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[var(--card2)] text-[var(--foreground)]">
                      <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-extrabold [&>th]:text-xs">
                        <th className="min-w-[140px]">DATE JOINED</th>
                        <th className="min-w-[220px]">WALLET</th>
                        <th className="min-w-[160px]">TRADING VOLUME</th>
                        <th className="min-w-[160px]">YOUR REWARDS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--card-border)]">
                      {loading ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center opacity-70">
                            Loading…
                          </td>
                        </tr>
                      ) : rows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center opacity-70">
                            Share your referral link to start earning
                          </td>
                        </tr>
                      ) : (
                        rows.map((r, i) => (
                          <tr key={i} className="hover:bg-[var(--card-hover)]">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <CalendarDays className="w-4 h-4 opacity-70" />
                                {new Date(r.joinedAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Wallet className="w-4 h-4 opacity-70" />
                                <span className="font-mono">{shorten(r.wallet, 6, 6)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">{fmtSOL(r.tradingVolumeSol)}</td>
                            <td className="px-4 py-3">{fmtSOL(r.rewardSol)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

/* =========================
   Icons
========================= */
const UsersDotIcon: React.FC = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <path
      d="M16 11a4 4 0 1 0-3.2-6.4M8 11a4 4 0 1 1 3.2-6.4M4 20a6 6 0 0 1 12 0M20 20a4 4 0 0 0-5-3.87"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default ReferralsPage;
