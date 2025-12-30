export function getMockChats(tokenAddress: string) {
    return [
      {
        id: 1,
        user: '0xcreator000000000000000000000000000001',
        token: tokenAddress,
        message: 'Welcome to the official token chat 🚀',
        reply_to: null,
        timestamp: new Date(Date.now() - 120_000).toISOString(),
      },
      {
        id: 2,
        user: '0xuser000000000000000000000000000000002',
        token: tokenAddress,
        message: 'LFG 🔥',
        reply_to: 1,
        timestamp: new Date().toISOString(),
      },
    ];
  }
  