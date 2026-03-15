import React, { useMemo, useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import { VersionedTransaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { toast } from 'react-toastify';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { Check, Copy, Link2, Wallet, CalendarDays, Coins } from 'lucide-react';

import {
  getReferralSummary,
  getReferralLink,
  getReferralList,
  claimReferralRewards,
} from '@/utils/api.index';

import type { ReferralSummary, ReferralLinkInfo, ReferralListItem } from '@/interface/types';
import { SEO as SEO_TEXT, REFERRAL } from '@/constants/ui-text';

const fmtSOL = (n: number) =>
  `${(n ?? 0).toLocaleString(undefined, { maximumFractionDigits: 4 })} SOL`;

const shorten = (a: string, left: number = 4, right: number = 4): string =>
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

const ReferralsPage: React.FC = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [summary, setSummary] = useState<ReferralSummary | null>(null);
  const [linkInfo, setLinkInfo] = useState<ReferralLinkInfo | null>(null);
  const [rows, setRows] = useState<ReferralListItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const LIST_STEP = 10;
  const [visibleCount, setVisibleCount] = useState(LIST_STEP);

  const visibleRows = useMemo(() => rows.slice(0, visibleCount), [rows, visibleCount]);
  const hasMore = visibleCount < rows.length;

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const [s, l, r] = await Promise.all([
          getReferralSummary(),
          getReferralLink(),
          getReferralList(),
        ]);
        setSummary(s);
        setLinkInfo(l);
        setRows(r?.items ?? []);
      } catch (e) {
        console.error('Failed to load referrals', e);
        setSummary(null);
        setLinkInfo(null);
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const rewardRateText = useMemo(() => {
    const rate = linkInfo?.rewardRate;
    if (rate === undefined || rate === null) return '—';
    const percent = rate <= 1 ? rate * 100 : rate;
    return `${percent}%`;
  }, [linkInfo]);

  const canClaim = useMemo(() => {
    return !!summary && (summary.unclaimedRewardsSol ?? 0) > 0 && !claiming && !loading;
  }, [summary, claiming, loading]);

  const onCopy = async () => {
    if (!linkInfo?.referralLink) return;
    try {
      await navigator.clipboard.writeText(linkInfo.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch (e) {
      console.warn('[Referrals] Clipboard copy failed:', e);
    }
  };

  const onGenerate = async () => {
    if (generating) return;
    try {
      setGenerating(true);
      const l = await getReferralLink(); // BE "create or get"
      setLinkInfo(l);
    } catch (e) {
      console.error('Generate link failed', e);
    } finally {
      setGenerating(false);
    }
  };

  const onClaim = async () => {
    if (!summary || summary.unclaimedRewardsSol <= 0 || claiming) return;
    if (!wallet.publicKey || !wallet.sendTransaction) {
      console.error('[Referral] Wallet not connected');
      return;
    }

    try {
      setClaiming(true);

      // 1. Get transaction from BE (no params)
      const res = await claimReferralRewards();
      if (!res.txHash) throw new Error('No transaction returned from server');

      // 2. Deserialize & sign
      const txBuf = Buffer.from(res.txHash, 'base64');
      const tx = VersionedTransaction.deserialize(txBuf);

      // 3. Send & confirm with blockhash timeout
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('processed');
      const signature = await wallet.sendTransaction(tx, connection, {
        preflightCommitment: 'processed',
      });
      const confirmResult = await connection.confirmTransaction(
        { signature, blockhash, lastValidBlockHeight },
        'processed'
      );
      if (confirmResult.value.err) {
        throw new Error('Transaction failed on-chain');
      }

      // 4. Refresh data
      const [s2, r2] = await Promise.all([getReferralSummary(), getReferralList()]);
      setSummary(s2);
      setRows(r2?.items ?? []);

      toast.success(`Claimed ${res.claimedRewardsSol} SOL successfully!`);
    } catch (e: any) {
      console.error('[Referral] Claim failed:', e);
      const raw = e?.response?.data?.message || e?.message || '';
      let msg = 'Claim failed. Please try again.';
      if (/blockhash|Failed to fetch/i.test(raw)) {
        msg = 'Network error. Please check your connection and try again.';
      } else if (/unauthorized/i.test(raw)) {
        msg = 'Session expired. Please reconnect your wallet.';
      } else if (/User rejected/i.test(raw)) {
        msg = 'Transaction was cancelled.';
      } else if (raw) {
        msg = raw;
      }
      toast.error(msg);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <Layout>
      <SEO title={SEO_TEXT.REFERRALS_TITLE} description={SEO_TEXT.REFERRALS_DESC} />

      <div className="min-h-screen flex flex-col items-center justify-start py-10">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
          <div className="w-full mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-left">
              {SEO_TEXT.REFERRALS_TITLE}
            </h1>
          </div>

          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 flex-1">
                <StatTile
                  icon={<UsersDotIcon />}
                  label={REFERRAL.TOTAL_REFERRALS}
                  value={loading ? '—' : String(summary?.totalReferrals ?? 0)}
                />
                <StatTile
                  icon={<Coins className="w-5 h-5" />}
                  label={REFERRAL.TOTAL_VOLUME}
                  value={loading ? '—' : fmtSOL(summary?.totalVolumeSol ?? 0)}
                />
                <StatTile
                  icon={<Coins className="w-5 h-5" />}
                  label={REFERRAL.UNCLAIMED_REWARDS}
                  value={loading ? '—' : fmtSOL(summary?.unclaimedRewardsSol ?? 0)}
                />
              </div>

              <button
                onClick={onClaim}
                disabled={!canClaim}
                className="btn-primary w-full sm:w-auto px-6 py-3 rounded-2xl text-base font-extrabold shadow-md disabled:opacity-60"
              >
                {claiming ? 'Claiming…' : REFERRAL.CLAIM_REWARD}
              </button>
            </div>

            <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[var(--card-border)] text-sm font-bold tracking-wide">
                REFERRAL LINK
              </div>

              <div className="p-4 sm:p-6 space-y-4">
                <div className="text-sm opacity-90">
                  <div className="font-semibold mb-1">How it works?</div>
                  <div className="opacity-80">
                    Refer friends and earn{' '}
                    <span className="font-extrabold text-[var(--primary)]">
                      {rewardRateText} of their trading fees
                    </span>
                    .
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                  <div className="text-sm opacity-90 min-w-[140px]">Your referral link:</div>

                  {loading ? (
                    <div className="text-sm opacity-70">Loading…</div>
                  ) : linkInfo?.referralLink ? (
                    <div className="flex items-stretch gap-2 w-full lg:max-w-2xl">
                      <div className="flex-1 grid grid-cols-[1fr_auto] rounded-xl border border-[var(--card-border)] bg-[var(--card2)] overflow-hidden">
                        <div className="px-3 sm:px-4 py-2.5 text-sm truncate flex items-center gap-2">
                          <Link2 className="w-4 h-4 opacity-70 shrink-0" />
                          <span className="truncate">{linkInfo.referralLink}</span>
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
                    <button
                      onClick={onGenerate}
                      disabled={generating}
                      className="btn-secondary px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 disabled:opacity-60"
                    >
                      <Link2 className="w-4 h-4" />
                      {generating ? REFERRAL.GENERATING : REFERRAL.GENERATE_LINK}
                    </button>
                  )}
                </div>
              </div>

              <div className="border-t border-[var(--card-border)]">
                <div className="w-full overflow-auto">
                  <table className="min-w-full text-xs sm:text-sm">
                    <thead className="bg-[var(--card2)] text-[var(--foreground)]">
                      <tr className="[&>th]:px-2 [&>th]:sm:px-4 [&>th]:py-3 [&>th]:text-left [&>th]:font-extrabold [&>th]:text-xs">
                        <th className="min-w-[100px] sm:min-w-[140px]">DATE JOINED</th>
                        <th className="min-w-[120px] sm:min-w-[220px]">WALLET</th>
                        <th className="min-w-[100px] sm:min-w-[160px]">TRADING VOLUME</th>
                        <th className="min-w-[100px] sm:min-w-[160px]">YOUR REWARDS</th>
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
                        visibleRows.map((r, i) => (
                          <tr key={i} className="hover:bg-[var(--card-hover)]">
                            <td className="px-2 sm:px-4 py-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 opacity-70 shrink-0" />
                                <span className="truncate">{new Date(r.joinedAt).toLocaleDateString()}</span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-3">
                              <div className="flex items-center gap-1 sm:gap-2">
                                <Wallet className="w-3 h-3 sm:w-4 sm:h-4 opacity-70 shrink-0" />
                                <span className="font-mono truncate">{shorten(r.walletAddress, 4, 4)}</span>
                              </div>
                            </td>
                            <td className="px-2 sm:px-4 py-3">{fmtSOL(r.tradingVolumeSol)}</td>
                            <td className="px-2 sm:px-4 py-3">{fmtSOL(r.rewardSol)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {hasMore ? (
                  <div className="flex justify-center py-5 border-t border-[var(--card-border)]">
                    <button
                      type="button"
                      onClick={() => setVisibleCount((prev) => Math.min(prev + LIST_STEP, rows.length))}
                      className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                    >
                      Load more
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};

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
