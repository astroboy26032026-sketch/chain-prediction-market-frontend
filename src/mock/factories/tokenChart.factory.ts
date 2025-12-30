export function getMockChartData() {
    return Array.from({ length: 120 }).map((_, i) => ({
      timestamp: Date.now() - (120 - i) * 60_000,
      tokenPriceUSD: (0.01 + Math.sin(i / 5) * 0.003).toFixed(6),
    }));
  }
  