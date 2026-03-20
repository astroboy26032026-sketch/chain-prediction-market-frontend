// src/pages/create.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';

import {
  uploadTokenImage,
  createTokenDraft,
  finalizeTokenCreation,
  buyToken,
  submitSignature,
  getTradingStatus,
  newIdempotencyKey,
  type CreateTokenDraftResponse,
} from '@/utils/api';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

// PurchaseConfirmationPopup removed — BUY now directly calls runFinalize
import Modal from '@/components/notifications/Modal';

// wallet adapter
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { normalizeTrackingEndpoint, estimateTokensFromSol } from '@/utils/tradingHelpers';

type Step = 1 | 2 | 3;

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB — raw file limit (will compress before upload)
const COMPRESSED_TARGET = 800 * 1024; // compress to ~800KB for BE

// =====================
// ✅ Symbol rules (SAFE: BE(2-16) ∩ On-chain(1-10) = 2-10)
// =====================
const SYMBOL_MIN = 2;
const SYMBOL_MAX = 10;
const SYMBOL_RE = /^[A-Z0-9]{2,10}$/;

function normalizeSymbol(input: string) {
  return (input || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, SYMBOL_MAX);
}

function validateSymbolOrThrow(symbol: string) {
  const s = normalizeSymbol(symbol);
  if (!SYMBOL_RE.test(s)) {
    throw new Error(`Symbol must be uppercase alphanumeric, ${SYMBOL_MIN}-${SYMBOL_MAX} characters`);
  }
  return s;
}

const makeSymbol = (name: string) => {
  const s = normalizeSymbol(name);
  if (s.length >= SYMBOL_MIN) return s;
  return (s + 'TK').slice(0, SYMBOL_MIN);
};

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ''));
    r.onerror = () => reject(new Error('Failed to read file'));
    r.readAsDataURL(file);
  });
}

/**
 * Compress image client-side using canvas.
 * Returns a File ≤ targetSize (best effort).
 */
