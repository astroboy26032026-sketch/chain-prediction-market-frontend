// src/pages/profile/[address].tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import LoadingBar from '@/components/ui/LoadingBar';
import TokenUpdateModal from '@/components/token/TokenUpdateModal';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

import {
  getProfileInfo,
  // getTransactionsByAddress,
  // getAllTokenAddresses,
  // getTokensByCreator,
} from '@/utils/api.index';

import { Transaction, PaginatedResponse, Token } from '@/interface/types';
import { formatTimestamp, formatAddressV2, formatAmountV3 } from '@/utils/blockchainUtils';

/* =========================
   Types
========================= */
interface TransactionResponse extends Omit<PaginatedResponse<Transaction>, 'data'> {
  transactions: Transaction[];
}

interface TokenBalanceItemProps {
  tokenAddress: string;
  symbol: string;
  onClick: () => void;
}

// Kiểu dữ liệu chuẩn cho danh sách token address + symbol
type AddrSymbol = { address: string; symbol: string };

// Type guard để phân biệt khi API trả về đúng dạng hoặc chỉ string[]
const isAddrSymbolArray = (v: unknown): v is AddrSymbol[] =>
  Array.isArray(v) &&
  v.every((i) => i && typeof i === 'object' && 'address' in (i as any) && 'symbol' in (i as any));

type ProfileInfo = Awaited<ReturnType<typeof getProfileInfo>>;

/* =========================
   Helpers
========================= */
function getQueryAddress(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v[0] ?? '';
  return '';
}

/**
 * Normalize image URL:
 * - keep relative (/...) as-is
 * - convert ipfs://CID or ipfs://ipfs/CID -> https://gateway.pinata.cloud/ipfs/CID
 * - otherwise keep http(s)
 */
function normalizeImageUrl(input?: string | null): string {
  const s = (input || '').trim();
  if (!s) return '';
  if (s.startsWith('/')) return s;

  if (s.startsWith('ipfs://')) {
    const rest = s.replace('ipfs://', '');
    const cid = rest.startsWith('ipfs/') ? rest.slice('ipfs/'.length) : rest;
    return `https://gateway.pinata.cloud/ipfs/${cid}`;
  }
  return s;
}

/* =========================
   Token Balance Item
   (GIỮ UI, BỎ on-chain balance)
========================= */
const TokenBalanceItem: React.FC<TokenBalanceItemProps> = ({ tokenAddress, symbol, onClick }) => {
  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(`https://shibariumscan.io/address/${tokenAddress}`, '_blank');
  };

  return (
    <div
      className="bg-[var(--card)] rounded-lg p-4 cursor-pointer hover:bg-[var(--card-hover)] transition-colors duration-200"
      onClick={onClick}
    >
      <h3 className="text-xs sm:text-sm font-semibold text-[var(--accent)] mb-2">{symbol}</h3>

      {/* giữ dòng balance để UI không thay đổi layout (nhưng không gọi chain) */}
      <p className="text-gray-400 text-[10px] sm:text-xs">Balance: --</p>

      <p className="text-gray-400 text-[10px] sm:text-xs mt-2">
        Address:
        <span className="text-[var(--primary)] hover:underline ml-1 cursor-pointer" onClick={handleAddressClick}>
          {formatAddressV2(tokenAddress)}
        </span>
      </p>
    </div>
  );
};

