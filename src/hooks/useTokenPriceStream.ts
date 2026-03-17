import { useEffect, useRef } from 'react';
import { useWebSocket, PriceTick } from '@/components/providers/WebSocketProvider';

/**
 * Subscribe to real-time price ticks for a token via WebSocket.
 * Calls `onTick` whenever a new price arrives.
 *
 * Usage in TradingViewChart:
 * ```ts
 * useTokenPriceStream(tokenAddress, (tick) => {
 *   candleRef.current?.update({
 *     time: Math.floor(new Date(tick.timestamp).getTime() / 1000) as Time,
 *     open: tick.price,
 *     high: tick.price,
 *     low: tick.price,
 *     close: tick.price,
 *   });
 * });
 * ```
 */
export function useTokenPriceStream(
  tokenAddress: string | undefined,
  onTick: (tick: PriceTick) => void
) {
  const { subscribePriceTick } = useWebSocket();
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!tokenAddress) return;

    const unsub = subscribePriceTick(tokenAddress, (tick) => {
      onTickRef.current(tick);
    });

    return unsub;
  }, [tokenAddress, subscribePriceTick]);
}
