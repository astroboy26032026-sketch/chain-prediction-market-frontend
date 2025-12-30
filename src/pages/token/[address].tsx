import { GetServerSideProps } from 'next';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import 'chartjs-adapter-date-fns';
import {
  ArrowUpDownIcon,
  Globe,
  Twitter,
  Send as Telegram,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import TradingViewChart from '@/components/charts/TradingViewChart';
import {
  useCurrentTokenPrice,
  useTokenLiquidity,
  useCalcBuyReturn,
  useCalcSellReturn,
  useBuyTokens,
  useSellTokens,
  useUserBalance,
  useTokenAllowance,
  useApproveTokens,
  formatAmountV2,
  getBondingCurveAddress,
} from '@/utils/blockchainUtils';
import {
  getTokenInfoAndTransactions,
  getTokenUSDPriceHistory,
  getTokenHolders,
  getTokenLiquidityEvents,
} from '@/utils/api.index';
import { parseUnits, formatUnits } from 'viem';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useDebounce } from 'use-debounce';
import { toast } from 'react-toastify';
import ShareButton from '@/components/ui/ShareButton';
import SEO from '@/components/seo/SEO';
import { TokenWithTransactions } from '@/interface/types';
import Spinner from '@/components/ui/Spinner';
import { Tab } from '@headlessui/react';

import TransactionHistory from '@/components/TokenDetails/TransactionHistory';
import TokenHolders from '@/components/TokenDetails/TokenHolders';
import TokenInfo from '@/components/TokenDetails/TokenInfo';
import Chats from '@/components/TokenDetails/Chats';

interface TokenDetailProps {
  initialTokenInfo: TokenWithTransactions | null;
}

