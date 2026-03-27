// src/pages/token/[address].tsx — Prediction Market detail page
import { GetServerSideProps } from 'next';
import React, { useMemo, useState } from 'react';
import { Tab } from '@headlessui/react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import SpaceLoader from '@/components/ui/SpaceLoader';
import ShareButton from '@/components/ui/ShareButton';

import TradingViewChart from '@/components/charts/TradingViewChart';
import TransactionHistory from '@/components/TokenDetails/TransactionHistory';
import TokenHolders from '@/components/TokenDetails/TokenHolders';
import TokenInfo from '@/components/TokenDetails/TokenInfo';
import Chats from '@/components/TokenDetails/Chats';

import SwapPanel from '@/components/token/SwapPanel';

import { useTokenDetail } from '@/hooks/useTokenDetail';
import { COMMON } from '@/constants/ui-text';
import { useSwapTrading } from '@/hooks/useSwapTrading';

import { getTokenInfo } from '@/utils/api.index';
import type { Token } from '@/interface/types';
import { getMarketByAddress, getRelatedMarkets, generateOrderBook, marketsAsTokens, type PredictionMarket, type OrderBookEntry } from '@/data/markets';

interface TokenDetailProps {
  initialTokenInfo: Token | null;
}

// ────────────────────────────────────────
// Order Book (using mock data)
// ────────────────────────────────────────
const OrderBook: React.FC<{ market?: PredictionMarket }> = ({ market }) => {
  const [activeTab, setActiveTab] = useState<'a' | 'b'>('a');

  const orderBook = useMemo(() => {
    if (!market) return { buyOrders: [], sellOrders: [] };
    return generateOrderBook(market);
  }, [market]);

  const outcomeALabel = market?.outcomeA || 'Yes';
  const outcomeBLabel = market?.outcomeB || 'No';
  const orders = activeTab === 'a' ? orderBook.buyOrders : orderBook.sellOrders;

  const spread = useMemo(() => {
    if (!orderBook.buyOrders.length || !orderBook.sellOrders.length) return null;
    return Math.abs(orderBook.sellOrders[0].price - orderBook.buyOrders[0].price).toFixed(3);
  }, [orderBook]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-[var(--foreground)]">Order Book</h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('a')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'a'
              ? 'bg-green-500/15 text-green-400 border border-green-500/40'
              : 'bg-[var(--card2)] text-gray-400 border border-transparent hover:text-gray-200'
          }`}
        >
          Trade {outcomeALabel}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('b')}
          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
            activeTab === 'b'
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40'
              : 'bg-[var(--card2)] text-gray-400 border border-transparent hover:text-gray-200'
          }`}
        >
          Trade {outcomeBLabel}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[300px]">
          <thead>
            <tr className="bg-[var(--card2)] border-thin">
              <th className="px-3 py-2 text-xs text-gray-400">Price</th>
              <th className="px-3 py-2 text-xs text-gray-400 text-center">Shares</th>
              <th className="px-3 py-2 text-xs text-gray-400 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => (
              <tr key={idx} className="border-b border-[var(--card-hover)] hover:bg-[var(--card-hover)] transition-colors">
                <td className={`px-3 py-2 text-xs sm:text-sm font-medium ${activeTab === 'a' ? 'text-green-400' : 'text-rose-400'}`}>
                  ${order.price.toFixed(3)}
                </td>
                <td className="px-3 py-2 text-xs sm:text-sm text-gray-300 text-center">
                  {order.shares}
                </td>
                <td className="px-3 py-2 text-xs sm:text-sm text-gray-300 text-right font-medium">
                  ${order.total.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Spread */}
      {spread && (
        <div className="flex items-center justify-center my-3 text-xs text-gray-500">
          <span className="px-3 py-1 bg-[var(--card2)] rounded-full">Spread: {spread}</span>
        </div>
      )}
    </div>
  );
};

