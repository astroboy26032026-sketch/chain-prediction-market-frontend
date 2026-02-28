// src/pages/token/[address].tsx
import { GetServerSideProps } from 'next';
import React, { useEffect, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { ArrowUpDownIcon } from 'lucide-react';
import { Tab } from '@headlessui/react';
import { useDebounce } from 'use-debounce';
import { toast } from 'react-toastify';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import Spinner from '@/components/ui/Spinner';
import ShareButton from '@/components/ui/ShareButton';

import TradingViewChart from '@/components/charts/TradingViewChart';

import TransactionHistory from '@/components/TokenDetails/TransactionHistory';
import TokenHolders from '@/components/TokenDetails/TokenHolders';
import TokenInfo from '@/components/TokenDetails/TokenInfo';
import Chats from '@/components/TokenDetails/Chats';

import {
  getTokenInfo, // ✅ /token/info
  getTokenLiquidity, // ✅ /token/liquidity
  getTokenHolders, // ✅ /token/holders

  // ✅ NEW: bonding curve previews
  previewBuy, // ✅ POST /trading/preview-buy
  previewSell, // ✅ POST /trading/preview-sell

  buyToken, // ✅ /trading/buy
  sellToken, // ✅ /trading/sell
  submitSignature, // ✅ tracking.submitSignatureEndpoint
  getTradingStatus, // ✅ tracking.statusEndpoint
  newIdempotencyKey,
} from '@/utils/api.index';

import type {
  Token,
  TokenHolder,
  TradingBuyResponse,
  TradingTxStatusResponse,
  TradingPreviewBuyResponse,
  TradingPreviewSellResponse,
} from '@/interface/types';

import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

interface TokenDetailProps {
  initialTokenInfo: Token | null;
}

const PRICE_UNIT: 'SOL' = 'SOL';

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_TRIES = 12; // ~12s (nhanh hơn)

const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * BE sometimes returns:
 * - "POST /api/v1/transactions/submit-signature"
 * - "POST:/api/v1/transactions/submit-signature"
 * - "/api/v1/transactions/submit-signature"
 * - Full URL
 */
const normalizeTrackingEndpoint = (v: any) => {
  let s = String(v ?? '').trim();
  if (!s) return '';

  try {
    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      s = `${u.pathname}${u.search || ''}`;
    }
  } catch {
    // ignore
  }

  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s*:\s*/i, '');
  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '');

  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s*:\s*/i, '');
  s = s.replace(/^(GET|POST|PUT|PATCH|DELETE)\s+/i, '');

  if (!s.startsWith('/')) s = `/${s}`;
  s = s.replace(/\/{2,}/g, '/');

  return s;
};

