// src/pages/token/[address].tsx
import { GetServerSideProps } from 'next';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/router';
import { ArrowUpDownIcon } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import TradingViewChart from '@/components/charts/TradingViewChart';

import {
  getTokenInfo, // ✅ /token/info
  getTokenLiquidity, // ✅ /token/liquidity
} from '@/utils/api.index';

import { useDebounce } from 'use-debounce';
import { toast } from 'react-toastify';
import ShareButton from '@/components/ui/ShareButton';
import SEO from '@/components/seo/SEO';
import { Token } from '@/interface/types';
import Spinner from '@/components/ui/Spinner';
import { Tab } from '@headlessui/react';

import TransactionHistory from '@/components/TokenDetails/TransactionHistory';
import TokenHolders from '@/components/TokenDetails/TokenHolders';
import TokenInfo from '@/components/TokenDetails/TokenInfo';
import Chats from '@/components/TokenDetails/Chats';

interface TokenDetailProps {
  initialTokenInfo: Token | null;
}

const TokenDetail: React.FC<TokenDetailProps> = ({ initialTokenInfo }) => {
  const router = useRouter();
  const { address } = router.query;

  const tokenAddr = useMemo(() => {
    const a = Array.isArray(address) ? address[0] : address;
    return a || undefined;
  }, [address]);

  // ===== Core token info =====
  const [tokenInfo, setTokenInfo] = useState<Token | null>(initialTokenInfo);

  // ===== Liquidity =====
  const [liquidityEvents, setLiquidityEvents] = useState<any>(null);

  // ===== Tabs data (legacy removed, UI still keeps) =====
  const [transactions] = useState<any[]>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [totalTransactionPages] = useState(1);

  const [tokenHolders] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  // ===== Swap UI state (keep UI/UX; Solana trade chưa tích hợp) =====
  const isApproved = true;
  const [fromToken, setFromToken] = useState({ symbol: 'SOL', amount: '' });
  const [toToken, setToToken] = useState({ symbol: '', amount: '' });
  const [isSwapped, setIsSwapped] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [ethBalance] = useState('0.000');
  const [tokenBalance] = useState('0.000');
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
  const [debouncedFromAmount] = useDebounce(fromToken.amount, 300);

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

  // ===== Initial fetch when token changes =====
  useEffect(() => {
    if (!tokenAddr) return;
    fetchTokenInfo();
    fetchLiquidity();
  }, [tokenAddr, fetchTokenInfo, fetchLiquidity]);

  // ===== Sync token labels when tokenInfo ready =====
  useEffect(() => {
    if (!tokenInfo) return;
    setFromToken((prev) => ({
      symbol: isSwapped ? (tokenInfo as any).symbol : 'SOL',
      amount: prev.amount,
    }));
    setToToken((prev) => ({
      symbol: isSwapped ? 'SOL' : (tokenInfo as any).symbol,
      amount: prev.amount,
    }));
  }, [tokenInfo, isSwapped]);

  // ===== Estimate "To" (page không có priceInfo nữa) =====
  useEffect(() => {
    const amt = Number(debouncedFromAmount || 0);
    if (!amt) {
      setToToken((prev) => ({ ...prev, amount: '' }));
      setIsCalculating(false);
      return;
    }

    // chưa có price ở page => để trống (tránh hiển thị sai)
    setIsCalculating(true);
    setToToken((prev) => ({ ...prev, amount: '' }));
    setIsCalculating(false);
  }, [debouncedFromAmount, isSwapped]);

  useEffect(() => {
    setActionButtonText(isSwapped ? (isApproved ? 'Sell' : 'Approve') : 'Buy');
  }, [isSwapped, isApproved]);

  const handleSwap = useCallback(() => {
    setIsSwapped((prev) => !prev);
    setFromToken((prev) => ({
      symbol: prev.symbol === 'SOL' ? ((tokenInfo as any)?.symbol ?? '') : 'SOL',
      amount: '',
    }));
    setToToken((prev) => ({
      symbol: prev.symbol === 'SOL' ? ((tokenInfo as any)?.symbol ?? '') : 'SOL',
      amount: '',
    }));
  }, [tokenInfo]);

  const handleFromAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromToken((prev) => ({ ...prev, amount: e.target.value }));
    setIsCalculating(true);
  }, []);

  const handleAction = useCallback(async () => {
    if (!tokenAddr || !fromToken.amount) {
      toast.error('Missing required information');
      return;
    }

    setIsTransacting(true);
    try {
      toast.info('Trading is not available yet (Solana integration pending).');
      setRefreshCounter((prev) => prev + 1);
    } finally {
      setIsTransacting(false);
    }
  }, [tokenAddr, fromToken.amount]);

  const handlePageChange = useCallback((newPage: number) => {
    setTransactionPage(newPage);
  }, []);

  const handleMaxClick = () => {
    if (isSwapped) {
      setFromToken((prev) => ({ ...prev, amount: tokenBalance }));
    } else {
      const maxSol = (Number(ethBalance || 0) * 0.95).toString();
      setFromToken((prev) => ({ ...prev, amount: maxSol }));
    }
  };

  // holders paging placeholders (UI only)
  const currentHolders = tokenHolders; // currently empty (UI keeps)
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

  return (
    <Layout>
      <SEO token={tokenInfo as any} />

      {/* Mobile header */}
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
          {/* Left */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-300 truncate">
                  {(tokenInfo as any).name || (tokenInfo as any).symbol}
                </h2>
              </div>

              {/* ✅ Chart tự handle timeframe + fetch price */}
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
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin
                    ${!isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'}`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setIsSwapped(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin
                    ${isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'}`}
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
                  <button
                    onClick={handleMaxClick}
                    className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium px-2 py-1 rounded transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button onClick={handleSwap} className="w-full flex justify-center p-2 text-gray-400 hover:text-[var(--primary)]">
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
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                onClick={handleAction}
                disabled={!fromToken.amount || isCalculating || isTransacting}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors
                      ${selected ? 'bg-[var(--card-boarder)] text-white' : 'text-gray-400 hover:bg-[var(--card-hover)] hover:text-white'}`
                    }
                  >
                    Trades
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors
                      ${selected ? 'bg-[var(--card-boarder)] text-white' : 'text-gray-400 hover:bg-[var(--card-hover)] hover:text-white'}`
                    }
                  >
                    Chat
                  </Tab>
                  <Tab
                    className={({ selected }) =>
                      `w-full rounded-md py-2.5 text-sm font-medium leading-5 transition-colors
                      ${selected ? 'bg-[var(--card-boarder)] text-white' : 'text-gray-400 hover:bg-[var(--card-hover)] hover:text-white'}`
                    }
                  >
                    Holders
                  </Tab>
                </Tab.List>

                <Tab.Panels>
                  <Tab.Panel>
                    <TransactionHistory
                      transactions={transactions}
                      transactionPage={transactionPage}
                      totalTransactionPages={totalTransactionPages}
                      tokenSymbol={(tokenInfo as any).symbol}
                      handlePageChange={handlePageChange}
                    />
                  </Tab.Panel>

                  <Tab.Panel>
                    <Chats tokenAddress={tokenAddr as string} tokenInfo={tokenInfo as any} />
                  </Tab.Panel>

                  <Tab.Panel>
                    <TokenHolders
                      tokenHolders={currentHolders}
                      currentPage={currentPage}
                      totalPages={1}
                      tokenSymbol={(tokenInfo as any).symbol}
                      creatorAddress={(tokenInfo as any).creatorAddress}
                      tokenAddress={tokenAddr as string}
                      onPageChange={paginate}
                      allHolders={tokenHolders}
                    />
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">
            {/* Quick Actions (desktop) */}
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
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin
                    ${!isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'}`}
                >
                  BUY
                </button>
                <button
                  onClick={() => setIsSwapped(true)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border-thin
                    ${isSwapped ? 'bg-[var(--primary)] text-white' : 'bg-[var(--card)] text-gray-300 hover:text-white'}`}
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
                  <button
                    onClick={handleMaxClick}
                    className="text-xs text-[var(--primary)] hover:text-[var(--primary-hover)] font-medium px-2 py-1 rounded transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>

              <button onClick={handleSwap} className="w-full flex justify-center p-2 text-gray-400 hover:text-[var(--primary)]">
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
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button
                onClick={handleAction}
                disabled={!fromToken.amount || isCalculating || isTransacting}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
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

            {/* Token Info Header (desktop) */}
            <div className="hidden lg:block card gradient-border p-4">
              <TokenInfo tokenInfo={tokenInfo as any} showHeader={true} refreshTrigger={refreshCounter} liquidityEvents={liquidityEvents} />
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
            <button onClick={() => setAntiMEV(true)} className={antiMEV ? activeBtn : idleBtn}>
              ON
            </button>
            <button onClick={() => setAntiMEV(false)} className={!antiMEV ? activeBtn : idleBtn}>
              OFF
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-300">Transaction Speed</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setTxSpeed('auto')} className={txSpeed === 'auto' ? activeBtn : idleBtn}>
              AUTO
            </button>
            <button onClick={() => setTxSpeed('manual')} className={txSpeed === 'manual' ? activeBtn : idleBtn}>
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
        <button onClick={onClose} className="px-3 py-1 rounded-md bg-[var(--card)] border-thin text-sm text-gray-300 hover:text-white">
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