// Token detail page
const TokenDetail: React.FC<TokenDetailProps> = ({ initialTokenInfo }) => {
  const router = useRouter();
  const { address } = router.query;
  const { address: userAddress } = useAccount();

  const [isApproved, setIsApproved] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenWithTransactions | null>(initialTokenInfo);

  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionPage, setTransactionPage] = useState(1);
  const [totalTransactionPages, setTotalTransactionPages] = useState(1);
  const [fromToken, setFromToken] = useState({ symbol: 'BONE', amount: '' });
  const [toToken, setToToken] = useState({ symbol: '', amount: '' });
  const [isSwapped, setIsSwapped] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [ethBalance, setEthBalance] = useState('0.000');
  const [tokenBalance, setTokenBalance] = useState('0.000');
  const [actionButtonText, setActionButtonText] = useState('Buy');
  const [chartError, setChartError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isTransacting, setIsTransacting] = useState(false);
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | undefined>();

  // holders
  const [tokenHolders, setTokenHolders] = useState<Awaited<ReturnType<typeof getTokenHolders>>>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [holdersPerPage] = useState(10);

  // settings ui state
  const [isSettingsOpenMobile, setIsSettingsOpenMobile] = useState(false);
  const [isSettingsOpenDesktop, setIsSettingsOpenDesktop] = useState(false);
  const [slippage, setSlippage] = useState<string>('1.0');
  const [antiMEV, setAntiMEV] = useState<boolean>(false);
  const [txSpeed, setTxSpeed] = useState<'auto' | 'manual'>('auto');
  const [priorityFee, setPriorityFee] = useState<string>('0.002'); // SOL
  const [bribe, setBribe] = useState<string>('0.01'); // SOL

  // confirm
  const { data: transactionReceipt, isError: transactionError, isLoading: isWaiting } = useWaitForTransactionReceipt({
    hash: transactionHash,
    confirmations: 2,
  });

  const [debouncedFromAmount] = useDebounce(fromToken.amount, 300);

  const tokenAddr = (address as `0x${string}`) || undefined;

  const { data: currentPrice, refetch: refetchCurrentPrice } = useCurrentTokenPrice(tokenAddr as `0x${string}`);
  const { data: liquidityData, refetch: refetchLiquidity } = useTokenLiquidity(tokenAddr as `0x${string}`);

  const { data: buyReturnData, isLoading: isBuyCalculating } =
    useCalcBuyReturn(tokenAddr as `0x${string}`, parseUnits(debouncedFromAmount || '0', 18));
  const { data: sellReturnData, isLoading: isSellCalculating } =
    useCalcSellReturn(tokenAddr as `0x${string}`, parseUnits(debouncedFromAmount || '0', 18));

  const {
    ethBalance: fetchedEthBalance,
    tokenBalance: fetchedTokenBalance,
    refetch: refetchUserBalance,
  } = useUserBalance(userAddress as `0x${string}`, tokenAddr as `0x${string}`);

  const { data: tokenAllowance } = useTokenAllowance(
    tokenAddr as `0x${string}`,
    userAddress as `0x${string}`,
    getBondingCurveAddress(tokenAddr as `0x${string}`)
  );

  const { buyTokens } = useBuyTokens();
  const { sellTokens } = useSellTokens();
  const { approveTokens } = useApproveTokens();

  const [liquidityEvents, setLiquidityEvents] = useState<any>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const fetchTokenData = useCallback(
    async (page: number) => {
      if (!tokenAddr) return;
      try {
        const data = await getTokenInfoAndTransactions(tokenAddr as string, page, 10);
        setTokenInfo(data);
        setTransactions(data.transactions.data);
        setTotalTransactionPages(data.transactions.pagination.totalPages);
      } catch (error) {
        console.error('Error fetching token data:', error);
      }
    },
    [tokenAddr]
  );

  const fetchHistoricalPriceData = useCallback(async () => {
    if (!tokenAddr) return;
    try {
      const historicalData = await getTokenUSDPriceHistory(tokenAddr as string);
      if (Array.isArray(historicalData) && historicalData.length > 0) {
        const formattedData = historicalData.map((item, index, arr) => {
          const prevItem = arr[index - 1] || item;
          return {
            time: new Date(item.timestamp).getTime() / 1000,
            open: parseFloat(prevItem.tokenPriceUSD),
            high: Math.max(parseFloat(prevItem.tokenPriceUSD), parseFloat(item.tokenPriceUSD)),
            low: Math.min(parseFloat(prevItem.tokenPriceUSD), parseFloat(item.tokenPriceUSD)),
            close: parseFloat(item.tokenPriceUSD),
          };
        });
        setChartData(formattedData);
      }
    } catch (error) {
      console.error('Error fetching historical price data:', error);
      setChartError('Failed to load chart data');
    }
  }, [tokenAddr]);

  const fetchTokenHolders = async () => {
    if (!tokenAddr) return;
    try {
      const holders = await getTokenHolders(tokenAddr as string);
      setTokenHolders(holders);
    } catch (error) {
      console.error('Error fetching token holders:', error);
      toast.error('Failed to fetch token holders');
    }
  };

  const indexOfLastHolder = currentPage * holdersPerPage;
  const indexOfFirstHolder = indexOfLastHolder - holdersPerPage;
  const currentHolders = tokenHolders.slice(indexOfFirstHolder, indexOfLastHolder);
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const fetchAllData = useCallback(async () => {
    if (!tokenAddr) return;

    await fetchTokenData(transactionPage);
    await fetchHistoricalPriceData();
    refetchCurrentPrice();
    refetchLiquidity();
    fetchTokenHolders();
    refetchUserBalance();

    try {
      // Dùng address khi tokenInfo chưa có
      const idForEvents = tokenInfo?.id ?? (tokenAddr as string);
      const events = await getTokenLiquidityEvents(idForEvents);
      setLiquidityEvents(events);
    } catch (error) {
      console.error('Error fetching liquidity events:', error);
    }
  }, [
    tokenAddr,
    transactionPage,
    fetchTokenData,
    fetchHistoricalPriceData,
    refetchCurrentPrice,
    refetchLiquidity,
    refetchUserBalance,
    tokenInfo?.id,
  ]);

  // Nếu vào trang bằng link list -> sẽ chạy client fetch ngay cả khi SSR fail
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    if (tokenAllowance !== undefined && tokenAddr) {
      setIsApproved(typeof tokenAllowance === 'bigint' && tokenAllowance > BigInt(0));
    }
  }, [tokenAllowance, tokenAddr]);

  useEffect(() => {
    if (fetchedEthBalance) {
      setEthBalance(parseFloat(formatUnits(fetchedEthBalance, 18)).toFixed(5));
    }
    if (fetchedTokenBalance) {
      setTokenBalance(parseFloat(formatUnits(fetchedTokenBalance, 18)).toFixed(5));
    }
  }, [fetchedEthBalance, fetchedTokenBalance]);

  useEffect(() => {
    if (transactionReceipt && !transactionError) {
      if (isSwapped) {
        if (!isApproved) {
          setIsApproved(true);
          toast.success('Token approval successful');
        } else {
          toast.success('Tokens sold successfully');
        }
      } else {
        toast.success('Tokens bought successfully');
      }
      fetchAllData();
      setIsTransacting(false);
      setRefreshCounter((prev) => prev + 1);
    } else if (transactionError) {
      toast.error('Transaction failed');
      setIsTransacting(false);
    }
  }, [transactionReceipt, transactionError, isSwapped, isApproved, fetchAllData]);

  // Đồng bộ nhãn token sau khi tokenInfo sẵn sàng
  useEffect(() => {
    if (!tokenInfo) return;
    setFromToken((prev) => ({
      symbol: isSwapped ? tokenInfo.symbol : 'BONE',
      amount: prev.amount,
    }));
    setToToken((prev) => ({
      symbol: isSwapped ? 'BONE' : tokenInfo.symbol,
      amount: prev.amount,
    }));
  }, [tokenInfo, isSwapped]);

  useEffect(() => {
    if (debouncedFromAmount) {
      setIsCalculating(true);
      if (isSwapped) {
        // Selling tokens
        if (sellReturnData !== undefined && !isSellCalculating) {
          const ethAmount = formatUnits(sellReturnData, 18);
          setToToken((prev) => ({ ...prev, amount: ethAmount }));
          setIsCalculating(false);
        }
      } else {
        // Buying tokens
        if (buyReturnData !== undefined && !isBuyCalculating) {
          const tokenAmount = formatUnits(buyReturnData, 18);
          setToToken((prev) => ({ ...prev, amount: tokenAmount }));
          setIsCalculating(false);
        }
      }
    } else {
      setToToken((prev) => ({ ...prev, amount: '' }));
      setIsCalculating(false);
    }
  }, [debouncedFromAmount, buyReturnData, sellReturnData, isSwapped, isBuyCalculating, isSellCalculating]);

  useEffect(() => {
    setActionButtonText(isSwapped ? (isApproved ? 'Sell' : 'Approve') : 'Buy');
  }, [isSwapped, isApproved]);

  const handleSwap = useCallback(() => {
    setIsSwapped((prev) => !prev);
    setFromToken((prev) => ({
      symbol: prev.symbol === 'BONE' ? (tokenInfo?.symbol ?? '') : 'BONE',
      amount: '',
    }));
    setToToken((prev) => ({
      symbol: prev.symbol === 'BONE' ? (tokenInfo?.symbol ?? '') : 'BONE',
      amount: '',
    }));
  }, [tokenInfo?.symbol]);

  const handleFromAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromToken((prev) => ({ ...prev, amount: e.target.value }));
    setIsCalculating(true);
  }, []);

  const handleAction = useCallback(async () => {
    if (!tokenAddr || !fromToken.amount || !userAddress) {
      toast.error('Missing required information');
      return;
    }

    const amount = parseUnits(fromToken.amount, 18);
    setIsTransacting(true);

    try {
      let txHash;
      if (isSwapped) {
        if (!isApproved) {
          txHash = await approveTokens(tokenAddr as `0x${string}`);
        } else {
          txHash = await sellTokens(tokenAddr as `0x${string}`, amount);
        }
      } else {
        txHash = await buyTokens(tokenAddr as `0x${string}`, amount);
      }
      setTransactionHash(txHash as `0x${string}`);
    } catch (error) {
      console.error('Transaction error:', error);
      toast.error('Transaction failed to initiate: ' + (error as Error).message);
      setIsTransacting(false);
    }
  }, [tokenAddr, fromToken.amount, userAddress, isSwapped, isApproved, approveTokens, sellTokens, buyTokens]);

  useEffect(() => {
    if (!isWaiting && !transactionError) {
      setIsTransacting(false);
      setTransactionHash(undefined);
    }
  }, [isWaiting, transactionError]);

  const handlePageChange = useCallback((newPage: number) => {
    setTransactionPage(newPage);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  const handleMaxClick = () => {
    if (isSwapped) {
      if (fetchedTokenBalance) {
        const exactTokenBalance = formatUnits(fetchedTokenBalance, 18);
        setFromToken((prev) => ({ ...prev, amount: exactTokenBalance }));
      }
    } else {
      if (fetchedEthBalance) {
        const exactEthBalance = formatUnits(fetchedEthBalance, 18);
        const maxEthAmount = (parseFloat(exactEthBalance) * 0.95).toString();
        setFromToken((prev) => ({ ...prev, amount: maxEthAmount }));
      }
    }
  };

  if (!tokenInfo) {
    // Khi SSR fail hoặc đang fetch lần đầu
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
      <SEO token={tokenInfo} />

      {/* Mobile header */}
      <div className="lg:hidden mb-6">
        <TokenInfo
          tokenInfo={tokenInfo}
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
              <h2 className="text-sm font-semibold text-gray-300">
                {tokenInfo.name || tokenInfo.symbol}
              </h2>
              <TradingViewChart
                data={chartData}
                liquidityEvents={liquidityEvents}
                tokenInfo={tokenInfo}
              />
            </div>

            {/* Quick Actions - Mobile */}
            <div className="lg:hidden card gradient-border p-4 relative">
              {/* Header: Slippage label + Settings button (NO input) */}
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

              {/* Buy / Sell toggle (primary color like action button) */}
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

              {/* From */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">From</span>
                  <span className="text-gray-400">
                    Balance: {isSwapped ? tokenBalance : ethBalance}
                  </span>
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

              {/* Swap */}
              <button
                onClick={handleSwap}
                className="w-full flex justify-center p-2 text-gray-400 hover:text-[var(--primary)]"
              >
                <ArrowUpDownIcon size={20} />
              </button>

              {/* To */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">To</span>
                  <span className="text-gray-400">
                    Balance: {isSwapped ? ethBalance : tokenBalance}
                  </span>
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

              {/* Action */}
              <button
                onClick={handleAction}
                disabled={!fromToken.amount || isCalculating || isTransacting}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTransacting ? 'Processing...' : actionButtonText}
              </button>

              {/* Settings Popover (mobile) */}
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
                      tokenSymbol={tokenInfo.symbol}
                      handlePageChange={handlePageChange}
                    />
                  </Tab.Panel>
                  <Tab.Panel>
                    <Chats tokenAddress={address as string} tokenInfo={tokenInfo} />
                  </Tab.Panel>
                  <Tab.Panel>
                    <TokenHolders
                      tokenHolders={currentHolders}
                      currentPage={currentPage}
                      totalPages={Math.ceil(tokenHolders.length / holdersPerPage)}
                      tokenSymbol={tokenInfo.symbol}
                      creatorAddress={tokenInfo.creatorAddress}
                      tokenAddress={address as string}
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
            {/* Quick Actions (desktop) — ABOVE Token Info */}
            <div className="hidden lg:block card gradient-border p-4 relative">
              {/* Header: Slippage label + Settings button (NO input) */}
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

              {/* Buy / Sell toggle — primary color */}
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

              {/* From */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">From</span>
                  <span className="text-gray-400">
                    Balance: {isSwapped ? tokenBalance : ethBalance}
                  </span>
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

              {/* Swap */}
              <button
                onClick={handleSwap}
                className="w-full flex justify-center p-2 text-gray-400 hover:text-[var(--primary)]"
              >
                <ArrowUpDownIcon size={20} />
              </button>

              {/* To */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">To (Estimated)</span>
                  <span className="text-gray-400">
                    Balance: {isSwapped ? ethBalance : tokenBalance}
                  </span>
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

              {/* Action */}
              <button
                onClick={handleAction}
                disabled={!fromToken.amount || isCalculating || isTransacting}
                className="btn btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTransacting ? 'Processing...' : actionButtonText}
              </button>

              {/* Settings Popover (desktop) */}
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

            {/* Token Info Header (desktop) — BELOW Quick Actions */}
            <div className="hidden lg:block card gradient-border p-4">
              <TokenInfo
                tokenInfo={tokenInfo}
                showHeader={true}
                refreshTrigger={refreshCounter}
                liquidityEvents={liquidityEvents}
              />
            </div>
          </div>
        </div>

        {/* Share */}
        <ShareButton tokenInfo={tokenInfo} />
      </div>
    </Layout>
  );
};

/** Settings content reused for mobile/desktop */
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
  const {
    antiMEV,
    setAntiMEV,
    txSpeed,
    setTxSpeed,
    priorityFee,
    setPriorityFee,
    bribe,
    setBribe,
    onClose,
  } = props;

  const activeBtn = 'px-3 py-1 rounded-md bg-[var(--primary)] text-white';
  const idleBtn   = 'px-3 py-1 rounded-md bg-[var(--card)] text-gray-300 border-thin hover:text-white';

  return (
    <>
      <div className="space-y-3 text-sm">
        {/* Anti-MEV */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Anti-MEV Protection</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setAntiMEV(true)}  className={antiMEV ? activeBtn : idleBtn}>ON</button>
            <button onClick={() => setAntiMEV(false)} className={!antiMEV ? activeBtn : idleBtn}>OFF</button>
          </div>
        </div>

        {/* Transaction Speed */}
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Transaction Speed</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setTxSpeed('auto')}   className={txSpeed === 'auto' ? activeBtn : idleBtn}>AUTO</button>
            <button onClick={() => setTxSpeed('manual')} className={txSpeed === 'manual' ? activeBtn : idleBtn}>MANUAL</button>
          </div>
        </div>

        {/* Priority Fee (SOL) */}
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

        {/* Bribe (SOL) */}
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
        >
          Close
        </button>
      </div>
    </>
  );
}

// SSR chỉ để SEO: không 404 khi API lỗi, trả props null để client tự fetch
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { address } = context.params as { address: string };

  try {
    const tokenInfo = await getTokenInfoAndTransactions(address, 1, 1);
    return {
      props: {
        initialTokenInfo: tokenInfo ?? null,
      },
    };
  } catch (error) {
    console.error('SSR getTokenInfoAndTransactions failed:', error);
    return {
      props: {
        initialTokenInfo: null,
      },
    };
  }
};

export default TokenDetail;
