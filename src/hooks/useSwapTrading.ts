// Hook: manages swap UI state (buy/sell), preview estimation, and trade execution

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { toast } from 'react-toastify';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, PublicKey, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';

import {
  buyToken,
  sellToken,
  submitSignature,
  getTradingStatus,
  newIdempotencyKey,
} from '@/utils/api.index';
import type { Token, TradingBuyResponse, TradingTxStatusResponse } from '@/interface/types';
import {
  clamp,
  sleep,
  normalizeTrackingEndpoint,
  parseNumberInput,
  toBaseUnitsString,
  estimateTokensFromSol,
  estimateSolFromTokens,
  POLL_INTERVAL_MS,
  POLL_MAX_TRIES,
} from '@/utils/tradingHelpers';

export function useSwapTrading({
  tokenAddr,
  tokenInfo,
  decimals,
  fetchLiquidity,
  onTradeSuccess,
}: {
  tokenAddr: string | undefined;
  tokenInfo: Token | null;
  decimals: number;
  fetchLiquidity: () => Promise<void>;
  onTradeSuccess: () => void;
}) {
  const wallet = useWallet();
  const { connection } = useConnection();

  const [fromToken, setFromToken] = useState({ symbol: 'SOL', amount: '' });
  const [toToken, setToToken] = useState({ symbol: '', amount: '' });
  const [isSwapped, setIsSwapped] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);

  const [solBalance, setSolBalance] = useState('0.000');
  const [tokenBalance, setTokenBalance] = useState('0.000');
  const balanceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Fetch real balances
  useEffect(() => {
    const fetchBalances = async () => {
      if (!wallet?.publicKey || !connection) return;
      try {
        const lamports = await connection.getBalance(wallet.publicKey);
        setSolBalance((lamports / LAMPORTS_PER_SOL).toFixed(4));
      } catch {
        // keep previous value
      }
      if (tokenAddr) {
        try {
          const { value } = await connection.getParsedTokenAccountsByOwner(
            wallet.publicKey,
            { mint: new PublicKey(tokenAddr) },
          );
          const amt = value[0]?.account?.data?.parsed?.info?.tokenAmount?.uiAmountString;
          setTokenBalance(amt ?? '0.000');
        } catch {
          setTokenBalance('0.000');
        }
      }
    };
    fetchBalances();
    balanceTimerRef.current = setInterval(fetchBalances, 15_000);
    return () => clearInterval(balanceTimerRef.current);
  }, [wallet?.publicKey, connection, tokenAddr]);

  // settings
  const [antiMEV, setAntiMEV] = useState(false);
  const [txSpeed, setTxSpeed] = useState<'auto' | 'manual'>('auto');
  const [priorityFee, setPriorityFee] = useState('0.002');
  const [bribe, setBribe] = useState('0.01');
  const [slippagePct, setSlippagePct] = useState(1);

  const [debouncedFromAmount] = useDebounce(fromToken.amount, 350);

  const actionButtonText = isSwapped ? 'Sell' : 'Buy';

  // Reset swap when token changes
  useEffect(() => {
    setFromToken({ symbol: 'SOL', amount: '' });
    setToToken({ symbol: '', amount: '' });
    setIsSwapped(false);
  }, [tokenAddr]);

  // Sync symbols when tokenInfo ready
  useEffect(() => {
    if (!tokenInfo) return;
    const sym = String((tokenInfo as any)?.symbol ?? '').trim() || 'TOKEN';
    if (!isSwapped) {
      setFromToken((prev) => ({ ...prev, symbol: 'SOL' }));
      setToToken((prev) => ({ ...prev, symbol: sym }));
    } else {
      setFromToken((prev) => ({ ...prev, symbol: sym }));
      setToToken((prev) => ({ ...prev, symbol: 'SOL' }));
    }
  }, [tokenInfo, isSwapped]);

  // Preview estimation
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!tokenAddr || !tokenInfo) return;
      const raw = String(debouncedFromAmount ?? '').trim();
      if (!raw) {
        setToToken((prev) => ({ ...prev, amount: '' }));
        setIsCalculating(false);
        return;
      }
      const n = parseNumberInput(raw);
      if (!Number.isFinite(n) || n <= 0) {
        setToToken((prev) => ({ ...prev, amount: '' }));
        setIsCalculating(false);
        return;
      }
      setIsCalculating(true);
      try {
        if (!isSwapped) {
          const est = await estimateTokensFromSol({ tokenAddr, solIn: n });
          if (cancelled) return;
          setToToken((prev) => ({ ...prev, amount: Number(est.tokenOutHuman).toFixed(3) }));
        } else {
          const est = await estimateSolFromTokens({ tokenAddr, tokenInHuman: n });
          if (cancelled) return;
          setToToken((prev) => ({ ...prev, amount: Number(est.solOut).toFixed(6) }));
        }
      } catch (err) {
        console.warn('[Swap] Estimation failed:', err instanceof Error ? err.message : err);
        if (!cancelled) setToToken((prev) => ({ ...prev, amount: '' }));
      } finally {
        if (!cancelled) setIsCalculating(false);
      }
    };

    run();
    return () => { cancelled = true; };
  }, [debouncedFromAmount, isSwapped, tokenAddr, tokenInfo]);

  const handleSwap = useCallback(() => {
    setIsSwapped((prev) => !prev);
    setFromToken((prev) => ({ ...prev, amount: '' }));
    setToToken((prev) => ({ ...prev, amount: '' }));
  }, []);

  const handleFromAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setFromToken((prev) => ({ ...prev, amount: e.target.value }));
    setIsCalculating(true);
  }, []);

  const handleMaxClick = useCallback(() => {
    if (isSwapped) setFromToken((prev) => ({ ...prev, amount: tokenBalance }));
    else setFromToken((prev) => ({ ...prev, amount: solBalance }));
  }, [isSwapped, tokenBalance, solBalance]);

  const pollStatus = useCallback(async (statusEndpointRaw: string) => {
    const statusEndpoint = normalizeTrackingEndpoint(statusEndpointRaw);
    if (!statusEndpoint) return null;
    for (let i = 0; i < POLL_MAX_TRIES; i++) {
      try {
        const st = (await getTradingStatus(statusEndpoint)) as TradingTxStatusResponse;
        const s = String((st as any)?.status ?? '').toUpperCase();
        if (s === 'CONFIRMED') return st;
        if (s === 'FAILED') return st;
      } catch { /* ignore transient */ }
      await sleep(POLL_INTERVAL_MS);
    }
    return null;
  }, []);

  const handleAction = useCallback(async () => {
    if (!tokenAddr || !tokenInfo || !fromToken.amount) {
      toast.error('Missing required information');
      return;
    }
    if (!wallet?.connected || !wallet.publicKey) {
      toast.error('Connect wallet to trade');
      return;
    }
    if (!wallet.sendTransaction) {
      toast.error('Wallet does not support sendTransaction');
      return;
    }

    const rawIn = String(fromToken.amount).trim();
    const inNum = parseNumberInput(rawIn);
    if (!Number.isFinite(inNum) || inNum <= 0) {
      toast.error(isSwapped ? 'Invalid TOKEN amount' : 'Invalid SOL amount');
      return;
    }

    setIsTransacting(true);
    try {
      const slippageBps = clamp(Math.trunc(slippagePct * 100), 0, 10_000);
      const idk = newIdempotencyKey(isSwapped ? 'sell' : 'buy');

      let quote: any;
      let txId: string;

      if (!isSwapped) {
        const pv = await estimateTokensFromSol({ tokenAddr, solIn: inNum });
        const humanStr = pv.tokenOutHuman.toFixed(clamp(decimals, 0, 18));
        const amountInToken = toBaseUnitsString(humanStr, decimals);
        if (!amountInToken || amountInToken === '0') throw new Error('Amount too small');

        quote = (await buyToken(
          { tokenAddress: tokenAddr, amountInToken, slippageBps },
          { idempotencyKey: idk }
        )) as TradingBuyResponse;
      } else {
        const humanStr = inNum.toFixed(clamp(decimals, 0, 18));
        const amountInToken = toBaseUnitsString(humanStr, decimals);
        if (!amountInToken || amountInToken === '0') throw new Error('Amount too small');

        quote = await sellToken(
          { tokenAddress: tokenAddr, amountInToken, slippageBps },
          { idempotencyKey: idk }
        );
      }

      const tracking = quote?.tracking || {};
      const submitEpRaw = tracking.submitSignatureEndpoint || tracking.submitSignatureBySignatureEndpoint || tracking.submitEndpoint || '';
      const statusEpRaw = tracking.statusEndpoint || tracking.statusBySignatureEndpoint || tracking.status || '';
      const submitEp = normalizeTrackingEndpoint(submitEpRaw);
      const statusEp = normalizeTrackingEndpoint(statusEpRaw);

      if (!quote?.txBase64 || !submitEp) {
        throw new Error('Invalid trade response (missing txBase64/tracking.submitSignatureEndpoint)');
      }

      txId = String(quote?.transactionId ?? quote?.id ?? '').trim();
      if (!txId) throw new Error('Missing transactionId/id from trade quote');

      const rawTx = Buffer.from(String(quote.txBase64), 'base64');
      const tx = VersionedTransaction.deserialize(rawTx);

      toast.info(isSwapped ? 'Sending SELL transaction...' : 'Sending BUY transaction...');

      const txSignature = await wallet.sendTransaction(tx, connection, {
        preflightCommitment: 'processed',
      });

      toast.info('Submitting signature to backend...');
      await submitSignature(submitEp, { id: txId, txSignature } as any);

      connection.confirmTransaction(txSignature, 'processed').catch(() => {});

      if (!statusEp) {
        toast.success('Submitted (no status endpoint).');
        onTradeSuccess();
        fetchLiquidity();
        return;
      }

      toast.info('Checking backend status...');
      const st = await pollStatus(statusEp);
      const finalStatus = String((st as any)?.status ?? '').toUpperCase();

      if (finalStatus === 'CONFIRMED') {
        toast.success(isSwapped ? 'Sell confirmed' : 'Buy confirmed');
        onTradeSuccess();
        fetchLiquidity();
      } else if (finalStatus === 'FAILED') {
        toast.error(`Trade failed${(st as any)?.error ? `: ${(st as any).error}` : ''}`);
      } else {
        toast.success('Submitted. Status pending.');
      }
    } catch (e: any) {
      console.error('Trade flow error:', e);
      toast.error(e?.message || 'Trade failed');
    } finally {
      setIsTransacting(false);
    }
  }, [tokenAddr, tokenInfo, fromToken.amount, isSwapped, wallet, connection, fetchLiquidity, pollStatus, decimals, slippagePct, onTradeSuccess]);

  return {
    fromToken,
    toToken,
    isSwapped,
    isCalculating,
    isTransacting,
    solBalance,
    tokenBalance,
    actionButtonText,
    // settings
    antiMEV, setAntiMEV,
    txSpeed, setTxSpeed,
    priorityFee, setPriorityFee,
    bribe, setBribe,
    slippagePct, setSlippagePct,
    // handlers
    setIsSwapped,
    handleSwap,
    handleFromAmountChange,
    handleMaxClick,
    handleAction,
  };
}