async function compressImage(file: File, targetSize = COMPRESSED_TARGET): Promise<File> {
  if (file.size <= targetSize) return file;

  const bmp = await createImageBitmap(file);
  let { width, height } = bmp;

  // Scale down large images
  const MAX_DIM = 1500;
  if (width > MAX_DIM || height > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return file;
  ctx.drawImage(bmp, 0, 0, width, height);

  const toBlob = (q: number): Promise<Blob | null> =>
    new Promise((res) => canvas.toBlob(res, 'image/jpeg', q));

  // Try decreasing quality until under target
  for (const q of [0.85, 0.7, 0.55, 0.4]) {
    const blob = await toBlob(q);
    if (blob && (blob.size <= targetSize || q === 0.4)) {
      const compressed = new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
      console.log(`[CreateToken] Compressed ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (q=${q})`);
      return compressed;
    }
  }

  return file;
}

function safeErrMsg(e: any, fallback: string) {
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
}

function isExpiredDraftStatus(status?: number) {
  return status === 410;
}

const isNonNegInt = (v: any) => Number.isFinite(Number(v)) && Number(v) >= 0;
const isNumericString = (v: any) => /^\d+$/.test(String(v ?? '').trim());

// =====================
// Step Progress Indicator
// =====================
const STEP_LABELS = ['Basic Info', 'Advance Info', 'Buy'] as const;

const StepIndicator: React.FC<{ current: Step }> = ({ current }) => (
  <div className="w-full max-w-xl mx-auto mb-8">
    {/* Row: circles + connecting lines — lines centered vertically with circles */}
    <div className="flex items-center justify-center">
      {STEP_LABELS.map((_, i) => {
        const num = (i + 1) as Step;
        const isDone = num < current;
        const isActive = num === current;

        return (
          <React.Fragment key={num}>
            {/* Connecting line before (except first) — same height as circle center */}
            {i > 0 && (
              <div
                className={`flex-1 h-[3px] ${
                  isDone || isActive ? 'bg-[var(--accent)]' : 'bg-gray-600'
                }`}
              />
            )}

            {/* Circle only */}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all shrink-0 ${
                isDone
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                  : isActive
                  ? 'bg-[var(--accent)] border-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/30'
                  : 'bg-[var(--card2)] border-gray-600 text-gray-400'
              }`}
            >
              {isDone ? (
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                num
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>

    {/* Row: labels below — aligned under each circle */}
    <div className="flex justify-between mt-2 px-0">
      {STEP_LABELS.map((label, i) => {
        const num = (i + 1) as Step;
        const isDone = num < current;
        const isActive = num === current;

        return (
          <span
            key={num}
            className={`text-xs font-semibold whitespace-nowrap ${
              i === 0 ? 'text-left' : i === STEP_LABELS.length - 1 ? 'text-right' : 'text-center'
            } ${isDone || isActive ? 'text-white' : 'text-gray-500'}`}
            style={{ width: `${100 / STEP_LABELS.length}%` }}
          >
            {label}
          </span>
        );
      })}
    </div>
  </div>
);

const CreateToken: React.FC = () => {
  const router = useRouter();

  // wallet
  const wallet = useWallet();
  const { connected } = wallet;
  const { connection } = useConnection();

  // ===== Step control =====
  const [step, setStep] = useState<Step>(1);

  // ===== Step 1: Basic =====
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [isNSFW, setIsNSFW] = useState(false);

  const [tokenImageUrl, setTokenImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [website, setWebsite] = useState('');
  const [telegram, setTelegram] = useState('');
  const [discord, setDiscord] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  const [isSocialExpanded, setIsSocialExpanded] = useState(false);

  // Draft from BE
  const [draft, setDraft] = useState<CreateTokenDraftResponse | null>(null);

  // Upload input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ===== Step 2: Curve params (UI hidden — BE auto-configures) =====
  // >>> DELETE these when BE removes curve params from finalize API <<<
  const [decimals] = useState<number>(6);
  const curveType = 0;

  const [basePriceLamports] = useState<number>(1000);
  const [slopeLamports] = useState<number>(1);
  const [bondingCurveSupply] = useState<string>('1000000000000000');
  const [graduateTargetLamports] = useState<string>('69000000000');

  // ===== Step 3: Finalize / Buy =====
  const [creationStep, setCreationStep] = useState<
    'idle' | 'uploading' | 'drafting' | 'previewing' | 'finalizing' | 'completed' | 'error'
  >('idle');

  const [buyAmount, setBuyAmount] = useState<number>(0);
  const walletBalance = 0;

  // preview state removed — Preview Buy button removed
  // showPurchasePopup removed — BUY directly calls runFinalize

  const [showPreventNavigationModal, setShowPreventNavigationModal] = useState(false);

  // ===== Liquidity Settings (gear) =====
  const [showLiquidity, setShowLiquidity] = useState(false);
  const [liqMode, setLiqMode] = useState<'PSOL' | 'SOL'>('PSOL');
  const creatorReward = { sol: 2, points: 69 };

  // ===== ✅ Connect wallet modal =====
  const [showConnectWalletModal, setShowConnectWalletModal] = useState(false);
  const openConnectWalletModal = useCallback(() => setShowConnectWalletModal(true), []);
  const closeConnectWalletModal = useCallback(() => setShowConnectWalletModal(false), []);

  // ===== ✅ Idempotency keys (per user action)
  // NOTE:
  // - upload: new key every time user chooses/drops a NEW file.
  // - draft: new key when user changes draft fields OR restarts flow.
  // - finalize: new key when draft changes OR restarts flow.
  const uploadKeyRef = useRef<string | null>(null);
  const draftKeyRef = useRef<string | null>(null);
  const finalizeKeyRef = useRef<string | null>(null);

  const resetCreateFlowIdempotency = useCallback(() => {
    uploadKeyRef.current = null;
    draftKeyRef.current = null;
    finalizeKeyRef.current = null;
  }, []);

  // action guard
  const requireWalletOrShowModal = useCallback(() => {
    if (connected) return true;
    setShowConnectWalletModal(true);
    return false;
  }, [connected]);

  // ===== derived =====
  const symbolAuto = useMemo(() => makeSymbol(tokenName), [tokenName]);
  const symbolFinal = useMemo(() => normalizeSymbol(tokenSymbol || symbolAuto), [tokenSymbol, symbolAuto]);

  const canGoNextStep1 = useMemo(() => {
    const symbolOk = SYMBOL_RE.test(symbolFinal);
    return Boolean(tokenName.trim()) && symbolOk && Boolean(tokenImageUrl);
  }, [tokenName, symbolFinal, tokenImageUrl]);

  const isBusy = useMemo(() => creationStep !== 'idle', [creationStep]);

  const resetDraftAndGoStep1 = useCallback(
    (msg?: string) => {
      setDraft(null);
      setStep(1);
      resetCreateFlowIdempotency();
      if (msg) toast.error(msg);
    },
    [resetCreateFlowIdempotency]
  );

  // ===== open file picker (guarded) =====
  const openFilePicker = useCallback(() => {
    if (!requireWalletOrShowModal()) return;
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, [requireWalletOrShowModal]);

  // ===== Upload image =====
  // Strategy: try BE /token/upload-image first (base64 without prefix).
  //           If BE fails, fallback to local /api/upload-to-ipfs (multipart FormData).
  const uploadImageToBE = useCallback(
    async (file: File) => {
      if (!requireWalletOrShowModal()) return null;

      if (file.size > MAX_FILE_SIZE) {
        toast.error('File size exceeds 5MB limit. Please choose a smaller file.');
        return null;
      }

      setIsUploading(true);
      setCreationStep('uploading');

      try {
        // Compress if needed (> 800KB → JPEG at lower quality)
        const compressed = await compressImage(file);
        if (compressed !== file) {
          toast(`Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`);
        }

        let imageUrl: string | null = null;
        const dataUrl = await readFileAsDataURL(compressed);
        // raw base64 (no data:... prefix)
        const base64Only = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

        // --- Attempt 1: BE /token/upload-image with full data URL ---
        try {
          if (!uploadKeyRef.current) uploadKeyRef.current = newIdempotencyKey('upload-image');
          const res = await uploadTokenImage(
            { image: dataUrl },
            { idempotencyKey: uploadKeyRef.current ?? undefined }
          );
          if (res?.imageUrl) imageUrl = res.imageUrl;
        } catch (err1: any) {
          const s1 = err1?.response?.status;
          const d1 = err1?.response?.data;
          console.warn('[CreateToken] BE upload (dataUrl) failed:', s1, d1);
          toast(`[DEBUG] BE dataUrl: ${s1 || 'no-status'} — ${d1?.error || d1?.message || err1?.message || 'unknown'}`, { duration: 8000 });
          uploadKeyRef.current = null;
        }

        // --- Attempt 2: BE with raw base64 (no prefix) ---
        if (!imageUrl) {
          try {
            uploadKeyRef.current = newIdempotencyKey('upload-image');
            const res = await uploadTokenImage(
              { image: base64Only },
              { idempotencyKey: uploadKeyRef.current ?? undefined }
            );
            if (res?.imageUrl) imageUrl = res.imageUrl;
          } catch (err2: any) {
            const s2 = err2?.response?.status;
            const d2 = err2?.response?.data;
            console.warn('[CreateToken] BE upload (base64) failed:', s2, d2);
            toast(`[DEBUG] BE base64: ${s2 || 'no-status'} — ${d2?.error || d2?.message || err2?.message || 'unknown'}`, { duration: 8000 });
            uploadKeyRef.current = null;
          }
        }

        // --- Attempt 3: local /api/upload-to-ipfs (FormData) ---
        if (!imageUrl) {
          try {
            const formData = new FormData();
            formData.append('file', compressed);

            const localRes = await fetch('/api/upload-to-ipfs', {
              method: 'POST',
              body: formData,
            });

            if (!localRes.ok) {
              const errData = await localRes.json().catch(() => ({}));
              console.warn('[CreateToken] Local upload failed:', localRes.status, errData);
              toast(`[DEBUG] Local: ${localRes.status} — ${errData?.error || 'unknown'}`, { duration: 8000 });
            } else {
              const localData = await localRes.json();
              imageUrl = localData?.url || null;
            }
          } catch (err3: any) {
            console.warn('[CreateToken] Local upload error:', err3?.message);
          }
        }

        if (imageUrl) {
          setTokenImageUrl(imageUrl);
          toast.success('Image uploaded successfully!');
          return imageUrl;
        }

        throw new Error('No image URL returned');
      } catch (e: any) {
        console.error('[CreateToken] Upload failed:', e?.response?.status, e?.response?.data, e?.code, e?.message);
        uploadKeyRef.current = null;

        const status = e?.response?.status;
        const beMsg = e?.response?.data?.message || e?.response?.data?.error || '';

        let msg = 'Failed to upload image.';
        if (e?.code === 'ECONNABORTED' || e?.message?.includes('timeout')) {
          msg = 'Upload timed out. Please try a smaller image or check your connection.';
        } else if (status === 400) {
          msg = beMsg || 'Invalid image. Please use PNG, JPG, GIF or WebP under 1MB.';
        } else if (status === 401) {
          msg = 'Wallet authentication required. Please reconnect your wallet.';
          openConnectWalletModal();
        } else if (status === 500) {
          msg = beMsg || 'Upload failed on server. Please try again.';
        } else if (status === 503) {
          msg = 'Image storage service is temporarily unavailable. Please try again later.';
        } else if (beMsg) {
          msg = beMsg;
        } else if (e?.message) {
          msg = e.message;
        }

        toast.error(msg);
        return null;
      } finally {
        setIsUploading(false);
        setCreationStep('idle');
      }
    },
    [requireWalletOrShowModal, openConnectWalletModal]
  );

  const onImagePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;

      // New file => new idempotency key
      uploadKeyRef.current = newIdempotencyKey('upload-image');

      // Changing image should force new draft/finalize keys too
      draftKeyRef.current = null;
      finalizeKeyRef.current = null;

      await uploadImageToBE(f);
    },
    [uploadImageToBE]
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!requireWalletOrShowModal()) return;

      const f = e.dataTransfer.files?.[0];
      if (!f) return;

      // New file => new idempotency key
      uploadKeyRef.current = newIdempotencyKey('upload-image');

      // Changing image should force new draft/finalize keys too
      draftKeyRef.current = null;
      finalizeKeyRef.current = null;

      await uploadImageToBE(f);
    },
    [uploadImageToBE, requireWalletOrShowModal]
  );

  // ===== Create Draft: /token/create/draft =====
  const handleCreateDraftAndNext = useCallback(async () => {
    if (!requireWalletOrShowModal()) return;

    if (!tokenImageUrl) {
      toast.error('Please upload token image.');
      return;
    }

    let symbolSafe = '';
    try {
      symbolSafe = validateSymbolOrThrow(symbolFinal);
    } catch (err: any) {
      toast.error(err?.message || 'Invalid symbol');
      return;
    }

    setCreationStep('drafting');

    try {
      if (!draftKeyRef.current) draftKeyRef.current = newIdempotencyKey('create-draft');

      const res = await createTokenDraft(
        {
          name: tokenName.trim(),
          symbol: symbolSafe,
          description: tokenDescription || '',
          imageUrl: tokenImageUrl,
          isNSFW: Boolean(isNSFW),
          socials: {
            ...(twitter ? { twitter } : {}),
            ...(telegram ? { telegram } : {}),
            ...(website ? { website } : {}),
            ...(discord ? { discord } : {}),
            ...(youtube ? { youtube } : {}),
          },
        },
        { idempotencyKey: draftKeyRef.current ?? undefined, }
      );

      setDraft(res);
      toast.success('Draft created!');
      setStep(2);
    } catch (e: any) {
      console.error('[CreateToken] Draft failed:', e?.response?.status, e?.response?.data, e?.message);
      // Reset key so user can retry with a fresh idempotency key
      draftKeyRef.current = null;
      finalizeKeyRef.current = null;
      const status = e?.response?.status;
      if (status === 401) openConnectWalletModal();
      else toast.error(safeErrMsg(e, 'Create draft failed.'));
    } finally {
      setCreationStep('idle');
    }
  }, [
    requireWalletOrShowModal,
    tokenImageUrl,
    symbolFinal,
    tokenName,
    tokenDescription,
    isNSFW,
    twitter,
    telegram,
    website,
    discord,
    youtube,
    openConnectWalletModal,
  ]);

  // handlePreviewBuy removed — Preview Buy button removed, BUY directly calls runFinalize

  // ===== UI validate before finalize =====
  const validateFinalizeInputs = useCallback((): string | null => {
    if (!draft?.draftId) return 'Missing draftId. Please go back and create draft again.';
    if (!Number.isFinite(decimals) || decimals < 0 || decimals > 18) return 'Decimals must be 0..18';
    if (!isNonNegInt(basePriceLamports)) return 'Base price must be >= 0';
    if (!isNonNegInt(slopeLamports)) return 'Slope must be >= 0';
    if (!isNumericString(bondingCurveSupply)) return 'Bonding curve supply must be numeric string';
    if (!isNumericString(graduateTargetLamports)) return 'Graduate target must be numeric string';
    if (!isNonNegInt(curveType)) return 'Invalid curve type';
    return null;
  }, [draft?.draftId, decimals, basePriceLamports, slopeLamports, bondingCurveSupply, graduateTargetLamports]);

  // ===== Finalize: /token/create/finalize =====
  // Flow:
  //   1) Call finalizeTokenCreation (initialBuySol=0) → creates token on-chain
  //   2) If user wants to buy → call buyToken() with the new tokenAddress
  //      → returns txBase64 → wallet signs → submitSignature → poll status
  //      (same flow as normal trading buy in useSwapTrading)
  const runFinalize = useCallback(
    async (initialBuySol: number) => {
      if (!requireWalletOrShowModal()) return;

      const err = validateFinalizeInputs();
      if (err) {
        toast.error(err);
        return;
      }

      // If buying, ensure wallet can sign
      if (initialBuySol > 0 && (!wallet.publicKey || !wallet.sendTransaction)) {
        toast.error('Wallet does not support signing. Please reconnect.');
        return;
      }

      setCreationStep('finalizing');
      try {
        if (!finalizeKeyRef.current) {
          const base = draft?.draftId ? `finalize-${draft.draftId}` : 'finalize';
          finalizeKeyRef.current = newIdempotencyKey(base);
        }

        // Step 1: Create token (no buy yet)
        const res = await finalizeTokenCreation(
          {
            draftId: draft!.draftId,
            initialBuySol: 0, // Always 0 — buy separately below
            decimals: Math.trunc(decimals),
            curveType,
            basePriceLamports: Math.trunc(Math.max(0, Number(basePriceLamports) || 0)),
            slopeLamports: Math.trunc(Math.max(0, Number(slopeLamports) || 0)),
            bondingCurveSupply: String(bondingCurveSupply).trim(),
            graduateTargetLamports: String(graduateTargetLamports).trim(),
          },
          { idempotencyKey: finalizeKeyRef.current ?? undefined }
        );

        toast.success('Token created!');

        // Step 2: If user wants initial buy → call /trading/buy (like normal swap)
        if (initialBuySol > 0 && res.tokenAddress) {
          toast('Preparing buy transaction...');

          // Preview to convert SOL → token amount (BE requires amountInToken)
          const pv = await estimateTokensFromSol({
            tokenAddr: res.tokenAddress,
            solIn: initialBuySol,
          });
          const amountInToken = Math.floor(pv.tokenOutHuman).toFixed(0);
          if (!amountInToken || amountInToken === '0') throw new Error('Amount too small');

          const buyIdk = newIdempotencyKey('initial-buy');

          const buyRes = await buyToken(
            {
              tokenAddress: res.tokenAddress,
              amountInToken,
              slippageBps: 500, // 5% default slippage for initial buy
            },
            { idempotencyKey: buyIdk }
          );

          if (!buyRes?.txBase64) {
            throw new Error('No transaction returned from buy API');
          }

          // Deserialize & user signs
          const rawTx = Buffer.from(String(buyRes.txBase64), 'base64');
          const tx = VersionedTransaction.deserialize(rawTx);

          toast('Please sign the transaction in your wallet...');
          const txSignature = await wallet.sendTransaction!(tx, connection, {
            preflightCommitment: 'processed',
          });

          // Extract tracking endpoints
          const tracking: any = buyRes.tracking || {};
          const submitEp = normalizeTrackingEndpoint(
            tracking.submitSignatureEndpoint || tracking.submitSignatureBySignatureEndpoint || ''
          );
          const statusEp = normalizeTrackingEndpoint(
            tracking.statusEndpoint || tracking.statusBySignatureEndpoint || ''
          );

          // Submit signature to BE
          const txId = String(buyRes.transactionId ?? '').trim();
          if (submitEp && txId) {
            toast('Submitting signature...');
            await submitSignature(submitEp, { id: txId, txSignature });
          }

          // Confirm on-chain (fire and forget)
          connection.confirmTransaction(txSignature, 'processed').catch(() => {});

          // Poll status
          if (statusEp) {
            toast('Confirming buy...');
            let finalStatus = '';
            for (let i = 0; i < 12; i++) {
              await new Promise((r) => setTimeout(r, 1000));
              try {
                const st = await getTradingStatus(statusEp);
                finalStatus = String((st as any)?.status ?? '').toUpperCase();
                if (finalStatus === 'CONFIRMED' || finalStatus === 'FAILED') break;
              } catch { /* retry */ }
            }

            if (finalStatus === 'FAILED') {
              toast.error('Initial buy failed on-chain. Token was created but buy did not complete.');
            } else {
              toast.success('Token created & initial buy confirmed!');
            }
          } else {
            toast.success('Token created & buy transaction submitted!');
          }
        } else {
          toast.success('Token created successfully!');
        }

        setCreationStep('completed');
        resetCreateFlowIdempotency();

        // Small delay to let BE index the new token data (chart, trades)
        await new Promise((r) => setTimeout(r, 2000));
        router.push(`/token/${res.tokenAddress}`);
      } catch (e: any) {
        console.error('[CreateToken] Finalize/Buy failed:', e?.response?.status, e?.response?.data, e?.message);
        // Reset finalize key so user can retry
        finalizeKeyRef.current = null;
        const status = e?.response?.status;
        const msg = e?.message || '';

        if (status === 401) openConnectWalletModal();
        else if (status === 403) toast.error('Forbidden: you can only finalize your own draft.');
        else if (status === 404) toast.error('Draft not found.');
        else if (isExpiredDraftStatus(status)) resetDraftAndGoStep1('Draft expired. Please create again.');
        else if (/User rejected/i.test(msg)) toast.error('Transaction was cancelled.');
        else toast.error(safeErrMsg(e, 'Finalize failed.'));

        setCreationStep('idle');
      }
    },
    [
      requireWalletOrShowModal,
      validateFinalizeInputs,
      wallet,
      connection,
      draft,
      decimals,
      curveType,
      basePriceLamports,
      slopeLamports,
      bondingCurveSupply,
      graduateTargetLamports,
      router,
      resetDraftAndGoStep1,
      openConnectWalletModal,
      resetCreateFlowIdempotency,
    ]
  );

  // BUY now directly calls runFinalize — no confirmation popup
  const handleBuy = async () => {
    if (buyAmount <= 0) return;
    if (!requireWalletOrShowModal()) return;
    await runFinalize(buyAmount);
  };

  const handleCreateWithoutBuy = async () => {
    await runFinalize(0);
  };

  // ===== Prevent navigation while finalizing =====
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (creationStep === 'finalizing') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [creationStep]);

  useEffect(() => {
    setShowPreventNavigationModal(creationStep === 'finalizing');
  }, [creationStep]);

  // ===== If user lands on Step2/3 without draft, auto bring back =====
  useEffect(() => {
    if ((step === 2 || step === 3) && !draft?.draftId) {
      setStep(1);
    }
  }, [step, draft?.draftId]);

  // ✅ If user connected, close modal
  useEffect(() => {
    if (connected && showConnectWalletModal) setShowConnectWalletModal(false);
  }, [connected, showConnectWalletModal]);

  // ✅ optional: if user goes back to step 1 manually, allow re-upload/draft cleanly
  useEffect(() => {
    if (step === 1) {
      // Do NOT wipe image automatically; only reset keys for draft/finalize so user can edit then re-create.
      draftKeyRef.current = null;
      finalizeKeyRef.current = null;
    }
  }, [step]);

  return (
    <Layout>
      <SEO
        title="Create Your Own Token - PumpFun Clone"
        description="Launch a coin that is instantly tradable — fair launch"
        image="/seo/create.jpg"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-orange mb-6 text-center">
          {step === 1 && 'Create New Token'}
          {step === 2 && 'Advance Info'}
          {step === 3 && 'Buy'}
        </h1>

        {/* Step Progress Indicator */}
        <StepIndicator current={step} />

        {step === 1 && (
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              className="btn-secondary flex items-center px-3 py-1.5 rounded-full text-xs sm:text-sm"
              title="Deployment Cost Info"
            >
              <InformationCircleIcon className="h-4 w-4 mr-1" />
              Deployment Cost Info
            </button>

            <button
              type="button"
              onClick={() => setShowLiquidity(true)}
              className="relative inline-flex items-center justify-center h-9 w-9 rounded-full
                         border-thin bg-[var(--card2)] text-[var(--foreground)]/85
                         hover:bg-[var(--card-hover)] hover:ring-2 hover:ring-[var(--primary)]/30
                         transition"
              title="Liquidity Settings"
            >
              <Cog6ToothIcon className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* ==================== STEP 1 – BASIC ==================== */}
        {step === 1 && (
          <div className="space-y-6 card gradient-border p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-1">Token Name</label>
                <input
                  value={tokenName}
                  onChange={(e) => {
                    setTokenName(e.target.value);
                    draftKeyRef.current = null;
                    finalizeKeyRef.current = null;
                  }}
                  className="w-full py-2 px-3 bg-[var(--card2)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Enter token name"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-1">Token Symbol</label>
                <input
                  value={tokenSymbol}
                  onChange={(e) => {
                    setTokenSymbol(normalizeSymbol(e.target.value));
                    draftKeyRef.current = null;
                    finalizeKeyRef.current = null;
                  }}
                  className="w-full py-2 px-3 bg-[var(--card2)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="A-Z0-9, 2-10 chars"
                />
                <div className="text-[10px] text-gray-500 mt-1">
                  Auto: <span className="text-gray-300">{symbolAuto}</span> • Final:{' '}
                  <span className="text-gray-300">{symbolFinal || '-'}</span>
                </div>
                {!SYMBOL_RE.test(symbolFinal) && symbolFinal.length > 0 && (
                  <div className="text-[10px] text-red-400 mt-1">
                    Symbol must be uppercase alphanumeric, {SYMBOL_MIN}-{SYMBOL_MAX} characters
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-1">Token Description</label>
              <textarea
                value={tokenDescription}
                onChange={(e) => {
                  setTokenDescription(e.target.value);
                  draftKeyRef.current = null;
                  finalizeKeyRef.current = null;
                }}
                rows={4}
                className="w-full py-2 px-3 bg-[var(--card2)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Describe your token"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isNsfw"
                type="checkbox"
                checked={isNSFW}
                onChange={(e) => {
                  setIsNSFW(e.target.checked);
                  draftKeyRef.current = null;
                  finalizeKeyRef.current = null;
                }}
              />
              <label htmlFor="isNsfw" className="text-xs text-gray-300">
                Mark as NSFW
              </label>
            </div>

            {/* Token Image */}
            <div>
              <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-2">Token Image</label>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp"
                className="hidden"
                onChange={onImagePicked}
                disabled={isUploading}
              />

              <div
                className="mt-1 flex justify-center items-center px-4 py-8 border-thin border-dashed rounded-md hover:border-[var(--primary)] transition bg-[var(--card2)]"
                onDragOver={onDragOver}
                onDrop={onDrop}
              >
                <div className="space-y-2 text-center">
                  <div className="flex flex-col items-center">
                    <CloudArrowUpIcon className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                    <div className="flex flex-col sm:flex-row text-[9px] sm:text-sm text-gray-400 items-center">
                      <button
                        type="button"
                        onClick={openFilePicker}
                        disabled={isUploading}
                        className="cursor-pointer btn-secondary rounded-md font-medium
                                   text-[var(--primary)] hover:text-[var(--primary-hover)]
                                   transition px-3 py-2 mb-2 sm:mb-0 sm:mr-2"
                      >
                        Upload a file
                      </button>
                      <p>or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 1MB</p>
                  </div>
                </div>
              </div>

              {isUploading && <p className="text-sm text-gray-400 mt-2">Uploading image...</p>}

              {tokenImageUrl && (
                <div className="mt-4 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tokenImageUrl}
                    alt="Token preview"
                    className="h-24 w-24 object-cover rounded-full mx-auto border-2 border-[var(--primary)]"
                  />
                </div>
              )}
            </div>

            {/* Social */}
            <div className="border-thin rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setIsSocialExpanded((v) => !v)}
                className="w-full flex justify-between items-center p-3 bg-[var(--card2)] text-white hover:bg-[var(--card-hover)] transition-colors"
              >
                <span className="font-medium text-[10px] sm:text-xs">Social Media Links (Optional)</span>
                {isSocialExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
              </button>

              {isSocialExpanded && (
                <div className="p-4 bg-[var(--card)] grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] sm:text-xs">
                  {[
                    { id: 'website', label: 'Website', value: website, setter: setWebsite },
                    { id: 'telegram', label: 'Telegram', value: telegram, setter: setTelegram },
                    { id: 'discord', label: 'Discord', value: discord, setter: setDiscord },
                    { id: 'twitter', label: 'Twitter', value: twitter, setter: setTwitter },
                    { id: 'youtube', label: 'YouTube', value: youtube, setter: setYoutube },
                  ].map((i) => (
                    <div key={i.id}>
                      <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-1">{i.label}</label>
                      <input
                        value={i.value}
                        onChange={(e) => {
                          i.setter(e.target.value);
                          draftKeyRef.current = null;
                          finalizeKeyRef.current = null;
                        }}
                        className="w-full py-2 px-3 bg-[var(--card2)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        placeholder="optional"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex">
              <button
                className="btn btn-primary w-full py-3 rounded-md disabled:opacity-50"
                disabled={!canGoNextStep1 || creationStep === 'drafting' || isBusy}
                onClick={handleCreateDraftAndNext}
              >
                {creationStep === 'drafting' ? 'Creating Draft...' : 'Next'}
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 2 – ADVANCE INFO ==================== */}
        {/*
         * NOTE: Curve Settings UI hidden — BE will auto-configure curve settings.
         * The curve values (decimals, curveType, basePriceLamports, slopeLamports,
         * bondingCurveSupply, graduateTargetLamports) are still sent in the finalize
         * API call with their default values to maintain backward compatibility.
         *
         * >>> When BE fully removes curve params from API, delete:
         *   - State variables: decimals, curveType, basePriceLamports, slopeLamports,
         *     bondingCurveSupply, graduateTargetLamports (lines ~118-124)
         *   - validateFinalizeInputs() curve checks
         *   - Curve fields in runFinalize() payload
         *   - FinalizeTokenRequest type curve fields in api.ts
         */}
        {step === 2 && (
          <div className="space-y-6 card gradient-border p-4 sm:p-6">
            <div className="rounded-lg border-thin p-6 bg-[var(--card2)] text-center">
              <div className="text-sm font-semibold text-white mb-2">Advance Info</div>
              <p className="text-xs text-gray-400">
                Additional settings will be available here soon. Click Next to continue.
              </p>

              {draft?.expiresAt && (
                <div className="mt-4 text-xs text-gray-400">
                  Draft expires at: <span className="text-gray-200">{draft.expiresAt}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              <button className="btn-secondary px-8 py-3 min-w-[160px] rounded-md" disabled={isBusy} onClick={() => setStep(1)}>
                Back
              </button>

              <button
                className="btn btn-primary px-8 py-3 min-w-[180px] rounded-md"
                disabled={isBusy || !draft?.draftId}
                onClick={() => setStep(3)}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3 – BUY ==================== */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-left">
              <div className="text-sm font-semibold text-[var(--foreground)]/90">Tip:</div>
              <div className="text-[14px] text-[var(--foreground)]/75">Optional: Make an initial buy to gain the most from your token</div>
            </div>

            <div className="rounded-3xl bg-[var(--card)] border-thin p-6 shadow-lg">
              <div className="text-center text-4xl sm:text-6xl font-extrabold tracking-wide select-none text-[var(--foreground)]/25">
                {buyAmount.toFixed(2)}
              </div>

              <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[0.1, 0.5, 1].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBuyAmount(v)}
                    className="rounded-xl bg-[var(--card2)] text-[var(--foreground)]/90 py-3 font-semibold border-thin hover:bg-[var(--card-hover)] transition"
                  >
                    {v}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setBuyAmount(Number(walletBalance) || 0)}
                  className="rounded-xl bg-[var(--card2)] text-[var(--foreground)]/90 py-3 font-semibold border-thin hover:bg-[var(--card-hover)] transition"
                >
                  MAX
                </button>
              </div>

              {/* Preview Buy button removed — BUY directly creates + buys */}
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={!draft?.draftId || buyAmount <= 0 || creationStep === 'finalizing' || isBusy}
                  className="btn btn-primary w-full py-3 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creationStep === 'finalizing' ? 'Creating & Buying...' : 'BUY'}
                </button>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => setStep(2)} disabled={isBusy} className="btn-secondary w-1/2">
                Back
              </button>

              <button
                type="button"
                onClick={handleCreateWithoutBuy}
                disabled={!draft?.draftId || creationStep === 'finalizing' || isBusy}
                className="btn btn-primary w-1/2 disabled:opacity-50"
              >
                {creationStep === 'finalizing' ? 'Finalizing...' : 'Create Without Buying'}
              </button>
            </div>
          </div>
        )}

        {/* PurchaseConfirmationPopup removed — BUY directly calls runFinalize */}

        {/* ✅ CONNECT WALLET MODAL (MATCH STYLE + CENTERED SELECT WALLET) */}
        {showConnectWalletModal && (
          <Modal isOpen={showConnectWalletModal} onClose={closeConnectWalletModal}>
            <div
              className="
                w-[92vw] max-w-[520px]
                rounded-3xl
                bg-[#0f1420]
                border border-white/10
                shadow-2xl
                overflow-hidden
              "
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-4">
                <button
                  type="button"
                  onClick={closeConnectWalletModal}
                  className="h-9 w-9 rounded-full bg-white/5 border border-white/10
                             flex items-center justify-center hover:bg-white/10 transition"
                  aria-label="Back"
                  title="Back"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                    <path
                      d="M15 18l-6-6 6-6"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={closeConnectWalletModal}
                  className="h-9 w-9 rounded-full bg-white/5 border border-white/10
                             flex items-center justify-center hover:bg-white/10 transition"
                  aria-label="Close"
                  title="Close"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-90">
                    <path
                      d="M18 6L6 18M6 6l12 12"
                      stroke="rgba(255,255,255,0.9)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="px-6 pb-7 pt-3">
                <div className="flex justify-center mt-3">
                  <div className="h-16 w-16 rounded-full border-4 border-red-500/80 flex items-center justify-center">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                      <path d="M12 9v4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 17h.01" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      <path
                        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                        stroke="#ef4444"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.9"
                      />
                    </svg>
                  </div>
                </div>

                <div className="mt-5 text-center">
                  <div className="text-lg sm:text-xl font-semibold text-white">Connect your wallet</div>
                  <div className="mt-2 text-sm text-white/60">
                    Please connect your wallet to upload an image and continue creating your token.
                  </div>
                </div>

                {/* Force wallet button to be centered + full width + label centered */}
                <div className="mt-5 flex justify-center">
                  <div
                    className="
                      w-full max-w-[360px]
                      flex justify-center
                      [&_.wallet-adapter-button]:w-full
                      [&_.wallet-adapter-button]:h-12
                      [&_.wallet-adapter-button]:rounded-2xl
                      [&_.wallet-adapter-button]:px-5
                      [&_.wallet-adapter-button]:font-semibold
                      [&_.wallet-adapter-button]:transition
                      [&_.wallet-adapter-button]:bg-[var(--primary)]
                      [&_.wallet-adapter-button]:text-black
                      hover:[&_.wallet-adapter-button]:bg-[var(--primary-hover)]
                      [&_.wallet-adapter-button]:border-0
                      [&_.wallet-adapter-button]:justify-center
                      [&_.wallet-adapter-button]:text-center
                      [&_.wallet-adapter-button]:gap-2
                      [&_.wallet-adapter-button]:whitespace-nowrap
                    "
                  >
                    <WalletMultiButton />
                  </div>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {showLiquidity && (
          <Modal isOpen={showLiquidity} onClose={() => setShowLiquidity(false)}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold mt-5 text-[var(--foreground)]">Liquidity</h3>
                </div>

                <div className="flex items-center bg-[var(--card)] border-thin rounded-full p-1">
                  {(['PSOL', 'SOL'] as const).map((key) => {
                    const active = liqMode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setLiqMode(key)}
                        className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition ${
                          active
                            ? 'bg-[var(--primary)] text-black'
                            : 'text-[var(--foreground)]/85 hover:bg-[var(--card2)]'
                        }`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="mt-4 text-sm text-[var(--foreground)]/75">
                pSOL works its magic for everyone — launch with SOL only if you’re strong enough!
              </p>

              <div className="mt-6 rounded-2xl bg-[var(--card2)] border-thin px-4 py-3 flex items-center justify-between">
                <div className="text-sm font-medium text-[var(--foreground)]/85">
                  <span className="opacity-80 mr-1">Creator Reward:</span>
                  <span className="font-bold">{creatorReward.sol} SOL</span> + {creatorReward.points} points
                </div>
                <button onClick={() => setShowLiquidity(false)} className="btn-secondary px-4 py-2 rounded-full">
                  Done
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showPreventNavigationModal && (
          <Modal isOpen={showPreventNavigationModal} onClose={() => {}}>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-100 mb-4">Please Wait</h3>
              <p className="text-sm text-gray-500">Your token is being finalized. Please do not close or navigate away.</p>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default CreateToken;