// ────────────────────────────────────────
// Related Markets
// ────────────────────────────────────────
const RelatedMarkets: React.FC<{ currentAddress?: string }> = ({ currentAddress }) => {
  const [activeFilter, setActiveFilter] = useState<'related' | 'trending' | 'popular'>('related');

  const related = useMemo(() => {
    const market = currentAddress ? getMarketByAddress(currentAddress) : undefined;
    return getRelatedMarkets(market?.id || '', 5);
  }, [currentAddress]);

  const fmtUSD = (v: number) => {
    if (v >= 1000) return `$${(v / 1000).toFixed(1)}K`;
    return `$${v.toFixed(0)}`;
  };

  return (
    <div className="card gradient-border p-4 space-y-3">
      <div className="flex gap-1 bg-[var(--card2)] rounded-lg p-0.5">
        {(['related', 'trending', 'popular'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setActiveFilter(filter)}
            className={`flex-1 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
              activeFilter === filter
                ? 'bg-[var(--primary)] text-white shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {related.map((m, i) => (
          <a
            key={m.id}
            href={`/token/${m.address}`}
            className="flex items-start gap-3 py-2 border-b border-[var(--card-border)] last:border-0 hover:bg-[var(--card2)] rounded px-1 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-[var(--card2)] flex items-center justify-center text-xs text-gray-500 mt-0.5">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-[var(--foreground)] leading-tight line-clamp-2">
                {m.question}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-2">
                <span>{fmtUSD(m.volume24h)} Vol.</span>
                <span>· {m.outcomeAPercent}% Yes</span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────
const TokenDetail: React.FC<TokenDetailProps> = ({ initialTokenInfo }) => {
  const {
    tokenAddr,
    tokenInfo,
    tokenSymbol,
    decimals,
    liquidityEvents,
    holdersAll,
    holdersNextCursor,
    holdersLoading,
    holdersError,
    currentPage,
    setCurrentPage,
    refreshCounter,
    refresh,
    fetchLiquidity,
    fetchHolders,
  } = useTokenDetail(initialTokenInfo);

  const swap = useSwapTrading({
    tokenAddr,
    tokenInfo,
    decimals,
    fetchLiquidity,
    onTradeSuccess: refresh,
  });

  // Look up prediction market mock data
  const market = useMemo(() => {
    if (!tokenAddr) return undefined;
    return getMarketByAddress(tokenAddr as string);
  }, [tokenAddr]);

  if (!tokenInfo) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <SpaceLoader variant="overlay" size="large" />
        </div>
      </Layout>
    );
  }

  // Merge market data into tokenInfo for child components
  const enrichedTokenInfo = market ? {
    ...tokenInfo,
    name: market.question,
    symbol: market.outcomeA,
    description: market.description,
    progressDex: market.outcomeAPercent,
    volume24h: market.volume24h,
    marketCap: market.liquidity,
    website: market.website,
    twitter: market.twitter,
    telegram: market.telegram,
  } : tokenInfo;

  const swapPanelProps = {
    fromToken: swap.fromToken,
    toToken: swap.toToken,
    isSwapped: swap.isSwapped,
    isCalculating: swap.isCalculating,
    isTransacting: swap.isTransacting,
    solBalance: swap.solBalance,
    tokenBalance: swap.tokenBalance,
    tokenSymbol: market?.outcomeA || tokenSymbol,
    actionButtonText: swap.actionButtonText,
    slippagePct: swap.slippagePct,
    onSwap: swap.handleSwap,
    onFromAmountChange: swap.handleFromAmountChange,
    onMaxClick: swap.handleMaxClick,
    onAction: swap.handleAction,
    onSetSwapped: swap.setIsSwapped,
  };

  return (
    <Layout>
      <SEO token={enrichedTokenInfo as any} />

      {/* Back link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm text-gray-400 hover:text-[var(--primary)] transition-colors flex items-center gap-1"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Arena
        </button>
      </div>

      {/* Mobile TokenInfo */}
      <div className="lg:hidden mb-6 space-y-4 px-4">
        <TokenInfo
          tokenInfo={enrichedTokenInfo as any}
          showHeader={true}
          refreshTrigger={refreshCounter}
          liquidityEvents={liquidityEvents}
          market={market}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Mobile Swap */}
            <div className="lg:hidden">
              <SwapPanel {...swapPanelProps} />
            </div>

            {/* Chart */}
            <div className="space-y-2">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-gray-300 truncate">
                  {market?.question || (tokenInfo as any).name || (tokenInfo as any).symbol}
                </h2>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(market?.volume24h ?? Number((tokenInfo as any)?.volume24h ?? 0))} Vol.
                  </span>
                  <span className="flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {market?.expiresAt ? new Date(market.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 font-semibold text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
              </div>
              <TradingViewChart
                liquidityEvents={liquidityEvents}
                tokenInfo={enrichedTokenInfo as any}
                market={market}
              />
            </div>

            {/* Order Book */}
            <div className="card gradient-border p-4">
              {market ? (
                <OrderBook market={market} />
              ) : (
                <TransactionHistory tokenAddress={tokenAddr as string} />
              )}
            </div>

            {/* Chat / Holders */}
            <div className="card gradient-border p-4 lg:flex-1">
              <Tab.Group>
                <Tab.List className="flex bg-[var(--card)] rounded-xl p-1 mb-4">
                  {['Chat', 'Holders'].map((t) => (
                    <Tab key={t} as={React.Fragment}>
                      {({ selected }) => (
                        <button
                          type="button"
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            selected ? 'text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                          }`}
                          style={selected ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
                        >
                          {t}
                        </button>
                      )}
                    </Tab>
                  ))}
                </Tab.List>
                <Tab.Panels>
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
                      creatorAddress={(tokenInfo as any).creatorAddress}
                      tokenAddress={tokenAddr as string}
                      onPageChange={(pageNumber: number) => setCurrentPage(pageNumber)}
                      allHolders={holdersAll}
                    />
                    <div className="mt-4 flex items-center justify-center gap-3">
                      {holdersNextCursor && (
                        <button type="button" onClick={() => fetchHolders({ reset: false })} disabled={holdersLoading}
                          className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50">
                          {holdersLoading ? COMMON.LOADING : COMMON.LOAD_MORE}
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

          {/* Right column */}
          <div className="hidden lg:flex lg:flex-col gap-6">
            <div className="card gradient-border p-4 space-y-4">
              <TokenInfo
                tokenInfo={enrichedTokenInfo as any}
                showHeader={true}
                refreshTrigger={refreshCounter}
                liquidityEvents={liquidityEvents}
                market={market}
              />
              <SwapPanel {...swapPanelProps} />
            </div>
            <RelatedMarkets currentAddress={tokenAddr as string} />
          </div>
        </div>

        <ShareButton tokenInfo={tokenInfo as any} />
      </div>
    </Layout>
  );
};

// SSR
export const getServerSideProps: GetServerSideProps = async (context) => {
  const { address } = context.params as { address: string };

  // Strip undefined values so Next.js serialization doesn't throw
  const safeSerialize = (obj: any) => JSON.parse(JSON.stringify(obj));

  // Check if this is a mock prediction market address
  const mockMarket = getMarketByAddress(address);
  if (mockMarket) {
    const mockTokens = marketsAsTokens([mockMarket]);
    return { props: { initialTokenInfo: safeSerialize(mockTokens[0]) ?? null } };
  }

  try {
    const info = await getTokenInfo(address);
    return { props: { initialTokenInfo: safeSerialize(info) ?? null } };
  } catch (e) {
    console.error('SSR getTokenInfo failed:', e);
    return { props: { initialTokenInfo: null } };
  }
};

export default TokenDetail;
