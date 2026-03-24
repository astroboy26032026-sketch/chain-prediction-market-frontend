// src/pages/token/[address].tsx — Token detail page (refactored)
import { GetServerSideProps } from 'next';
import React from 'react';
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
          <SpaceLoader variant="overlay" size="large" />
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
    slippagePct: swap.slippagePct,
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
      <div className="lg:hidden mb-6 space-y-4">
        <TokenInfo
          tokenInfo={tokenInfo as any}
          showHeader={true}
          refreshTrigger={refreshCounter}
          liquidityEvents={liquidityEvents}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-6">
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

            {/* Trades / Chat / Holders — flex-1 to match right column height */}
            <div className="card gradient-border p-4 lg:flex-1">
              <Tab.Group>
                <Tab.List className="flex bg-[var(--card)] rounded-xl p-1 mb-4">
                  {['Trades', 'Chat', 'Holders'].map((t) => (
                    <Tab key={t} as={React.Fragment}>
                      {({ selected }) => (
                        <button
                          type="button"
                          className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                            selected
                              ? 'text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-200'
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
          <div className="hidden lg:flex lg:flex-col gap-6">
            <div>
              <SwapPanel {...swapPanelProps} />
            </div>

            <div className="card gradient-border p-4">
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