const parseNumberInput = (v: string) => {
  const s = String(v ?? '').trim();
  if (!s) return 0;
  if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/**
 * ✅ Preview BUY using bonding curve (accurate)
 * - input: SOL (human)
 * - output: estimatedTokens (number)
 */
async function estimateTokensFromSol({
  tokenAddr,
  solIn,
}: {
  tokenAddr: string;
  solIn: number;
}): Promise<{ tokenOutHuman: number; preview: TradingPreviewBuyResponse }> {
  const res = (await previewBuy({
    tokenAddress: tokenAddr,
    amountSol: solIn,
  })) as TradingPreviewBuyResponse;

  const tokenOutHuman = Number(res?.estimatedTokens ?? 0);
  if (!Number.isFinite(tokenOutHuman) || tokenOutHuman <= 0) {
    throw new Error('Amount too small');
  }

  return { tokenOutHuman, preview: res };
}

/**
 * ✅ Preview SELL using bonding curve (accurate)
 * - input: TOKEN (human number)
 * - output: estimatedSol (number)
 *
 * NOTE: API spec shows amountInToken is number. If your BE expects base units,
 * update FE accordingly. For now follow spec.
 */
async function estimateSolFromTokens({
  tokenAddr,
  tokenInHuman,
}: {
  tokenAddr: string;
  tokenInHuman: number;
}): Promise<{ solOut: number; preview: TradingPreviewSellResponse }> {
  const res = (await previewSell({
    tokenAddress: tokenAddr,
    amountInToken: tokenInHuman,
  })) as TradingPreviewSellResponse;

  const solOut = Number(res?.estimatedSol ?? 0);
  if (!Number.isFinite(solOut) || solOut <= 0) throw new Error('Amount too small');

  return { solOut, preview: res };
}

/**
 * helper: SOL -> lamports string
 */
const SOL_LAMPORTS = 1_000_000_000;
const toLamportsString = (sol: number) => {
  const n = Number(sol);
  if (!Number.isFinite(n) || n <= 0) return '0';
  // round down to avoid spending more than user typed
  const lamports = Math.floor(n * SOL_LAMPORTS);
  return String(Math.max(lamports, 0));
};

const TokenDetail: React.FC<TokenDetailProps> = ({ initialTokenInfo }) => {
  const router = useRouter();
  const { address } = router.query;

  const tokenAddr = useMemo(() => {
    const a = Array.isArray(address) ? address[0] : address;
    return (a || '').trim() || undefined;
  }, [address]);

  const wallet = useWallet();
  const { connection } = useConnection();

  // ===== Core token info =====
  const [tokenInfo, setTokenInfo] = useState<Token | null>(initialTokenInfo);

  // ===== Liquidity =====
  const [liquidityEvents, setLiquidityEvents] = useState<any[]>([]);

  // ===== Holders =====
  const [holdersAll, setHoldersAll] = useState<TokenHolder[]>([]);
  const [holdersNextCursor, setHoldersNextCursor] = useState<string | null>(null);
  const [holdersLoading, setHoldersLoading] = useState(false);
  const [holdersError, setHoldersError] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);

  // ===== Swap UI state =====
  const isApproved = true;

  // Input/output
  const [fromToken, setFromToken] = useState({ symbol: 'SOL', amount: '' });
  const [toToken, setToToken] = useState({ symbol: '', amount: '' });

  // false=BUY, true=SELL
  const [isSwapped, setIsSwapped] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  const [ethBalance] = useState('0.000'); // placeholder SOL balance
  const [tokenBalance] = useState('0.000'); // placeholder token balance
  const [actionButtonText, setActionButtonText] = useState('Buy');
  const [isTransacting, setIsTransacting] = useState(false);

  // settings ui state
  const [isSettingsOpenMobile, setIsSettingsOpenMobile] = useState(false);
  const [isSettingsOpenDesktop, setIsSettingsOpenDesktop] = useState(false);
  const [antiMEV, setAntiMEV] = useState<boolean>(false);
  const [txSpeed, setTxSpeed] = useState<'auto' | 'manual'>('auto');
  const [priorityFee, setPriorityFee] = useState<string>('0.002');
  const [bribe, setBribe] = useState<string>('0.01');

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [debouncedFromAmount] = useDebounce(fromToken.amount, 350);

  // keep decimals for other UI parts (not used in preview path)
  const decimals = useMemo(() => {
    const d = Number((tokenInfo as any)?.decimals ?? 9);
    return clamp(Math.trunc(Number.isFinite(d) ? d : 9), 0, 18);
  }, [tokenInfo]);

  // ===== Fetch /token/info =====
  const fetchTokenInfo = useCallback(async () => {
    if (!tokenAddr) return;
    try {
      const info = await getTokenInfo(tokenAddr);
      setTokenInfo(info as any);
    } catch (e) {
      console.error('Error fetching /token/info:', e);
    }
  }, [tokenAddr]);

  // ===== Fetch /token/liquidity =====
  const fetchLiquidity = useCallback(async () => {
    if (!tokenAddr) return;
    try {
      const lq = await getTokenLiquidity(tokenAddr);
      setLiquidityEvents(lq?.events ?? []);
    } catch (e) {
      console.error('Error fetching /token/liquidity:', e);
      setLiquidityEvents([]);
    }
  }, [tokenAddr]);

  // ===== Fetch /token/holders =====
  const fetchHolders = useCallback(
    async (opts?: { reset?: boolean }) => {
      if (!tokenAddr) return;

      const reset = !!opts?.reset;
      const cursor = reset ? null : holdersNextCursor;

      if (!reset && cursor === null) return;

      setHoldersLoading(true);
      setHoldersError(null);

      try {
        const res = await getTokenHolders(tokenAddr, { limit: 200, cursor });
        const incoming = Array.isArray(res?.holders) ? res.holders : [];

        setHoldersNextCursor(res?.nextCursor ?? null);
        setHoldersAll((prev) => (reset ? incoming : [...prev, ...incoming]));
      } catch (e: any) {
        console.error('Error fetching /token/holders:', e);
        setHoldersError(e?.message || 'Failed to load holders');
        if (reset) {
          setHoldersAll([]);
          setHoldersNextCursor(null);
        }
      } finally {
        setHoldersLoading(false);
      }
    },
    [tokenAddr, holdersNextCursor]
  );

  // ===== Initial fetch when token changes =====
  useEffect(() => {
    if (!tokenAddr) return;

    setCurrentPage(1);
    setHoldersAll([]);
    setHoldersNextCursor(null);
    setHoldersError(null);

    // reset swap
    setFromToken({ symbol: 'SOL', amount: '' });
    setToToken({ symbol: '', amount: '' });
    setIsSwapped(false);

    fetchTokenInfo();
    fetchLiquidity();
    fetchHolders({ reset: true });
  }, [tokenAddr, fetchTokenInfo, fetchLiquidity, fetchHolders]);

  // ===== Sync symbols when tokenInfo ready =====
  useEffect(() => {
    if (!tokenInfo) return;
    const sym = String((tokenInfo as any)?.symbol ?? '').trim() || 'TOKEN';

    if (!isSwapped) {
      // BUY: SOL -> TOKEN
      setFromToken((prev) => ({ ...prev, symbol: 'SOL' }));
      setToToken((prev) => ({ ...prev, symbol: sym }));
    } else {
      // SELL: TOKEN -> SOL
      setFromToken((prev) => ({ ...prev, symbol: sym }));
      setToToken((prev) => ({ ...prev, symbol: 'SOL' }));
    }
  }, [tokenInfo, isSwapped]);

  // ===== Estimate output (PREVIEW) =====
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!tokenAddr || !tokenInfo) return;

      const raw = String(debouncedFromAmount ?? '').trim();
      if (!raw) {
        setToToken((prev) => ({ ...prev, amount: '' }));
        setIsCalculating(false);
        return;
      }

      const n = parseNumberInput(raw);
      if (!Number.isFinite(n) || n <= 0) {
        setToToken((prev) => ({ ...prev, amount: '' }));
        setIsCalculating(false);
        return;
      }

      setIsCalculating(true);

      try {
        if (!isSwapped) {
          // BUY: input SOL -> output TOKEN
          const est = await estimateTokensFromSol({ tokenAddr, solIn: n });
          if (cancelled) return;
          setToToken((prev) => ({ ...prev, amount: Number(est.tokenOutHuman).toFixed(3) }));
        } else {
          // SELL: input TOKEN -> output SOL
          const est = await estimateSolFromTokens({ tokenAddr, tokenInHuman: n });
          if (cancelled) return;
          setToToken((prev) => ({ ...prev, amount: Number(est.solOut).toFixed(6) }));
        }
      } catch {
        if (!cancelled) setToToken((prev) => ({ ...prev, amount: '' }));
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [debouncedFromAmount, isSwapped, tokenAddr, tokenInfo]);

  useEffect(() => {
    setActionButtonText(isSwapped ? (isApproved ? 'Sell' : 'Approve') : 'Buy');
  }, [isSwapped, isApproved]);

  const handleSwap = useCallback(() => {
    setIsSwapped((prev) => !prev);
    setFromToken((prev) => ({ ...prev, amount: '' }));
    setToToken((prev) => ({ ...prev, amount: '' }));
  }, []);

  const handleFromAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromToken((prev) => ({ ...prev, amount: e.target.value }));
    setIsCalculating(true);
  }, []);

  const pollStatus = useCallback(async (statusEndpointRaw: string) => {
    const statusEndpoint = normalizeTrackingEndpoint(statusEndpointRaw);
    if (!statusEndpoint) return null;

    for (let i = 0; i < POLL_MAX_TRIES; i++) {
      try {
        const st = (await getTradingStatus(statusEndpoint)) as TradingTxStatusResponse;
        const s = String((st as any)?.status ?? '').toUpperCase();
        if (s === 'CONFIRMED') return st;
        if (s === 'FAILED') return st;
      } catch {
        // ignore transient
      }
      await sleep(POLL_INTERVAL_MS);
    }
    return null;
  }, []);

  const handleAction = useCallback(async () => {
    if (!tokenAddr || !tokenInfo || !fromToken.amount) {
      toast.error('Missing required information');
      return;
    }

    if (!wallet?.connected || !wallet.publicKey) {
      toast.error('Connect wallet to trade');
      return;
    }
    if (!wallet.sendTransaction) {
      toast.error('Wallet does not support sendTransaction');
      return;
    }

    const rawIn = String(fromToken.amount).trim();
    const inNum = parseNumberInput(rawIn);
    if (!Number.isFinite(inNum) || inNum <= 0) {
      toast.error(isSwapped ? 'Invalid TOKEN amount' : 'Invalid SOL amount');
      return;
    }

    setIsTransacting(true);
    try {
      const slippagePct = 1; // TODO wire UI
      const slippageBps = clamp(Math.trunc(slippagePct * 100), 0, 10_000);

      // ===== Build quote depending BUY/SELL =====
      const idk = newIdempotencyKey(isSwapped ? 'sell' : 'buy');

      let quote: any;
      let txId: string;

      if (!isSwapped) {
        /**
         * ✅ BUY:
         * Spec preview-buy uses amountSol (human SOL).
         * Most BE buy endpoints take amountInSol (lamports string) OR amountSol.
         *
         * Current FE buyToken type expects amountInSol string (lamports) OR amountInToken.
         * -> we send lamports string, no more spot price conversions.
         */
        const amountInSol = toLamportsString(inNum);

        quote = (await buyToken(
          { tokenAddress: tokenAddr, amountInSol, slippageBps },
          { idempotencyKey: idk }
        )) as TradingBuyResponse;
      } else {
        /**
         * ✅ SELL:
         * preview-sell takes amountInToken as number (human).
         * But sell endpoint in your FE expects amountInToken (string, smallest units).
         *
         * => We keep existing behavior by converting human->base units IF token has decimals.
         * However: you removed price conversion; we still need base-units conversion.
         * If BE sell endpoint is also changed to accept human number, update this part accordingly.
         */
        const d = clamp(Math.trunc(Number((tokenInfo as any)?.decimals ?? decimals) || 9), 0, 18);
        const humanStr = inNum.toFixed(d);
        // base units string:
        const amountInToken = (() => {
          const [intsRaw, fracsRaw = ''] = String(humanStr).split('.');
          const ints = (intsRaw || '0').replace(/^0+(?=\d)/, '') || '0';
          const fracs = fracsRaw.replace(/[^\d]/g, '').slice(0, d).padEnd(d, '0');
          const joined = `${ints}${fracs}`.replace(/^0+(?=\d)/, '') || '0';
          return joined;
        })();

        if (!amountInToken || amountInToken === '0') throw new Error('Amount too small');

        quote = await sellToken(
          { tokenAddress: tokenAddr, amountInToken, slippageBps },
          { idempotencyKey: idk }
        );
      }

      const tracking = quote?.tracking || {};
      const submitEpRaw =
        tracking.submitSignatureEndpoint ||
        tracking.submitSignatureBySignatureEndpoint ||
        tracking.submitEndpoint ||
        '';
      const statusEpRaw =
        tracking.statusEndpoint ||
        tracking.statusBySignatureEndpoint ||
        tracking.status ||
        '';

      const submitEp = normalizeTrackingEndpoint(submitEpRaw);
      const statusEp = normalizeTrackingEndpoint(statusEpRaw);

      if (!quote?.txBase64 || !submitEp) {
        throw new Error('Invalid trade response (missing txBase64/tracking.submitSignatureEndpoint)');
      }

      txId = String(quote?.transactionId ?? quote?.id ?? '').trim();
      if (!txId) throw new Error('Missing transactionId/id from trade quote');

      // ===== Send tx on-chain =====
      const rawTx = Buffer.from(String(quote.txBase64), 'base64');
      const tx = VersionedTransaction.deserialize(rawTx);

      toast.info(isSwapped ? 'Sending SELL transaction...' : 'Sending BUY transaction...');

      const txSignature = await wallet.sendTransaction(tx, connection, {
        preflightCommitment: 'processed',
      });

      // ✅ submit signature immediately (don’t wait confirmed)
      toast.info('Submitting signature to backend...');
      await submitSignature(submitEp, { id: txId, txSignature } as any);

      // optional confirm “background”
      connection.confirmTransaction(txSignature, 'processed').catch(() => {});

      if (!statusEp) {
        toast.success('Submitted (no status endpoint).');
        setRefreshCounter((prev) => prev + 1);
        fetchLiquidity();
        return;
      }

      toast.info('Checking backend status...');
      const st = await pollStatus(statusEp);
      const finalStatus = String((st as any)?.status ?? '').toUpperCase();

      if (finalStatus === 'CONFIRMED') {
        toast.success(isSwapped ? 'Sell confirmed' : 'Buy confirmed');
        setRefreshCounter((prev) => prev + 1);
        fetchLiquidity();
      } else if (finalStatus === 'FAILED') {
        toast.error(`Trade failed${(st as any)?.error ? `: ${(st as any).error}` : ''}`);
      } else {
        toast.success('Submitted. Status pending.');
      }
    } catch (e: any) {
      console.error('Trade flow error:', e);
      toast.error(e?.message || 'Trade failed');
    } finally {
      setIsTransacting(false);
    }
  }, [tokenAddr, tokenInfo, fromToken.amount, isSwapped, wallet, connection, fetchLiquidity, pollStatus, decimals]);

  const handleMaxClick = () => {
    // placeholder only
    if (isSwapped) setFromToken((prev) => ({ ...prev, amount: tokenBalance }));
    else setFromToken((prev) => ({ ...prev, amount: ethBalance }));
  };

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  if (!tokenInfo) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-height-screen min-h-screen">
          <Spinner size="large" />
        </div>
      </Layout>
    );
  }

  const tokenSymbol = String((tokenInfo as any)?.symbol ?? '').trim();

  return (
    <Layout>
      <SEO token={tokenInfo as any} />

      <div className="lg:hidden mb-6">
        <TokenInfo
          tokenInfo={tokenInfo as any}
          showHeader={true}
          refreshTrigger={refreshCounter}
          liquidityEvents={liquidityEvents}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-300 truncate">
                  {(tokenInfo as any).name || (tokenInfo as any).symbol}
                </h2>
              </div>

              <TradingViewChart liquidityEvents={liquidityEvents} tokenInfo={tokenInfo as any} />
            </div>

            {/* Quick Actions - Mobile */}
            <div className="lg:hidden card gradient-border p-4 relative">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-400">Slippage (%)</label>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpenMobile((v) => !v)}
                  className="rounded-md bg-[var(--card)] border-thin px-2 py-1 text-sm text-gray-300 hover:text-white"
                  aria-label="Settings"
                >
                  ⚙️
                </button>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={() => setIsSwapped(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin ${
                    !isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'
                  }`}
                  type="button"
                >
                  BUY
                </button>
                <button
                  onClick={() => setIsSwapped(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin ${
                    isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'
                  }`}
                  type="button"
                >
                  SELL
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">From</span>
                  <span className="text-gray-400">Balance: {isSwapped ? tokenBalance : ethBalance}</span>
                </div>

                <div className="flex items-center bg-[var(--card)] rounded-lg p-3 border-thin">
                  <input
                    type="number"
                    value={fromToken.amount}
                    onChange={handleFromAmountChange}
                    className="w-full bg-transparent text-white outline-none text-sm"
                    placeholder="0.00"
                    disabled={isTransacting}
                  />
                  <div className="ml-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">{fromToken.symbol || 'SOL'}</span>
                    <button
                      onClick={handleMaxClick}
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium px-2 py-1 rounded transition-colors"
                      type="button"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSwap}
                className="w-full flex justify-center p-2 text-gray-400 hover:text-[var(--primary)]"
                type="button"
              >
                <ArrowUpDownIcon size={20} />
              </button>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">To</span>
                  <span className="text-gray-400">Balance: {isSwapped ? ethBalance : tokenBalance}</span>
                </div>

                <div className="flex items-center bg-[var(--card)] rounded-lg p-3 border-thin">
                  <input
                    type="text"
                    value={isCalculating ? 'Calculating...' : toToken.amount}
                    readOnly
                    className="w-full bg-transparent text-white outline-none text-sm"
                    placeholder={isSwapped ? '0.000000' : '0.000'}
                  />
                  <span className="ml-2 text-xs text-gray-400">{toToken.symbol || tokenSymbol}</span>
                </div>

                {!isSwapped && PRICE_UNIT === 'SOL' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Input SOL → estimated token out (rounded 3 decimals).
                  </div>
                )}
                {isSwapped && PRICE_UNIT === 'SOL' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Input TOKEN → estimated SOL out (rounded 6 decimals).
                  </div>
                )}
              </div>

              <button
                onClick={handleAction}
                disabled={!fromToken.amount || isCalculating || isTransacting}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isTransacting ? 'Processing...' : actionButtonText}
              </button>

              {isSettingsOpenMobile && (
                <div className="absolute right-4 top-20 z-20 w-[320px] bg-[var(--card2)] border-thin rounded-xl shadow-xl p-4">
                  <SettingsPanel
                    antiMEV={antiMEV}
                    setAntiMEV={setAntiMEV}
                    txSpeed={txSpeed}
                    setTxSpeed={setTxSpeed}
                    priorityFee={priorityFee}
                    setPriorityFee={setPriorityFee}
                    bribe={bribe}
                    setBribe={setBribe}
                    onClose={() => setIsSettingsOpenMobile(false)}
                  />
                </div>
              )}
            </div>

            {/* Trades / Chat / Holders */}
            <div className="card gradient-border p-4">
              <Tab.Group>
                <Tab.List className="flex space-x-1 rounded-lg bg-[var(--card2)] p-1 mb-4 border-thin">
                  {['Trades', 'Chat', 'Holders'].map((t) => (
                    <Tab
                      key={t}
                      className={({ selected }) =>
                        `w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors ${
                          selected
                            ? 'bg-[var(--card-boarder)] text-white'
                            : 'text-gray-400 hover:bg-[var(--card-hover)] hover:text-white'
                        }`
                      }
                    >
                      {t}
                    </Tab>
                  ))}
                </Tab.List>

                <Tab.Panels>
                  <Tab.Panel>
                    <TransactionHistory tokenAddress={tokenAddr as string} />
                  </Tab.Panel>

                  <Tab.Panel>
                    <Chats tokenAddress={tokenAddr as string} tokenInfo={tokenInfo as any} />
                  </Tab.Panel>

                  <Tab.Panel>
                    {holdersError && (
                      <div className="mb-3 text-sm text-red-400">Failed to load holders: {holdersError}</div>
                    )}

                    <TokenHolders
                      tokenHolders={[]}
                      currentPage={currentPage}
                      totalPages={1}
                      tokenSymbol={tokenSymbol}
                      creatorAddress={(tokenInfo as any).creatorAddress}
                      tokenAddress={tokenAddr as string}
                      onPageChange={paginate}
                      allHolders={holdersAll}
                    />

                    <div className="mt-4 flex items-center justify-center gap-3">
                      {holdersNextCursor && (
                        <button
                          type="button"
                          onClick={() => fetchHolders({ reset: false })}
                          disabled={holdersLoading}
                          className="btn-secondary px-4 py-2 rounded disabled:opacity-50"
                        >
                          {holdersLoading ? 'Loading...' : 'Load more'}
                        </button>
                      )}

                      {!holdersNextCursor && holdersAll.length > 0 && (
                        <div className="text-sm text-gray-400">All holders loaded</div>
                      )}
                    </div>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            <div className="hidden lg:block card gradient-border p-4 relative">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-400">Slippage (%)</label>
                <button
                  type="button"
                  onClick={() => setIsSettingsOpenDesktop((v) => !v)}
                  className="rounded-md bg-[var(--card)] border-thin px-2 py-1 text-sm text-gray-300 hover:text-white"
                  aria-label="Settings"
                >
                  ⚙️
                </button>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <button
                  onClick={() => setIsSwapped(false)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin ${
                    !isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'
                  }`}
                  type="button"
                >
                  BUY
                </button>
                <button
                  onClick={() => setIsSwapped(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin ${
                    isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'
                  }`}
                  type="button"
                >
                  SELL
                </button>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">From</span>
                  <span className="text-gray-400">Balance: {isSwapped ? tokenBalance : ethBalance}</span>
                </div>

                <div className="flex items-center bg-[var(--card)] rounded-lg p-3 border-thin">
                  <input
                    type="number"
                    value={fromToken.amount}
                    onChange={handleFromAmountChange}
                    className="w-full bg-transparent text-white outline-none text-sm"
                    placeholder="0.00"
                    disabled={isTransacting}
                  />
                  <div className="ml-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400">{fromToken.symbol || 'SOL'}</span>
                    <button
                      onClick={handleMaxClick}
                      className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium px-2 py-1 rounded transition-colors"
                      type="button"
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSwap}
                className="w-full flex justify-center p-2 text-gray-400 hover:text-[var(--primary)]"
                type="button"
              >
                <ArrowUpDownIcon size={20} />
              </button>

              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">To (Estimated)</span>
                  <span className="text-gray-400">Balance: {isSwapped ? ethBalance : tokenBalance}</span>
                </div>

                <div className="flex items-center bg-[var(--card)] rounded-lg p-3 border-thin">
                  <input
                    type="text"
                    value={isCalculating ? 'Calculating...' : toToken.amount}
                    readOnly
                    className="w-full bg-transparent text-white outline-none text-sm"
                    placeholder={isSwapped ? '0.000000' : '0.000'}
                  />
                  <span className="ml-2 text-xs text-gray-400">{toToken.symbol || tokenSymbol}</span>
                </div>

                {!isSwapped && PRICE_UNIT === 'SOL' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Input SOL → estimated token out (rounded 3 decimals).
                  </div>
                )}
                {isSwapped && PRICE_UNIT === 'SOL' && (
                  <div className="mt-2 text-xs text-gray-500">
                    Input TOKEN → estimated SOL out (rounded 6 decimals).
                  </div>
                )}
              </div>

              <button
                onClick={handleAction}
                disabled={!fromToken.amount || isCalculating || isTransacting}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                type="button"
              >
                {isTransacting ? 'Processing...' : actionButtonText}
              </button>

              {isSettingsOpenDesktop && (
                <div className="absolute right-4 top-20 z-20 w-[320px] bg-[var(--card2)] border-thin rounded-xl shadow-xl p-4">
                  <SettingsPanel
                    antiMEV={antiMEV}
                    setAntiMEV={setAntiMEV}
                    txSpeed={txSpeed}
                    setTxSpeed={setTxSpeed}
                    priorityFee={priorityFee}
                    setPriorityFee={setPriorityFee}
                    bribe={bribe}
                    setBribe={setBribe}
                    onClose={() => setIsSettingsOpenDesktop(false)}
                  />
                </div>
              )}
            </div>

            <div className="hidden lg:block card gradient-border p-4">
              <TokenInfo
                tokenInfo={tokenInfo as any}
                showHeader={true}
                refreshTrigger={refreshCounter}
                liquidityEvents={liquidityEvents}
              />
            </div>
          </div>
        </div>

        <ShareButton tokenInfo={tokenInfo as any} />
      </div>
    </Layout>
  );
};

