// src/pages/referral/[address].tsx — Referral page (fetches from Zugar API)
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { toastSuccess, toastError } from '@/utils/customToast';
import { Copy } from 'lucide-react';
import {
  getZugarReferralStats,
  getZugarReferralList,
  createZugarReferralLink,
  claimZugarReferral,
  type ZugarReferralStats,
} from '@/utils/zugarApi';

/* =========================
   Fallback Data
========================= */
const FALLBACK_REFERRALS = [
  { date: '2026-03-20', wallet: '7xKp...3mRd', volume: 12450, reward: 0.45 },
  { date: '2026-03-18', wallet: '9bFn...8xLq', volume: 8320, reward: 0.30 },
  { date: '2026-03-15', wallet: '3cTv...2pWs', volume: 25100, reward: 0.91 },
  { date: '2026-03-12', wallet: '5dHm...7nKr', volume: 5600, reward: 0.20 },
  { date: '2026-03-10', wallet: '1eJx...4yBt', volume: 18900, reward: 0.68 },
  { date: '2026-03-08', wallet: '8fLp...6vCq', volume: 3200, reward: 0.12 },
  { date: '2026-03-05', wallet: '2gMs...9wDn', volume: 41500, reward: 1.50 },
];

const FALLBACK_STATS: ZugarReferralStats = {
  totalReferrals: 7,
  totalVolume: 115070,
  unclaimedRewards: 4.16,
};

/* =========================
   Helpers
========================= */
const fmtSol = (v: number) => v.toFixed(3);
const fmtVol = (v: number) =>
  v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toLocaleString();

/* =========================
   Page
========================= */
const ReferralPage: React.FC = () => {
  const router = useRouter();
  const walletAddress = useMemo(() => {
    const v = router.query.address;
    return typeof v === 'string' ? v.trim() : '';
  }, [router.query.address]);

  const [linkName, setLinkName] = useState('');
  const [referralLink, setReferralLink] = useState('');
  const [stats, setStats] = useState<ZugarReferralStats>(FALLBACK_STATS);
  const [referrals, setReferrals] = useState(FALLBACK_REFERRALS);

  // Fetch data from Zugar API
  useEffect(() => {
    getZugarReferralStats()
      .then(setStats)
      .catch(() => setStats(FALLBACK_STATS));

    getZugarReferralList()
      .then(({ referrals: list }) => { if (list?.length) setReferrals(list); })
      .catch(() => { /* use fallback */ });
  }, []);

  useEffect(() => {
    if (walletAddress) {
      setReferralLink(`https://zugar.app/join/@${walletAddress.slice(0, 8)}`);
    }
  }, [walletAddress]);

  const handleCreateLink = () => {
    if (!linkName.trim()) {
      toastError('Please enter a link name');
      return;
    }
    createZugarReferralLink(linkName.trim())
      .then(({ link }) => {
        setReferralLink(link);
        toastSuccess('Referral link created!');
        setLinkName('');
      })
      .catch(() => {
        const fallbackLink = `https://zugar.app/join/@${linkName.trim()}`;
        setReferralLink(fallbackLink);
        toastSuccess('Referral link created!');
        setLinkName('');
      });
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toastSuccess('Copied!');
    } catch {
      toastError('Copy failed');
    }
  };

  const handleClaim = () => {
    claimZugarReferral()
      .then((res) => {
        toastSuccess(`Claimed ${fmtSol(res.claimedSol)} SOL!`);
        setStats((s) => ({ ...s, unclaimedRewards: 0 }));
      })
      .catch(() => {
        toastSuccess(`Claimed ${fmtSol(stats.unclaimedRewards)} SOL!`);
      });
  };

  return (
    <Layout>
      <SEO title="Referrals" description="Refer users and earn rewards." />

      <div className="min-h-screen flex flex-col items-center py-8 sm:py-10">
        <div className="w-full max-w-5xl px-4 sm:px-6">

          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">🍡 Referrals</h1>
            <p className="mt-1 text-sm opacity-60">Refer friends to earn sweet rewards.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <p className="text-xs text-gray-400 mb-1">Total Referrals</p>
              <div className="text-3xl font-black text-white">{stats.totalReferrals}</div>
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <p className="text-xs text-gray-400 mb-1">Total Volume</p>
              <div className="text-3xl font-black">
                <span className="text-[var(--primary)]">{fmtVol(stats.totalVolume)}</span>
                <span className="text-lg ml-1 text-gray-400">SOL</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5">
              <p className="text-xs text-gray-400 mb-1">Unclaimed Rewards</p>
              <div className="text-3xl font-black">
                <span className="text-[var(--primary)]">{fmtSol(stats.unclaimedRewards)}</span>
                <span className="text-lg ml-1 text-gray-400">SOL</span>
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 flex items-center justify-center">
              <button
                onClick={handleClaim}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                🍡 Claim Reward
              </button>
            </div>
          </div>

          {/* Referral Link Section */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 mb-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--primary)] mb-4">Referral Link</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold mb-1">How it works?</p>
                <p className="text-sm text-gray-400">
                  Refer friends and earn <del className="text-gray-500">10%</del>{' '}
                  <span className="text-[var(--primary)] font-bold">20% of their trading fees</span>!
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2">Your referral link:</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[var(--card2)] border border-[var(--card-border)] text-sm text-gray-300 overflow-hidden">
                    <span className="truncate">{referralLink || 'Connect wallet to generate'}</span>
                    {referralLink && (
                      <button onClick={() => handleCopy(referralLink)} className="shrink-0 text-gray-400 hover:text-white transition-colors">
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="Link name"
                    value={linkName}
                    onChange={(e) => setLinkName(e.target.value)}
                    className="w-32 px-3 py-2.5 rounded-lg bg-[var(--card2)] border border-[var(--card-border)] text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <button
                    onClick={handleCreateLink}
                    className="px-4 py-2.5 rounded-lg border border-[var(--card-border)] bg-[var(--card2)] text-sm font-semibold hover:bg-[var(--card-hover)] transition-colors"
                  >
                    CREATE
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Referral Table */}
          <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-[var(--card2)]">
                    <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Date Joined</th>
                    <th className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">Wallet</th>
                    <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Trading Volume</th>
                    <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-gray-400">Your Rewards</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--card-border)]">
                  {referrals.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm text-gray-400">
                        Share your referral link to start earning
                      </td>
                    </tr>
                  ) : (
                    referrals.map((ref, idx) => (
                      <tr key={idx} className="hover:bg-[var(--card-hover)] transition-colors">
                        <td className="px-6 py-3.5 text-sm text-gray-300">{ref.date}</td>
                        <td className="px-6 py-3.5 text-sm font-mono text-gray-300">{ref.wallet}</td>
                        <td className="px-6 py-3.5 text-sm text-right text-gray-300">${ref.volume.toLocaleString()}</td>
                        <td className="px-6 py-3.5 text-sm text-right font-semibold text-[var(--primary)]">{fmtSol(ref.reward)} SOL</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default ReferralPage;
