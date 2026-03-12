import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Token } from '@/interface/types';

interface WebSocketContextType {
  newTokens: Token[];
  newTransactions: any[];
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

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
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'tokenCreated') {
              setNewTokens(prev => [data.data, ...prev].slice(0, MAX_BUFFER_SIZE));
            } else if (data.type === 'tokensBought' || data.type === 'tokensSold') {
              setNewTransactions(prev => [data.data, ...prev].slice(0, MAX_BUFFER_SIZE));
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
    <WebSocketContext.Provider value={{ newTokens, newTransactions }}>
      {children}
    </WebSocketContext.Provider>
  );
};
