// src/data/markets.ts — Mock prediction market data

export type MarketCategory = 'trending' | 'sports' | 'crypto' | 'trump' | 'others';

export interface PredictionMarket {
  id: string;
  address: string;
  question: string;
  description: string;
  category: MarketCategory;

  outcomeA: string;
  outcomeB: string;
  outcomeAPercent: number;
  outcomeBPercent: number;

  liquidity: number;
  volume24h: number;
  totalVolume: number;

  createdAt: string;
  expiresAt: string;
  status: 'live' | 'closed' | 'resolved';

  image: string;
  creatorAddress: string;

  website?: string;
  twitter?: string;
  telegram?: string;

  chartData: Array<{ timestamp: string; price: number }>;
}

// Generate chart data
function generateChartData(basePct: number, volatility: number, days: number, ppd = 24) {
  const now = Date.now();
  const ms = (days * 86400000) / (days * ppd);
  const start = now - days * 86400000;
  const pts: Array<{ timestamp: string; price: number }> = [];
  let cur = basePct - volatility * 0.3 + Math.random() * volatility * 0.6;
  for (let i = 0; i < days * ppd; i++) {
    cur += (Math.random() - 0.48) * volatility * 0.15;
    cur = Math.max(5, Math.min(95, cur));
    if (i > days * ppd * 0.8) cur += (basePct - cur) * 0.05;
    pts.push({ timestamp: new Date(start + i * ms).toISOString(), price: cur / 100 });
  }
  return pts;
}

// Placeholder images from picsum for variety
const img = (seed: number) => `https://picsum.photos/seed/zugar${seed}/400/400`;

