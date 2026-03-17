import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { Token } from '@/interface/types';

/* ═══════════════════ TYPES ═══════════════════ */

export interface PriceTick {
  tokenAddress: string;
  timestamp: string; // ISO
  price: number;
  volume?: number;
}

type PriceTickHandler = (tick: PriceTick) => void;

interface WebSocketContextType {
  newTokens: Token[];
  newTransactions: any[];
  /** Subscribe to realtime price updates for a token. Returns unsubscribe fn. */
  subscribePriceTick: (tokenAddress: string, handler: PriceTickHandler) => () => void;
  /** Send a message to the WS server (e.g. subscribe/unsubscribe) */
  sendMessage: (msg: Record<string, unknown>) => void;
}

/* ═══════════════════ CONTEXT ═══════════════════ */

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

/* ═══════════════════ PROVIDER ═══════════════════ */

const MAX_RECONNECT_DELAY = 30_000;
const INITIAL_RECONNECT_DELAY = 1_000;
const MAX_BUFFER_SIZE = 100;

export const WebSocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [newTokens, setNewTokens] = useState<Token[]>([]);
  const [newTransactions, setNewTransactions] = useState<any[]>([]);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Price tick subscribers: Map<tokenAddress, Set<handler>>
  const priceSubsRef = useRef<Map<string, Set<PriceTickHandler>>>(new Map());

  // Queue of messages to send once connected
  const pendingMsgsRef = useRef<Array<Record<string, unknown>>>([]);

  const sendMessage = useCallback((msg: Record<string, unknown>) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(msg));
    } else {
      pendingMsgsRef.current.push(msg);
    }
  }, []);

  const subscribePriceTick = useCallback((tokenAddress: string, handler: PriceTickHandler) => {
    if (!priceSubsRef.current.has(tokenAddress)) {
      priceSubsRef.current.set(tokenAddress, new Set());
      // Tell BE to start sending price ticks for this token
      sendMessage({ type: 'subscribe', channel: 'price', tokenAddress });
    }
    priceSubsRef.current.get(tokenAddress)!.add(handler);

    // Return unsubscribe function
    return () => {
      const subs = priceSubsRef.current.get(tokenAddress);
      if (subs) {
        subs.delete(handler);
        if (subs.size === 0) {
          priceSubsRef.current.delete(tokenAddress);
          sendMessage({ type: 'unsubscribe', channel: 'price', tokenAddress });
        }
      }
    };
  }, [sendMessage]);

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      const wsUrl = process.env.NEXT_PUBLIC_WS_BASE_URL;
      if (!wsUrl) return;

      try {
        const socket = new WebSocket(wsUrl);
        socketRef.current = socket;

        socket.onopen = () => {
          reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;

          // Flush pending messages
          for (const msg of pendingMsgsRef.current) {
            socket.send(JSON.stringify(msg));
          }
          pendingMsgsRef.current = [];

          // Re-subscribe to all active price channels
          for (const tokenAddress of priceSubsRef.current.keys()) {
            socket.send(JSON.stringify({ type: 'subscribe', channel: 'price', tokenAddress }));
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.type === 'tokenCreated') {
              setNewTokens(prev => [data.data, ...prev].slice(0, MAX_BUFFER_SIZE));
            } else if (data.type === 'tokensBought' || data.type === 'tokensSold') {
              setNewTransactions(prev => [data.data, ...prev].slice(0, MAX_BUFFER_SIZE));

              // Also dispatch as price tick if it has price info
              const tradeData = data.data;
              if (tradeData?.tokenAddress && tradeData?.price != null) {
                const tick: PriceTick = {
                  tokenAddress: tradeData.tokenAddress,
                  timestamp: tradeData.timestamp || new Date().toISOString(),
                  price: Number(tradeData.price),
                  volume: tradeData.solAmount != null ? Number(tradeData.solAmount) : undefined,
                };
                const subs = priceSubsRef.current.get(tick.tokenAddress);
                if (subs) subs.forEach((h) => h(tick));
              }
            } else if (data.type === 'priceTick' || data.type === 'price') {
              // Dedicated price tick message from BE
              const tick: PriceTick = {
                tokenAddress: data.tokenAddress || data.data?.tokenAddress,
                timestamp: data.timestamp || data.data?.timestamp || new Date().toISOString(),
                price: Number(data.price ?? data.data?.price ?? 0),
                volume: data.volume ?? data.data?.volume,
              };
              if (tick.tokenAddress) {
                const subs = priceSubsRef.current.get(tick.tokenAddress);
                if (subs) subs.forEach((h) => h(tick));
              }
            }
          } catch (e) {
            console.warn('[WebSocket] Malformed message:', e);
          }
        };

        socket.onclose = () => {
          if (mountedRef.current) scheduleReconnect();
        };

        socket.onerror = () => {
          socket.close();
        };
      } catch {
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      if (!mountedRef.current) return;

      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY);

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    }

    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) socketRef.current.close();
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ newTokens, newTransactions, subscribePriceTick, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
