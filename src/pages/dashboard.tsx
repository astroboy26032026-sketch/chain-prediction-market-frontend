// src/pages/dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useRouter } from 'next/router';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import Spinner from '@/components/ui/Spinner';

import {
  getTransactionsByAddress,
  getAllTokenAddresses,
  getTokensByCreator,
} from '@/utils/api';

import {
  Transaction,
  PaginatedResponse,
  Token,
} from '@/interface/types';

import {
  formatTimestamp,
  formatAddressV2,
  formatAmountV3,
} from '@/utils/blockchainUtils';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/20/solid';

/* =======================
   Types
======================= */

interface TransactionResponse
  extends Omit<PaginatedResponse<Transaction>, 'data'> {
  transactions: Transaction[];
}

/* =======================
   Components
======================= */

const TokenBalanceItem: React.FC<{
  tokenAddress: string;
  symbol: string;
  onClick: () => void;
}> = ({ tokenAddress, symbol, onClick }) => {
  return (
    <div
      className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors duration-200 shadow-md"
      onClick={onClick}
    >
      <h3 className="text-xs sm:text-sm font-semibold text-blue-400 mb-2">
        {symbol}
      </h3>

      <p className="text-gray-400 text-[10px] sm:text-xs">
        Address: {formatAddressV2(tokenAddress)}
      </p>

      <p className="text-yellow-400 text-[10px] sm:text-xs mt-2">
        Balance: Coming soon
      </p>
    </div>
  );
};

const Pagination: React.FC<{
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex items-center justify-center mt-6 space-x-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-1 rounded-md bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>

      <span className="text-xs text-gray-300">
        Page {currentPage} / {totalPages}
      </span>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-1 rounded-md bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  );
};

/* =======================
   Page
======================= */

const UserDashboard: React.FC = () => {
  const router = useRouter();
  const { publicKey, connected } = useWallet();

  const address = publicKey?.toBase58() || '';

  const [tokenAddresses, setTokenAddresses] = useState<string[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [createdTokens, setCreatedTokens] = useState<Token[]>([]);

  const [activeTab, setActiveTab] = useState<'held' | 'created'>('held');

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [createdPage, setCreatedPage] = useState(1);
  const [createdTotalPages, setCreatedTotalPages] = useState(1);

  const [loading, setLoading] = useState(false);
  const [tokenLoading, setTokenLoading] = useState(false);

  /* =======================
     Effects
  ======================= */

  useEffect(() => {
    if (!connected || !address) return;

    fetchTransactions(address, currentPage);
    fetchTokenAddresses();
    fetchCreatedTokens(address, createdPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, address, currentPage, createdPage]);

  /* =======================
     Fetchers
  ======================= */

  const fetchTransactions = async (addr: string, page: number) => {
    setLoading(true);
    try {
      const res: TransactionResponse = await getTransactionsByAddress(addr, page);
      setTransactions(res.transactions || []);
      setTotalPages(res.totalPages || 1);
    } catch {
      setTransactions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenAddresses = async () => {
    try {
      const res = await getAllTokenAddresses();
      setTokenAddresses(Array.isArray(res) ? res : []);
    } catch {
      setTokenAddresses([]);
    }
  };

  const fetchCreatedTokens = async (addr: string, page: number) => {
    setLoading(true);
    try {
      const res = await getTokensByCreator(addr, page);
      setCreatedTokens(res.tokens || []);
      setCreatedTotalPages(res.totalPages || 1);
    } catch {
      setCreatedTokens([]);
      setCreatedTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  /* =======================
     Helpers
  ======================= */

  const getTokenSymbol = (addr: string) => {
    const t = createdTokens.find(
      (x) => x.address?.toLowerCase() === addr.toLowerCase()
    );
    return t?.symbol || 'UNKNOWN';
  };

  const goToken = (addr: string) => {
    setTokenLoading(true);
    router.push(`/token/${addr}`).finally(() => setTokenLoading(false));
  };

  /* =======================
     Render
  ======================= */

  return (
    <Layout>
      <SEO
        title="Dashboard"
        description="Your personal dashboard"
      />

      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-xl font-bold text-blue-400 mb-6">
          Dashboard
        </h1>

        {!connected && (
          <p className="text-gray-400">
            Please connect your wallet.
          </p>
        )}

        {connected && (
          <>
            {/* Tabs */}
            <div className="flex space-x-2 mb-6">
              <button
                className={`px-4 py-2 rounded ${
                  activeTab === 'held'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300'
                }`}
                onClick={() => setActiveTab('held')}
              >
                Tokens Held
              </button>

              <button
                className={`px-4 py-2 rounded ${
                  activeTab === 'created'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-300'
                }`}
                onClick={() => setActiveTab('created')}
              >
                Tokens Created
              </button>
            </div>

            {/* Tokens Held */}
            {activeTab === 'held' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {tokenAddresses.length > 0 ? (
                  tokenAddresses.map((addr) => (
                    <TokenBalanceItem
                      key={addr}
                      tokenAddress={addr}
                      symbol={getTokenSymbol(addr)}
                      onClick={() => goToken(addr)}
                    />
                  ))
                ) : (
                  <p className="text-gray-400">
                    No tokens found
                  </p>
                )}
              </div>
            )}

            {/* Tokens Created */}
            {activeTab === 'created' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {createdTokens.length > 0 ? (
                  createdTokens.map((t) => (
                    <div
                      key={t.address}
                      className="bg-gray-800 p-4 rounded cursor-pointer hover:bg-gray-700"
                      onClick={() => goToken(t.address)}
                    >
                      <h3 className="text-blue-400 text-sm font-semibold">
                        {t.name} ({t.symbol})
                      </h3>
                      <p className="text-gray-400 text-xs">
                        {t.description}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400">
                    No tokens created yet
                  </p>
                )}
              </div>
            )}

            {/* Transactions */}
            <div className="mt-10">
              <h2 className="text-lg text-blue-400 mb-4">
                Recent Transactions
              </h2>

              {loading ? (
                <p className="text-gray-400">Loading...</p>
              ) : transactions.length > 0 ? (
                <div className="overflow-x-auto bg-gray-800 rounded">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-left">Amount</th>
                        <th className="px-3 py-2 text-left">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="border-t border-gray-700">
                          <td className="px-3 py-2">{tx.type}</td>
                          <td className="px-3 py-2">
                            {formatAmountV3(tx.tokenAmount)}
                          </td>
                          <td className="px-3 py-2">
                            {formatTimestamp(tx.timestamp)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-400">No transactions</p>
              )}

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </>
        )}
      </div>

      {tokenLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Spinner size="large" />
        </div>
      )}
    </Layout>
  );
};

export default UserDashboard;

/* =======================
   IMPORTANT:
   Disable SSG for dashboard
======================= */
export async function getServerSideProps() {
  return { props: {} };
}