export const PREDICTION_MARKETS: PredictionMarket[] = [
  // ─── TRENDING ───
  {
    id: 'mkt_btc_gold', address: 'BTC9GoLd1MonthLyReTuRnMaRkEt2026aBcDeFgHiJ',
    question: 'BTC vs GOLD — Monthly Return',
    description: 'Which asset will have a higher monthly return by the resolution date?',
    category: 'trending', outcomeA: 'BTC', outcomeB: 'GOLD', outcomeAPercent: 63, outcomeBPercent: 37,
    liquidity: 1500, volume24h: 1500, totalVolume: 12400,
    createdAt: '2026-03-15T00:00:00Z', expiresAt: '2026-04-14T00:00:00Z', status: 'live',
    image: img(1), creatorAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    website: 'https://example.com', twitter: 'https://twitter.com/example',
    chartData: generateChartData(63, 20, 14),
  },
  {
    id: 'mkt_sol_200', address: 'SoLtO200bEfOrEaPrIl2026pReDiCtIoNmArKeTsXy',
    question: 'SOL to $200 before April?',
    description: 'Resolves YES if SOL reaches $200 on any major exchange before April 1, 2026.',
    category: 'trending', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 45, outcomeBPercent: 55,
    liquidity: 1900, volume24h: 7200, totalVolume: 48000,
    createdAt: '2026-03-01T00:00:00Z', expiresAt: '2026-04-01T00:00:00Z', status: 'live',
    image: img(2), creatorAddress: '6lKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(45, 22, 14),
  },
  {
    id: 'mkt_pepe_doge', address: 'PePeVsDoGe24HpRiCeBaTtLe2026pReDiCtIoNmKt',
    question: 'PEPE vs DOGE — 24h Price Battle',
    description: 'Which will have higher 24h price percentage change?',
    category: 'trending', outcomeA: 'PEPE', outcomeB: 'DOGE', outcomeAPercent: 62, outcomeBPercent: 38,
    liquidity: 420, volume24h: 2100, totalVolume: 9500,
    createdAt: '2026-03-24T00:00:00Z', expiresAt: '2026-03-26T00:00:00Z', status: 'live',
    image: img(3), creatorAddress: '1nKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(62, 25, 2),
  },
  {
    id: 'mkt_fed_rate', address: 'FeDrAtEcUt2026q2PrEdIcTiOnMaRkEtAbCdEfGhIj',
    question: 'Fed cuts rates before Q3 2026?',
    description: 'Resolves YES if the Federal Reserve announces a rate cut before July 1, 2026.',
    category: 'trending', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 41, outcomeBPercent: 59,
    liquidity: 4200, volume24h: 15600, totalVolume: 92000,
    createdAt: '2026-02-15T00:00:00Z', expiresAt: '2026-07-01T00:00:00Z', status: 'live',
    image: img(20), creatorAddress: '2aKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(41, 18, 20),
  },
  {
    id: 'mkt_ai_agi', address: 'AgIaChIeVeD2026pReDiCtIoNmArKeTaBcDeFgHiJk',
    question: 'Will AGI be achieved by end of 2026?',
    description: 'Resolves YES if a credible AI lab declares AGI achieved, verified by independent experts.',
    category: 'trending', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 15, outcomeBPercent: 85,
    liquidity: 6800, volume24h: 22000, totalVolume: 180000,
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-12-31T00:00:00Z', status: 'live',
    image: img(21), creatorAddress: '3bKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(15, 8, 30),
  },

  // ─── SPORTS ───
  {
    id: 'mkt_champions', address: 'ChAmPiOnSlEaGuEfInAl2025wInNeRpReDiCtIoNmK',
    question: 'Champions League Final 2025 Winner?',
    description: 'Who will win the UEFA Champions League 2024/25 final?',
    category: 'sports', outcomeA: 'Real Madrid', outcomeB: 'PSG', outcomeAPercent: 58, outcomeBPercent: 42,
    liquidity: 3200, volume24h: 12000, totalVolume: 85000,
    createdAt: '2026-02-01T00:00:00Z', expiresAt: '2026-06-01T00:00:00Z', status: 'live',
    image: img(4), creatorAddress: '2jKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(58, 16, 20),
  },
  {
    id: 'mkt_nba_mvp', address: 'NbAmVp2026sEaSoNpReDiCtIoNmArKeTaBcDeFgHiJ',
    question: 'NBA MVP 2025-26 Season?',
    description: 'Who will be named NBA Most Valuable Player for the 2025-26 season?',
    category: 'sports', outcomeA: 'Luka Doncic', outcomeB: 'Nikola Jokic', outcomeAPercent: 44, outcomeBPercent: 56,
    liquidity: 2100, volume24h: 8400, totalVolume: 52000,
    createdAt: '2026-01-15T00:00:00Z', expiresAt: '2026-06-15T00:00:00Z', status: 'live',
    image: img(5), creatorAddress: '3kKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(44, 14, 30),
  },
  {
    id: 'mkt_world_cup', address: 'FiFaWoRlDcUp2026wInNeRpReDiCtIoNmArKeTsAbC',
    question: 'FIFA World Cup 2026 Winner?',
    description: 'Which country will win the 2026 FIFA World Cup?',
    category: 'sports', outcomeA: 'Brazil', outcomeB: 'France', outcomeAPercent: 35, outcomeBPercent: 65,
    liquidity: 5600, volume24h: 18000, totalVolume: 120000,
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-07-19T00:00:00Z', status: 'live',
    image: img(6), creatorAddress: '4lKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(35, 18, 30),
  },
  {
    id: 'mkt_f1_2026', address: 'F1wOrLdChAmPiOn2026pReDiCtIoNmArKeTsAbCdEf',
    question: 'F1 World Champion 2026?',
    description: 'Who will win the 2026 Formula 1 World Drivers Championship?',
    category: 'sports', outcomeA: 'Max Verstappen', outcomeB: 'Lewis Hamilton', outcomeAPercent: 68, outcomeBPercent: 32,
    liquidity: 2800, volume24h: 9200, totalVolume: 67000,
    createdAt: '2026-03-01T00:00:00Z', expiresAt: '2026-12-15T00:00:00Z', status: 'live',
    image: img(22), creatorAddress: '5cKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(68, 14, 14),
  },

  // ─── CRYPTO ───
  {
    id: 'mkt_satoshi', address: 'SaToShImOvEaNyBiTcOiN2026pReDiCtIoNmArKeTs',
    question: 'Will Satoshi Move any Bitcoin in 2026?',
    description: 'Resolves YES if any Bitcoin from Satoshi Nakamoto known wallets is moved during 2026.',
    category: 'crypto', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 8, outcomeBPercent: 92,
    liquidity: 2400, volume24h: 8500, totalVolume: 95000,
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-12-31T00:00:00Z', status: 'live',
    image: img(7), creatorAddress: '3fKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(8, 6, 30),
  },
  {
    id: 'mkt_eth_10k', address: 'EtH10KbEfOrE2027pReDiCtIoNmArKeTsAbCdEfGhI',
    question: 'ETH to $10,000 before 2027?',
    description: 'Resolves YES if Ethereum reaches $10,000 on any major exchange before Jan 1, 2027.',
    category: 'crypto', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 28, outcomeBPercent: 72,
    liquidity: 3100, volume24h: 11000, totalVolume: 78000,
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', status: 'live',
    image: img(8), creatorAddress: '5gKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(28, 14, 30),
  },
  {
    id: 'mkt_wif_bonk', address: 'WiFvSbOnKsOlAnAmEmEsHoWdOwN2026pReDiCtIoNs',
    question: 'WIF vs BONK — Solana Meme Showdown',
    description: 'Which Solana meme coin will have higher market cap by end of Q2 2026?',
    category: 'crypto', outcomeA: 'WIF', outcomeB: 'BONK', outcomeAPercent: 52, outcomeBPercent: 48,
    liquidity: 2800, volume24h: 9500, totalVolume: 62000,
    createdAt: '2026-03-01T00:00:00Z', expiresAt: '2026-06-30T00:00:00Z', status: 'live',
    image: img(9), creatorAddress: '4kKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(52, 20, 14),
  },
  {
    id: 'mkt_okx_ipo', address: 'OkXiPo2026pReDiCtIoNmArKeTsAbCdEfGhIjKlMn',
    question: 'OKX IPO in 2026?',
    description: 'Resolves YES if OKX completes an IPO in 2026.',
    category: 'crypto', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 22, outcomeBPercent: 78,
    liquidity: 1200, volume24h: 4100, totalVolume: 28000,
    createdAt: '2026-01-15T00:00:00Z', expiresAt: '2026-12-31T00:00:00Z', status: 'live',
    image: img(10), creatorAddress: '9iKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(22, 10, 30),
  },
  {
    id: 'mkt_btc_150k', address: 'BtC150KbEfOrE2026eNdPrEdIcTiOnMaRkEtAbCdEf',
    question: 'BTC to $150K before 2027?',
    description: 'Resolves YES if Bitcoin hits $150,000 on any major exchange before Jan 1, 2027.',
    category: 'crypto', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 38, outcomeBPercent: 62,
    liquidity: 8200, volume24h: 31000, totalVolume: 210000,
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', status: 'live',
    image: img(23), creatorAddress: '6dKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(38, 16, 30),
  },

  // ─── TRUMP ───
  {
    id: 'mkt_trump_pardon', address: 'TrUmPpArDoN100pEoPlE2026pReDiCtIoNmArKeTsX',
    question: 'Will Trump pardon more than 100 people in 2026?',
    description: 'Resolves YES if President Trump issues more than 100 pardons during calendar year 2026.',
    category: 'trump', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 35, outcomeBPercent: 65,
    liquidity: 890, volume24h: 3200, totalVolume: 18000,
    createdAt: '2026-01-20T00:00:00Z', expiresAt: '2026-12-31T00:00:00Z', status: 'live',
    image: img(11), creatorAddress: '7mKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(35, 12, 30),
  },
  {
    id: 'mkt_trump_tariff', address: 'TrUmPtArIfFcHiNa50pErCeNt2026pReDiCtIoNmKt',
    question: 'Trump raises China tariffs above 50% before July?',
    description: 'Resolves YES if the US imposes tariffs exceeding 50% on Chinese goods before July 1, 2026.',
    category: 'trump', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 72, outcomeBPercent: 28,
    liquidity: 1400, volume24h: 5800, totalVolume: 34000,
    createdAt: '2026-02-01T00:00:00Z', expiresAt: '2026-07-01T00:00:00Z', status: 'live',
    image: img(12), creatorAddress: '8nKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(72, 15, 20),
  },
  {
    id: 'mkt_trump_tweet', address: 'TrUmPtWeEt10kInOnEdAy2026pReDiCtIoNmArKeTs',
    question: 'Trump tweets more than 50 times in one day in 2026?',
    description: 'Resolves YES if Trump posts more than 50 times on Truth Social in a single calendar day during 2026.',
    category: 'trump', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 85, outcomeBPercent: 15,
    liquidity: 320, volume24h: 1500, totalVolume: 8900,
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-12-31T00:00:00Z', status: 'live',
    image: img(13), creatorAddress: '9oKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(85, 8, 30),
  },
  {
    id: 'mkt_trump_approve', address: 'TrUmPaPpRoVaL50pErCeNt2026pReDiCtIoNmArKeT',
    question: 'Trump approval rating above 50% by June?',
    description: 'Resolves YES if Trump approval rating exceeds 50% in any major poll before July 1, 2026.',
    category: 'trump', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 28, outcomeBPercent: 72,
    liquidity: 1100, volume24h: 4500, totalVolume: 26000,
    createdAt: '2026-01-15T00:00:00Z', expiresAt: '2026-07-01T00:00:00Z', status: 'live',
    image: img(24), creatorAddress: '7eKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(28, 10, 20),
  },

  // ─── OTHERS ───
  {
    id: 'mkt_aliens', address: 'AlIeNsExIsT2027uSaCkNoWlEdGe2026rAnDoMaDs',
    question: 'Will the US confirm that aliens exist before 2027?',
    description: 'Resolves YES if the US government officially confirms the existence of extraterrestrial life before Jan 1, 2027.',
    category: 'others', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 12, outcomeBPercent: 88,
    liquidity: 56, volume24h: 180, totalVolume: 890,
    createdAt: '2026-01-15T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', status: 'live',
    image: img(14), creatorAddress: '4bKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(12, 6, 30),
  },
  {
    id: 'mkt_president_2028', address: 'PrEsIdEnTiAlElEcTiOn2028wInNeRpReDiCtIoNmK',
    question: 'Presidential Election Winner 2028',
    description: 'Who will win the 2028 US Presidential Election?',
    category: 'others', outcomeA: 'JB Pritzker', outcomeB: 'AOC', outcomeAPercent: 55, outcomeBPercent: 45,
    liquidity: 829, volume24h: 4200, totalVolume: 45000,
    createdAt: '2026-02-01T00:00:00Z', expiresAt: '2028-11-07T00:00:00Z', status: 'live',
    image: img(15), creatorAddress: '6cKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(55, 15, 30),
  },
  {
    id: 'mkt_mars_mission', address: 'MaRsMiSsIoN2026sPaCeXlAuNcHpReDiCtIoNmArKe',
    question: 'SpaceX launches Mars mission in 2026?',
    description: 'Resolves YES if SpaceX successfully launches a mission toward Mars during 2026.',
    category: 'others', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 18, outcomeBPercent: 82,
    liquidity: 1500, volume24h: 5800, totalVolume: 38000,
    createdAt: '2026-01-01T00:00:00Z', expiresAt: '2026-12-31T00:00:00Z', status: 'live',
    image: img(25), creatorAddress: '8fKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(18, 8, 30),
  },
  {
    id: 'mkt_tiktok_ban', address: 'TiKtOkBaNuSa2026pReDiCtIoNmArKeTsAbCdEfGhI',
    question: 'TikTok banned in the US by end of 2026?',
    description: 'Resolves YES if TikTok is officially banned or unavailable in the US before Jan 1, 2027.',
    category: 'others', outcomeA: 'Yes', outcomeB: 'No', outcomeAPercent: 42, outcomeBPercent: 58,
    liquidity: 3400, volume24h: 13000, totalVolume: 95000,
    createdAt: '2026-02-01T00:00:00Z', expiresAt: '2027-01-01T00:00:00Z', status: 'live',
    image: img(26), creatorAddress: '9gKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    chartData: generateChartData(42, 16, 20),
  },
];

