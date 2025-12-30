import { Token } from '@/interface/types';

const nowIso = () => new Date().toISOString();

const makeToken = (i: number, overrides?: Partial<Token>): Token => {
  const addr = `0x${i.toString().padStart(40, '0')}`;
  const createdAt = new Date(Date.now() - i * 3600_000).toISOString();
  const updatedAt = nowIso();

  const base: Token = {
    id: `mock-${i}`,
    chainId: 109,
    map: 'EVM',

    address: addr,
    creatorAddress: `0xcreator${i.toString().padStart(34, '0')}`,

    name: `Meme Sprout ${i}`,
    symbol: `SPRT${i}`,

    logo: `https://api.dicebear.com/7.x/bottts/png?seed=logo${i}`,

    description: `Mock description for Meme Sprout ${i}`,
    website: 'https://example.com',
    twitter: 'https://twitter.com/example',
    telegram: 'https://t.me/example',
    discord: 'https://discord.gg/example',
    youtube: '',

    createdAt,
    updatedAt,
    latestTransactionTimestamp: updatedAt,



    _count: {
      liquidityEvents: 0,
    },
  };

  return { ...base, ...(overrides ?? {}) };
};

/**
 * Mock tokens cho Home page + click vào detail
 * - logo: TokenCard / marquee
 * - image: cover ở detail
 */
export const mockTokens: Token[] = [
  makeToken(1, {
    name: 'Pepe Seed',
    symbol: 'PSEED',
    address: '0x0000000000000000000000000000000000000001',
    logo: 'https://assets.coingecko.com/coins/images/29850/thumb/pepe.png',
  }),
  makeToken(2, {
    name: 'Doge Sprout',
    symbol: 'DOGSP',
    address: '0x0000000000000000000000000000000000000002',
    logo: 'https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png',
  }),

  ...Array.from({ length: 18 }).map((_, idx) => makeToken(idx + 3)),
];
