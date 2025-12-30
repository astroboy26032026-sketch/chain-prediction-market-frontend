export function getMockHolders(tokenAddress: string) {
    return Array.from({ length: 50 }).map((_, i) => ({
      address: `0xholder${i.toString().padStart(40, '0')}`,
      balance: BigInt(1_000_000 * (50 - i)),
    }));
  }
  