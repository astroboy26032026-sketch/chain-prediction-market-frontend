import { mockTokens } from '@/mock/token';
import { TokenWithTransactions, Transaction } from '@/interface/types';

export function getMockTokenDetail(address: string): TokenWithTransactions {
  const base =
    mockTokens.find(
      (t) => t.address.toLowerCase() === address.toLowerCase()
    ) ?? mockTokens[0];

  const now = Date.now();

  // =========================
  // Transactions (SAFE MOCK)
  // =========================
  const transactions: Transaction[] = Array.from({ length: 12 }).map((_, i) => {
    const isBuy = i % 2 === 0;

    // ✅ mock ETH in wei (string integer)
    const ethAmount = BigInt(
      Math.floor(Math.random() * 1e17) // ~0–0.1 ETH
    ).toString();

    // ✅ mock token amount (smallest unit, integer string)
    const tokenAmount = BigInt(
      Math.floor(Math.random() * 1e12)
    ).toString();

    return {
      id: `tx-${i + 1}`,
      type: isBuy ? 'BUY' : 'SELL',
      senderAddress: `0xsender${i.toString().padStart(36, '0')}`,
      recipientAddress: `0xrecipient${i.toString().padStart(34, '0')}`,

      // 🔥 QUAN TRỌNG
      ethAmount,        // ✅ string số nguyên
      tokenAmount,      // ✅ string số nguyên

      // tokenPrice chỉ để display → float OK
      tokenPrice: (Math.random() * 0.00001).toFixed(8),

      txHash: `0xtxhash${i.toString().padStart(56, '0')}`,
      timestamp: new Date(now - i * 60_000).toISOString(),
    };
  });

  const latestTxTime =
    transactions[0]?.timestamp ?? new Date().toISOString();

  // =========================
  // TokenWithTransactions
  // =========================
  return {
    id: base.id,
    address: base.address,
    name: base.name,
    symbol: base.symbol,
    chainId: 109,
    map: null,
    creatorAddress: '0xcreator00000000000000000000000000000001',
    logo: base.logo,
    description: `${base.name} is a fair-launch meme token.`,
    website: 'https://example.com',
    twitter: 'https://twitter.com/example',
    telegram: 'https://t.me/example',
    discord: 'https://discord.gg/example', 
    youtube: '',
    createdAt: base.createdAt,
    updatedAt: new Date().toISOString(),
    latestTransactionTimestamp: latestTxTime,

    _count: {
      liquidityEvents: 0,
    },

    transactions: {
      data: transactions,
      pagination: {
        currentPage: 1,
        pageSize: 10,
        totalCount: transactions.length,
        totalPages: Math.ceil(transactions.length / 10),
      },
    },
  };
}