// ─── Helpers ───

export interface OrderBookEntry {
  price: number; shares: number; total: number; side: 'buy' | 'sell';
}

export function generateOrderBook(market: PredictionMarket) {
  const base = market.outcomeAPercent / 100;
  const buyOrders: OrderBookEntry[] = [];
  const sellOrders: OrderBookEntry[] = [];
  for (let i = 0; i < 6; i++) {
    const bp = Math.max(0.01, base - (i + 1) * 0.015 + Math.random() * 0.005);
    const bs = Math.floor(100 + Math.random() * 500);
    buyOrders.push({ price: +bp.toFixed(3), shares: bs, total: Math.floor(bp * bs), side: 'buy' });
    const sp = Math.min(0.99, base + (i + 1) * 0.015 + Math.random() * 0.005);
    const ss = Math.floor(100 + Math.random() * 500);
    sellOrders.push({ price: +sp.toFixed(3), shares: ss, total: Math.floor(sp * ss), side: 'sell' });
  }
  return {
    buyOrders: buyOrders.sort((a, b) => b.price - a.price),
    sellOrders: sellOrders.sort((a, b) => a.price - b.price),
  };
}

export function getRelatedMarkets(currentId: string, count = 5): PredictionMarket[] {
  return PREDICTION_MARKETS.filter((m) => m.id !== currentId).sort(() => Math.random() - 0.5).slice(0, count);
}

export function getMarketByAddress(address: string): PredictionMarket | undefined {
  return PREDICTION_MARKETS.find((m) => m.address === address);
}

export function getMarketsByCategory(category: MarketCategory): PredictionMarket[] {
  if (category === 'trending') return PREDICTION_MARKETS;
  return PREDICTION_MARKETS.filter((m) => m.category === category);
}

export function marketsAsTokens(markets?: PredictionMarket[]): any[] {
  return (markets || PREDICTION_MARKETS).map((m) => ({
    id: m.id, chainId: 0, address: m.address, creatorAddress: m.creatorAddress,
    name: m.question, symbol: m.outcomeA, logo: m.image, description: m.description,
    createdAt: m.createdAt, updatedAt: m.createdAt,
    website: m.website || '', telegram: m.telegram || '', discord: '', twitter: m.twitter || '', youtube: '',
    latestTransactionTimestamp: m.createdAt, marketCap: m.liquidity, priceUsd: m.outcomeAPercent / 100,
    volume24h: m.volume24h, status: m.status, progressDex: m.outcomeAPercent,
    _predictionMarket: m,
  }));
}