function SettingsPanel(props: {
  antiMEV: boolean;
  setAntiMEV: (v: boolean) => void;
  txSpeed: 'auto' | 'manual';
  setTxSpeed: (v: 'auto' | 'manual') => void;
  priorityFee: string;
  setPriorityFee: (v: string) => void;
  bribe: string;
  setBribe: (v: string) => void;
  onClose: () => void;
}) {
  const { antiMEV, setAntiMEV, txSpeed, setTxSpeed, priorityFee, setPriorityFee, bribe, setBribe, onClose } = props;

  const activeBtn = 'px-3 py-1 rounded-md bg-[var(--primary)] text-white';
  const idleBtn = 'px-3 py-1 rounded-md bg-[var(--card)] text-gray-300 border-thin hover:text-white';

  return (
    <>
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Anti-MEV Protection</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setAntiMEV(true)} className={antiMEV ? activeBtn : idleBtn} type="button">
              ON
            </button>
            <button onClick={() => setAntiMEV(false)} className={!antiMEV ? activeBtn : idleBtn} type="button">
              OFF
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Transaction Speed</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setTxSpeed('auto')} className={txSpeed === 'auto' ? activeBtn : idleBtn} type="button">
              AUTO
            </button>
            <button
              onClick={() => setTxSpeed('manual')}
              className={txSpeed === 'manual' ? activeBtn : idleBtn}
              type="button"
            >
              MANUAL
            </button>
          </div>
        </div>

        <div>
          <label className="text-gray-300 block mb-1">Priority Fee (SOL)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={priorityFee}
            onChange={(e) => setPriorityFee(e.target.value)}
            className="w-full bg-[var(--card)] border-thin rounded-md px-3 py-2 text-white outline-none"
            placeholder="0.002"
            disabled={txSpeed === 'auto'}
          />
        </div>

        <div>
          <label className="text-gray-300 block mb-1">Bribe (SOL)</label>
          <input
            type="number"
            min="0"
            step="0.001"
            value={bribe}
            onChange={(e) => setBribe(e.target.value)}
            className="w-full bg-[var(--card)] border-thin rounded-md px-3 py-2 text-white outline-none"
            placeholder="0.01"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          onClick={onClose}
          className="px-3 py-1 rounded-md bg-[var(--card)] border-thin text-sm text-gray-300 hover:text-white"
          type="button"
        >
          Close
        </button>
      </div>
    </>
  );
}

// ✅ SSR: dùng /token/info
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { address } = context.params as { address: string };

  try {
    const info = await getTokenInfo(address);
    return { props: { initialTokenInfo: (info as any) ?? null } };
  } catch (e) {
    console.error('SSR getTokenInfo failed:', e);
    return { props: { initialTokenInfo: null } };
  }
};

export default TokenDetail;