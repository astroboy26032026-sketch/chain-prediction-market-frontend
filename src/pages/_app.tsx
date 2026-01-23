// src/pages/_app.tsx
import '@/styles/globals.css';
import '@/styles/components/marquee.css';
import type { AppProps } from 'next/app';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets';

import '@solana/wallet-adapter-react-ui/styles.css';

import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  // RPC endpoint (khuyến nghị để trong .env.local)
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

  // Wallet adapters
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <AuthProvider>
              <WebSocketProvider>
                <Component {...pageProps} />
                <ToastContainer />
              </WebSocketProvider>
            </AuthProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
