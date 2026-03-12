// src/pages/_app.tsx
import '@/styles/globals.css';
import '@/styles/components/marquee.css';
import '@/styles/pages/home.css';
import '@/styles/pages/stake.css';
import type { AppProps } from 'next/app';

import React, { useMemo } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';

import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

import '@solana/wallet-adapter-react-ui/styles.css';

import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import ErrorBoundary from '@/components/ErrorBoundary';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  const endpoint =
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

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
                <ErrorBoundary>
                  <Component {...pageProps} />
                </ErrorBoundary>
                <ToastContainer />
              </WebSocketProvider>
            </AuthProvider>
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </QueryClientProvider>
  );
}