/* =========================
   Pagination (GIỮ NGUYÊN)
========================= */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  return (
    <div className="flex justify-center items-center space-x-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-md bg-[var(--card)] text-gray-400 hover:bg-[var(--card-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeftIcon className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      <div className="flex items-center space-x-1">
        {[...Array(totalPages)].map((_, index) => {
          const page = index + 1;
          if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
            return (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 rounded-md text-sm transition-colors duration-200 ${
                  currentPage === page
                    ? 'bg-[var(--primary)] text-black'
                    : 'bg-[var(--card)] text-gray-400 hover:bg-[var(--card-hover)]'
                }`}
              >
                {page}
              </button>
            );
          } else if (page === currentPage - 2 || page === currentPage + 2) {
            return (
              <span key={page} className="text-gray-500 text-xs sm:text-sm">
                ...
              </span>
            );
          }
          return null;
        })}
      </div>

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-md bg-[var(--card)] text-gray-400 hover:bg-[var(--card-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronRightIcon className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>
    </div>
  );
};

/* =========================
   Token Tab (GIỮ NGUYÊN)
========================= */
interface TokenTabProps {
  title: string;
  isActive: boolean;
  onClick: () => void;
}

const TokenTab: React.FC<TokenTabProps> = ({ title, isActive, onClick }) => (
  <button
    className={`w-full rounded-lg py-2.5 text-xs sm:text-sm font-medium leading-5 ${
      isActive
        ? 'bg-[var(--card-boarder)] text-[var(--accent)]'
        : 'text-gray-400 hover:bg-[var(--card-hover)] hover:text-[var(--accent)]'
    }`}
    onClick={onClick}
  >
    {title}
  </button>
);

/* =========================
   Profile Page
========================= */
const ProfilePage: React.FC = () => {
  const router = useRouter();
  const { publicKey } = useWallet();

  // connected wallet (Solana)
  const connectedAddress = useMemo(() => publicKey?.toBase58() || '', [publicKey]);

  // profile address from route
  const profileAddress = getQueryAddress(router.query.address);

  // address precedence: URL -> connected wallet
  const addressToUse = (profileAddress || connectedAddress || '').trim();

  // NEW: profile info
  const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Tokens held list (still from old API)
  const [tokenAddresses, setTokenAddresses] = useState<AddrSymbol[]>([]);
  const [isTokenLoading, setIsTokenLoading] = useState(false);

  // Tabs & Created tokens
  const [activeTab, setActiveTab] = useState<'held' | 'created'>('held');
  const [createdTokens, setCreatedTokens] = useState<Token[]>([]);
  const [createdTokensPage, setCreatedTokensPage] = useState(1);
  const [createdTokensTotalPages, setCreatedTokensTotalPages] = useState(1);

  // Modal update token
  const [selectedToken, setSelectedToken] = useState<Token | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);

  const fetchProfile = useCallback(async (walletAddress: string) => {
    if (!walletAddress) return;
    setProfileLoading(true);
    try {
      const data = await getProfileInfo(walletAddress);
      setProfileInfo({
        ...data,
        avatar: normalizeImageUrl((data as any).avatar),
      } as any);
    } catch (error) {
      console.error('Error fetching profile info:', error);
      setProfileInfo(null);
    } finally {
      setProfileLoading(false);
    }
  }, []);

  // const fetchTransactions = useCallback(async (address: string, page: number) => {
  //   setIsLoading(true);
  //   try {
  //     const response: TransactionResponse = await getTransactionsByAddress(address, page);
  //     setTransactions(response.transactions || []);
  //     setTotalPages(response.totalPages || 1);
  //   } catch (error) {
  //     console.error('Error fetching transactions:', error);
  //     setTransactions([]);
  //     setTotalPages(1);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

  // accept API can return string[] or {address,symbol}[]
  // const fetchTokenAddresses = useCallback(async () => {
  //   try {
  //     const res = await getAllTokenAddresses();

  //     if (isAddrSymbolArray(res)) {
  //       setTokenAddresses(res);
  //     } else if (Array.isArray(res)) {
  //       setTokenAddresses((res as string[]).map((addr) => ({ address: addr, symbol: 'Unknown' })));
  //     } else {
  //       setTokenAddresses([]);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching token addresses:', error);
  //     setTokenAddresses([]);
  //   }
  // }, []);

  // const fetchCreatedTokens = useCallback(async (creatorAddress: string, page: number) => {
  //   setIsLoading(true);
  //   try {
  //     const response = await getTokensByCreator(creatorAddress, page);
  //     setCreatedTokens(response.tokens || []);
  //     setCreatedTokensTotalPages(response.totalPages || 1);
  //   } catch (error) {
  //     console.error('Error fetching created tokens:', error);
  //     setCreatedTokens([]);
  //     setCreatedTokensTotalPages(1);
  //   } finally {
  //     setIsLoading(false);
  //   }
  // }, []);

  // const handleTokenUpdate = useCallback(async () => {
  //   if (addressToUse) {
  //     await fetchCreatedTokens(addressToUse, createdTokensPage);
  //   }
  // }, [addressToUse, createdTokensPage, fetchCreatedTokens]);

  // fetch all data
  useEffect(() => {
    if (!addressToUse) return;

    fetchProfile(addressToUse);

    // keep old APIs for now
    // fetchTransactions(addressToUse, currentPage);
    // fetchTokenAddresses();
    // fetchCreatedTokens(addressToUse, createdTokensPage);
  }, [
    addressToUse,
    currentPage,
    createdTokensPage,
    fetchProfile,
    // fetchTransactions,
    // fetchTokenAddresses,
    // fetchCreatedTokens,
  ]);

  // if address changes, reset pages (avoid invalid page state)
  useEffect(() => {
    setCurrentPage(1);
    setCreatedTokensPage(1);
  }, [addressToUse]);

  const handlePageChange = (newPage: number) => setCurrentPage(newPage);
  const handleCreatedTokensPageChange = (newPage: number) => setCreatedTokensPage(newPage);

  const getTokenSymbol = (tokenAddress: string) => {
    const token = tokenAddresses.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase());
    return token?.symbol ?? 'Unknown';
  };

  const handleTokenClick = (tokenAddress: string) => {
    setIsTokenLoading(true);
    router.push(`/token/${tokenAddress}`).finally(() => setIsTokenLoading(false));
  };

  const isTokenIncomplete = (token: Token) => {
    const socialCount = [token.website, token.telegram, token.discord, token.twitter, token.youtube].filter(Boolean)
      .length;
    return !token.logo || !token.description || socialCount < 3;
  };

  const isOwner =
    !!connectedAddress && !!addressToUse && connectedAddress.toLowerCase() === addressToUse.toLowerCase();

  const avatarSrc = useMemo(() => normalizeImageUrl(profileInfo?.avatar), [profileInfo?.avatar]);

  return (
    <Layout>
      <SEO
        title={`${addressToUse ? `Profile: ${formatAddressV2(addressToUse)}` : 'Your Profile'} - Bondle`}
        description={`View token holdings and transactions for ${addressToUse ? formatAddressV2(addressToUse) : 'your account'}.`}
        image="seo/profile.jpg"
      />

      <div className="min-h-screen flex flex-col items-center justify-start py-10">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
          {/* Title aligned LEFT */}
          <div className="w-full mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-left">
              {isOwner ? 'Your Profile' : `Profile: ${formatAddressV2(addressToUse)}`}
            </h1>
          </div>

          {/* ✅ User Info (NEW) */}
          <div className="w-full mb-8">
            <div className="bg-[var(--card)] rounded-lg p-4 sm:p-5">
              {profileLoading ? (
                <div className="flex justify-center py-3">
                  <LoadingBar size="medium" />
                </div>
              ) : profileInfo ? (
                <div className="flex items-start gap-4">
                  <div className="relative w-12 h-12 rounded-lg bg-[var(--card2)] overflow-hidden flex items-center justify-center">
                    {avatarSrc ? (
                      <Image src={avatarSrc} alt="avatar" fill sizes="48px" className="object-cover" />
                    ) : (
                      <span className="text-gray-500 text-xs">No Avatar</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <p className="text-sm sm:text-base font-semibold text-[var(--accent)]">
                          {profileInfo.username || 'Anonymous'}
                        </p>
                        <p className="text-gray-400 text-[10px] sm:text-xs">
                          {formatAddressV2(profileInfo.walletAddress)}
                        </p>
                      </div>

                      <div className="flex gap-2 sm:gap-3 flex-wrap">
                        <div className="bg-[var(--card2)] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400">Created</p>
                          <p className="text-xs font-semibold">{profileInfo.totalTokensCreated}</p>
                        </div>
                        <div className="bg-[var(--card2)] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400">Bought</p>
                          <p className="text-xs font-semibold">{profileInfo.totalTokensBought}</p>
                        </div>
                        <div className="bg-[var(--card2)] rounded-lg px-3 py-2">
                          <p className="text-[10px] text-gray-400">Sold</p>
                          <p className="text-xs font-semibold">{profileInfo.totalTokensSold}</p>
                        </div>
                      </div>
                    </div>

                    {profileInfo.bio ? <p className="text-gray-300 text-xs mt-2">{profileInfo.bio}</p> : null}
                    {profileInfo.joinedAt ? (
                      <p className="text-gray-500 text-[10px] mt-2">Joined: {profileInfo.joinedAt}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No profile info.</p>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-8 w-full">
            <div className="flex justify-center mb-4 space-x-1 bg-[var(--card2)] rounded-lg p-1">
              <TokenTab title="Tokens Held" isActive={activeTab === 'held'} onClick={() => setActiveTab('held')} />
              <TokenTab title="Tokens Created" isActive={activeTab === 'created'} onClick={() => setActiveTab('created')} />
            </div>

            {/* Tokens Held */}
            {activeTab === 'held' && (
              <div>
                {tokenAddresses.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tokenAddresses.map((token) => (
                      <TokenBalanceItem
                        key={token.address}
                        tokenAddress={token.address}
                        symbol={token.symbol}
                        onClick={() => handleTokenClick(token.address)}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center text-sm sm:text-base">No tokens held</p>
                )}
              </div>
            )}

            {/* Tokens Created */}
            {activeTab === 'created' && (
              <div>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingBar size="medium" />
                  </div>
                ) : createdTokens.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {createdTokens.map((token) => {
                      const logoSrc = normalizeImageUrl(token.logo || '/chats/noimg.svg');

                      return (
                        <div
                          key={token.address}
                          className="bg-[var(--card)] rounded-lg p-3 sm:p-4 cursor-pointer hover:bg-[var(--card-hover)] transition-colors duration-200 flex items-start relative"
                          onClick={() => handleTokenClick(token.address)}
                        >
                          {isOwner && isTokenIncomplete(token) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedToken(token);
                                setIsUpdateModalOpen(true);
                              }}
                              className="absolute top-2 right-2 p-2 rounded-full bg-[var(--card-boarder)] hover:bg-[#444444] transition-colors duration-200"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4 text-gray-400"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </button>
                          )}

                          <div className="relative w-16 h-16 mr-3 sm:mr-4 rounded-lg overflow-hidden bg-[var(--card2)]">
                            <Image
                              src={logoSrc}
                              alt={`${token.name} logo`}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          </div>

                          <div>
                            <h3 className="text-xs sm:text-sm font-semibold text-[var(--accent)] mb-1">
                              {token.name} <span className="text-gray-400">({token.symbol})</span>
                            </h3>
                            <p className="text-gray-400 text-[9px] sm:text-xs">{token.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-400 text-center text-sm sm:text-base">No tokens created</p>
                )}

                {createdTokensTotalPages > 1 && (
                  <Pagination
                    currentPage={createdTokensPage}
                    totalPages={createdTokensTotalPages}
                    onPageChange={handleCreatedTokensPageChange}
                  />
                )}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="w-full">
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--accent)] mb-4 text-left">Recent Transactions</h2>

            {isLoading ? (
              <div className="flex justify-center py-8">
                <LoadingBar size="medium" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="overflow-x-auto bg-[var(--card)] rounded-lg">
                <table className="min-w-full divide-y divide-[var(--card-boarder)]">
                  <thead className="bg-[var(--card2)]">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Token
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Bone
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] sm:text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[var(--card-boarder)]">
                    {transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-[var(--card-hover)] transition-colors duration-150">
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] sm:text-xs text-gray-300">
                          {(tx as any).type}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] sm:text-xs text-gray-300">
                          {getTokenSymbol((tx as any).recipientAddress)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] sm:text-xs text-gray-300">
                          {formatAmountV3((tx as any).tokenAmount)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] sm:text-xs text-gray-300">
                          {formatAmountV3((tx as any).ethAmount)} BONE
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-[10px] sm:text-xs text-gray-300">
                          {formatTimestamp((tx as any).timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 bg-[var(--card)] rounded-lg p-4 text-center">No recent transactions.</p>
            )}

            {totalPages > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            )}
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isTokenLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingBar size="large" />
        </div>
      )}

      {/* Update Modal */}
      {/* {selectedToken && (
        <TokenUpdateModal
          token={selectedToken}
          isOpen={isUpdateModalOpen}
          onClose={() => {
            setIsUpdateModalOpen(false);
            setSelectedToken(null);
          }}
          onUpdate={handleTokenUpdate}
        />
      )} */}
    </Layout>
  );
};

export default ProfilePage;
