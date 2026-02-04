// src/pages/create.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';

import {
  uploadTokenImage,
  createTokenDraft,
  previewInitialBuy,
  finalizeTokenCreation,
  type CreateTokenDraftResponse,
  type PreviewInitialBuyResponse,
} from '@/utils/api';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import PurchaseConfirmationPopup from '@/components/notifications/PurchaseConfirmationPopup';
import Modal from '@/components/notifications/Modal';

// optional wallet adapter (kept)
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

type Step = 1 | 2 | 3;

const MAX_FILE_SIZE = 1024 * 1024; // 1MB

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
  // đảm bảo tối thiểu 2 ký tự
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

function safeErrMsg(e: any, fallback: string) {
  return e?.response?.data?.message || e?.response?.data?.error || e?.message || fallback;
}

function isExpiredDraftStatus(status?: number) {
  return status === 410;
}

const isNonNegInt = (v: any) => Number.isFinite(Number(v)) && Number(v) >= 0;
const isNumericString = (v: any) => /^\d+$/.test(String(v ?? '').trim());

const CreateToken: React.FC = () => {
  const router = useRouter();

  // wallet optional
  const { connected } = useWallet();
  const showConnectHint = !connected;

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
  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  // ===== Step 2: Curve params =====
  const [decimals, setDecimals] = useState<number>(6);

  // ✅ BE wants curveType as number
  // Convention: 0 = linear
  const [curveType] = useState<number>(0);

  // defaults (tune as needed)
  const [basePriceLamports, setBasePriceLamports] = useState<number>(1000);
  const [slopeLamports, setSlopeLamports] = useState<number>(1);
  const [bondingCurveSupply, setBondingCurveSupply] = useState<string>('1000000000000000');
  const [graduateTargetLamports, setGraduateTargetLamports] = useState<string>('69000000000');

  // ===== Step 3: Finalize / Buy =====
  const [creationStep, setCreationStep] = useState<
    'idle' | 'uploading' | 'drafting' | 'previewing' | 'finalizing' | 'completed' | 'error'
  >('idle');

  const [buyAmount, setBuyAmount] = useState<number>(0);
  const walletBalance = 0;

  const [preview, setPreview] = useState<PreviewInitialBuyResponse | null>(null);

  const [showPurchasePopup, setShowPurchasePopup] = useState(false);
  const [showPreventNavigationModal, setShowPreventNavigationModal] = useState(false);

  // ===== Liquidity Settings (gear) =====
  const [showLiquidity, setShowLiquidity] = useState(false);
  const [liqMode, setLiqMode] = useState<'PSOL' | 'SOL'>('PSOL');
  const creatorReward = { sol: 2, points: 69 };

  // ===== derived =====
  const symbolAuto = useMemo(() => makeSymbol(tokenName), [tokenName]);
  const symbolFinal = useMemo(() => normalizeSymbol(tokenSymbol || symbolAuto), [tokenSymbol, symbolAuto]);

  const canGoNextStep1 = useMemo(() => {
    // ✅ phải hợp lệ chuẩn SAFE (2-10)
    const symbolOk = SYMBOL_RE.test(symbolFinal);
    return Boolean(tokenName.trim()) && symbolOk && Boolean(tokenImageUrl);
  }, [tokenName, symbolFinal, tokenImageUrl]);

  const isBusy = useMemo(() => creationStep !== 'idle', [creationStep]);

  const resetDraftAndGoStep1 = useCallback((msg?: string) => {
    setDraft(null);
    setPreview(null);
    setStep(1);
    if (msg) toast.error(msg);
  }, []);

  // ===== Upload to BE: /token/upload-image =====
  const uploadImageToBE = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 1MB limit. Please choose a smaller file.');
      return null;
    }

    setIsUploading(true);
    setCreationStep('uploading');

    try {
      const dataUrl = await readFileAsDataURL(file);
      const res = await uploadTokenImage({ image: dataUrl });

      if (res?.imageUrl) {
        setTokenImageUrl(res.imageUrl);
        toast.success('Image uploaded successfully!');
        return res.imageUrl;
      }

      throw new Error('No imageUrl returned');
    } catch (e: any) {
      toast.error(safeErrMsg(e, 'Failed to upload image.'));
      return null;
    } finally {
      setIsUploading(false);
      setCreationStep('idle');
    }
  }, []);

  const onImagePicked = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
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
      const f = e.dataTransfer.files?.[0];
      if (!f) return;
      await uploadImageToBE(f);
    },
    [uploadImageToBE]
  );

  // ===== Create Draft: /token/create/draft =====
  const handleCreateDraftAndNext = useCallback(async () => {
    if (!tokenImageUrl) {
      toast.error('Please upload token image.');
      return;
    }

    let symbolSafe = '';
    try {
      symbolSafe = validateSymbolOrThrow(symbolFinal); // ✅ 2-10
    } catch (err: any) {
      toast.error(err?.message || 'Invalid symbol');
      return;
    }

    setCreationStep('drafting');

    try {
      const res = await createTokenDraft({
        name: tokenName.trim(),
        symbol: symbolSafe, // ✅ always valid
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
      });

      setDraft(res);
      setPreview(null);
      toast.success('Draft created!');
      setStep(2);
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401) toast.error('Unauthorized. Please login again.');
      else toast.error(safeErrMsg(e, 'Create draft failed.'));
    } finally {
      setCreationStep('idle');
    }
  }, [
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
  ]);

  // ===== Preview buy: /token/create/preview-buy =====
  const handlePreviewBuy = useCallback(async () => {
    if (!draft?.draftId) {
      toast.error('Missing draftId. Please go back and create draft again.');
      return;
    }
    if (buyAmount <= 0) {
      toast.error('Enter buy amount > 0');
      return;
    }

    setCreationStep('previewing');
    try {
      const res = await previewInitialBuy({
        draftId: draft.draftId,
        amountSol: buyAmount,
      });
      setPreview(res);
      toast.success('Preview calculated');
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 404) toast.error('Draft not found.');
      else if (isExpiredDraftStatus(status)) resetDraftAndGoStep1('Draft expired. Please create again.');
      else toast.error(safeErrMsg(e, 'Preview buy failed.'));
    } finally {
      setCreationStep('idle');
    }
  }, [draft?.draftId, buyAmount, resetDraftAndGoStep1]);

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
  }, [draft?.draftId, decimals, basePriceLamports, slopeLamports, bondingCurveSupply, graduateTargetLamports, curveType]);

  // ===== Finalize: /token/create/finalize =====
  const runFinalize = useCallback(
    async (initialBuySol: number) => {
      const err = validateFinalizeInputs();
      if (err) {
        toast.error(err);
        return;
      }

      setCreationStep('finalizing');
      try {
        const res = await finalizeTokenCreation({
          draftId: draft!.draftId,
          initialBuySol: Number.isFinite(initialBuySol) ? Math.max(0, initialBuySol) : 0,
          decimals: Math.trunc(decimals),
          curveType, // ✅ number (0 = linear)
          basePriceLamports: Math.trunc(Math.max(0, Number(basePriceLamports) || 0)),
          slopeLamports: Math.trunc(Math.max(0, Number(slopeLamports) || 0)),
          bondingCurveSupply: String(bondingCurveSupply).trim(),
          graduateTargetLamports: String(graduateTargetLamports).trim(),
        });

        setCreationStep('completed');
        toast.success('Token created successfully!');
        router.push(`/token/${res.tokenAddress}`);
      } catch (e: any) {
        const status = e?.response?.status;

        if (status === 401) toast.error('Unauthorized. Please login again.');
        else if (status === 403) toast.error('Forbidden: you can only finalize your own draft.');
        else if (status === 404) toast.error('Draft not found.');
        else if (isExpiredDraftStatus(status)) resetDraftAndGoStep1('Draft expired. Please create again.');
        else toast.error(safeErrMsg(e, 'Finalize failed.'));

        setCreationStep('idle');
      }
    },
    [
      draft,
      decimals,
      curveType,
      basePriceLamports,
      slopeLamports,
      bondingCurveSupply,
      graduateTargetLamports,
      router,
      resetDraftAndGoStep1,
      validateFinalizeInputs,
    ]
  );

  const handleBuy = () => {
    if (buyAmount <= 0) return;
    setShowPurchasePopup(true);
  };

  const handleConfirmBuy = async () => {
    setShowPurchasePopup(false);
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

  return (
    <Layout>
      <SEO
        title="Create Your Own Token - Bondle"
        description="Launch a coin that is instantly tradable — fair launch"
        image="/seo/create.jpg"
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-xl sm:text-2xl font-bold text-orange mb-3 text-center">
          {step === 1 && 'Create New Token'}
          {step === 2 && 'Curve Settings'}
          {step === 3 && 'Finalize'}
        </h1>

        {showConnectHint && (
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="text-xs sm:text-sm text-yellow-200/90">Please connect wallet to avoid authorization errors.</div>
            <div className="scale-[0.9]">
              <WalletMultiButton />
            </div>
          </div>
        )}

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
                  onChange={(e) => setTokenName(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--card2)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Enter token name"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-xs font-medium text-gray-400 mb-1">Token Symbol</label>
                <input
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(normalizeSymbol(e.target.value))}
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
                onChange={(e) => setTokenDescription(e.target.value)}
                rows={4}
                className="w-full py-2 px-3 bg-[var(--card2)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="Describe your token"
              />
            </div>

            <div className="flex items-center gap-2">
              <input id="isNsfw" type="checkbox" checked={isNSFW} onChange={(e) => setIsNSFW(e.target.checked)} />
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
                        onChange={(e) => i.setter(e.target.value)}
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

        {/* ==================== STEP 2 – CURVE SETTINGS ==================== */}
        {step === 2 && (
          <div className="space-y-6 card gradient-border p-4 sm:p-6">
            <div className="rounded-lg border-thin p-4 bg-[var(--card2)]">
              <div className="text-sm font-semibold text-white mb-3">Bonding Curve Settings</div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Decimals</label>
                  <input
                    type="number"
                    min={0}
                    max={18}
                    value={decimals}
                    onChange={(e) => setDecimals(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Curve Type</label>
                  <input
                    value="linear"
                    disabled
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white opacity-70"
                  />
                  <div className="text-[10px] text-gray-500 mt-1">Mapped to BE: curveType = {curveType}</div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Base Price (lamports)</label>
                  <input
                    type="number"
                    min={0}
                    value={basePriceLamports}
                    onChange={(e) => setBasePriceLamports(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Slope (lamports)</label>
                  <input
                    type="number"
                    min={0}
                    value={slopeLamports}
                    onChange={(e) => setSlopeLamports(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Bonding Curve Supply</label>
                  <input
                    value={bondingCurveSupply}
                    onChange={(e) => setBondingCurveSupply(e.target.value)}
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white"
                    placeholder="e.g. 1000000000000000"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Graduate Target (lamports)</label>
                  <input
                    value={graduateTargetLamports}
                    onChange={(e) => setGraduateTargetLamports(e.target.value)}
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white"
                    placeholder="e.g. 69000000000"
                  />
                </div>

                {draft?.expiresAt && (
                  <div className="sm:col-span-2 text-xs text-gray-400">
                    Draft expires at: <span className="text-gray-200">{draft.expiresAt}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <button className="btn-secondary px-8 py-3 min-w-[160px] rounded-md" disabled={isBusy} onClick={() => setStep(1)}>
                Back
              </button>

              <button className="btn btn-primary px-8 py-3 min-w-[180px] rounded-md" disabled={isBusy || !draft?.draftId} onClick={() => setStep(3)}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 3 – FINALIZE ==================== */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-left">
              <div className="text-sm font-semibold text-[var(--foreground)]/90">Tip:</div>
              <div className="text-[14px] text-[var(--foreground)]/75">Optional: Make an initial buy to gain the most from your token</div>
            </div>

            <div className="rounded-3xl bg-[var(--card)] border-thin p-6 shadow-lg">
              <div className="text-center text-6xl font-extrabold tracking-wide select-none text-[var(--foreground)]/25">
                {buyAmount.toFixed(2)}
              </div>

              <div className="mt-5 grid grid-cols-4 gap-3">
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

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={handlePreviewBuy}
                  disabled={!draft?.draftId || buyAmount <= 0 || creationStep === 'previewing' || isBusy}
                  className="btn-secondary w-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creationStep === 'previewing' ? 'Previewing...' : 'Preview Buy'}
                </button>

                <button
                  type="button"
                  onClick={handleBuy}
                  disabled={!draft?.draftId || buyAmount <= 0 || creationStep === 'finalizing' || isBusy}
                  className="btn btn-secondary w-1/2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  BUY
                </button>
              </div>

              {preview && (
                <div className="mt-4 rounded-xl bg-[var(--card2)] border-thin p-4 text-sm text-gray-200">
                  <div className="font-semibold mb-2">Preview</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <div className="text-xs text-gray-400">amountSol</div>
                      <div>{preview.amountSol}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">estimatedTokens</div>
                      <div>{preview.estimatedTokens}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">price</div>
                      <div>{preview.price}</div>
                    </div>
                  </div>
                  {preview.note && <div className="text-xs text-gray-400 mt-2">{preview.note}</div>}
                </div>
              )}
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

        {showPurchasePopup && (
          <PurchaseConfirmationPopup onConfirm={handleConfirmBuy} onCancel={() => setShowPurchasePopup(false)} tokenSymbol="SOL" />
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
                          active ? 'bg-[var(--primary)] text-black' : 'text-[var(--foreground)]/85 hover:bg-[var(--card2)]'
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
