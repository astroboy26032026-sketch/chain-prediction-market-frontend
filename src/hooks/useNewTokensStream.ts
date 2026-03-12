// Hook: manages WebSocket new tokens injection into the list

import { useEffect, useState } from 'react';
import { useWebSocket } from '@/components/providers/WebSocketProvider';
import type { Token, PaginatedResponse, TokenWithLiquidityEvents } from '@/interface/types';

export function useNewTokensStream(
  setTokens: React.Dispatch<React.SetStateAction<PaginatedResponse<Token | TokenWithLiquidityEvents> | null>>
) {
  const { newTokens } = useWebSocket();

  const [showNewTokens, setShowNewTokens] = useState(false);
  const [newTokensBuffer, setNewTokensBuffer] = useState<Token[]>([]);
  const [displayedNewTokens, setDisplayedNewTokens] = useState<Token[]>([]);

  useEffect(() => {
    if (!newTokens?.length) return;

    if (showNewTokens) {
      setTokens((prev) => {
        if (!prev) return prev;
        const existing = prev.data ?? [];
        const toAdd = newTokens.filter(
          (n) => !existing.some((e: any) => e?.id === n.id) && !displayedNewTokens.some((d) => d.id === n.id)
        );
        if (!toAdd.length) return prev;
        setDisplayedNewTokens((p) => [...p, ...toAdd]);
        return {
          ...prev,
          data: [...toAdd, ...existing],
          totalCount: (prev.totalCount || 0) + toAdd.length,
        };
      });
    } else {
      setNewTokensBuffer((prev) => {
        const toAdd = newTokens.filter((n) => !prev.some((p) => p.id === n.id));
        return toAdd.length ? [...toAdd, ...prev] : prev;
      });
    }
  }, [newTokens, showNewTokens, displayedNewTokens, setTokens]);

  return {
    showNewTokens,
    setShowNewTokens,
    newTokensBuffer,
  };
}
