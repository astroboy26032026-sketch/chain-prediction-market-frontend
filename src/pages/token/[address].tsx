// src/pages/token/[address].tsx — Token detail page (refactored)
import { GetServerSideProps } from 'next';
import React from 'react';
import { Tab } from '@headlessui/react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import Spinner from '@/components/ui/Spinner';
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

interface TokenDetailProps {
  initialTokenInfo: Token | null;
}

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

  if (!tokenInfo) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <Spinner size="large" />
        </div>
      </Layout>
    );
  }

  const swapPanelProps = {
    fromToken: swap.fromToken,
    toToken: swap.toToken,
    isSwapped: swap.isSwapped,
    isCalculating: swap.isCalculating,
    isTransacting: swap.isTransacting,
    solBalance: swap.solBalance,
    tokenBalance: swap.tokenBalance,
    tokenSymbol,
    actionButtonText: swap.actionButtonText,
    antiMEV: swap.antiMEV,
    setAntiMEV: swap.setAntiMEV,
    txSpeed: swap.txSpeed,
    setTxSpeed: swap.setTxSpeed,
    priorityFee: swap.priorityFee,
    setPriorityFee: swap.setPriorityFee,
    bribe: swap.bribe,
    setBribe: swap.setBribe,
    slippagePct: swap.slippagePct,
    setSlippagePct: swap.setSlippagePct,
    onSwap: swap.handleSwap,
    onFromAmountChange: swap.handleFromAmountChange,
    onMaxClick: swap.handleMaxClick,
    onAction: swap.handleAction,
    onSetSwapped: swap.setIsSwapped,
  };

  return (
    <Layout>
      <SEO token={tokenInfo as any} />

      {/* Mobile TokenInfo */}
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
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-300 truncate">
                  {(tokenInfo as any).name || (tokenInfo as any).symbol}
                </h2>
              </div>
              <TradingViewChart liquidityEvents={liquidityEvents} tokenInfo={tokenInfo as any} />
            </div>

            {/* Mobile Swap */}
            <div className="lg:hidden">
              <SwapPanel {...swapPanelProps} />
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
                      onPageChange={(pageNumber: number) => setCurrentPage(pageNumber)}
                      allHolders={holdersAll}
                    />

                    <div className="mt-4 flex items-center justify-center gap-3">
                      {holdersNextCursor && (
                        <button
                          type="button"
                          onClick={() => fetchHolders({ reset: false })}
                          disabled={holdersLoading}
                          className="px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow disabled:opacity-50"
                        >
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
          <div className="space-y-6">
            <div className="hidden lg:block">
              <SwapPanel {...swapPanelProps} />
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

// SSR
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
