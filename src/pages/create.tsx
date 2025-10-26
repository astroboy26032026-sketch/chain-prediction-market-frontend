import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import axios from 'axios';

import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { useCreateToken } from '@/utils/blockchainUtils';
import { updateToken } from '@/utils/api';

import {
  ChevronDownIcon,
  ChevronUpIcon,
  CloudArrowUpIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

import PurchaseConfirmationPopup from '@/components/notifications/PurchaseConfirmationPopup';
import Modal from '@/components/notifications/Modal';

type Step = 1 | 2 | 3;
type Badge = 'Bronze' | 'Silver' | 'Gold' | null;

const MAX_FILE_SIZE = 1024 * 1024;
const toLamports = (n: number) => BigInt(Math.round(n * 1e9));
const makeSymbol = (name: string) =>
  ((name || 'TOKEN').replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'TOKEN');

const CreateToken: React.FC = () => {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);

  /* ========= Step 1: Create New Token ========= */
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDescription, setTokenDescription] = useState('');
  const [tokenImageUrl, setTokenImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [website, setWebsite] = useState('');
  const [telegram, setTelegram] = useState('');
  const [discord, setDiscord] = useState('');
  const [twitter, setTwitter] = useState('');
  const [youtube, setYoutube] = useState('');
  const [isSocialExpanded, setIsSocialExpanded] = useState(false);

  // Upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const openFilePicker = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);
  const onImagePicked = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    await uploadToIPFS(f);
  }, []);
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  }, []);
  const onDrop = useCallback(async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    await uploadToIPFS(f);
  }, []);

  /* ========= Step 2: Trust Core Setting ========= */
  const [initialSupply, setInitialSupply] = useState<number | ''>('');
  const [distCreator, setDistCreator] = useState(40);
  const [distCommunity, setDistCommunity] = useState(40);
  const [distLiquidity, setDistLiquidity] = useState(20);
  const distSum = distCreator + distCommunity + distLiquidity;

  const [mintAuthority, setMintAuthority] = useState('');
  const [renounceMint, setRenounceMint] = useState(false);
  const [freezeEnabled, setFreezeEnabled] = useState<boolean | null>(null);
  const [lpLockMonths, setLpLockMonths] = useState<0 | 1 | 6>(0);
  const lockedUntil = lpLockMonths
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() + lpLockMonths);
        return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
      })()
    : null;
  const [badge, setBadge] = useState<Badge>(null);

  /* ========= Step 3 / Create flow ========= */
  const [creationStep, setCreationStep] =
    useState<'idle' | 'uploading' | 'creating' | 'updating' | 'completed' | 'error'>('idle');
  const [showPurchasePopup, setShowPurchasePopup] = useState(false);
  const [showPreventNavigationModal, setShowPreventNavigationModal] = useState(false);

  // Finalize – buy panel
  const [buyAmount, setBuyAmount] = useState<number>(0);
  const walletBalance = 0;

  const { createToken, isLoading: isBlockchainLoading, UserRejectedRequestError } = useCreateToken();

  /* ========= Upload to IPFS ========= */
  const uploadToIPFS = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size exceeds 1MB limit. Please choose a smaller file.');
      return null;
    }
    setIsUploading(true);
    setCreationStep('uploading');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post('/api/upload-to-ipfs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        setTokenImageUrl(res.data.url);
        toast.success('Image uploaded successfully!');
        return res.data.url;
      }
      throw new Error('No URL returned');
    } catch (e: any) {
      toast.error(e?.response?.data?.error || 'Failed to upload image.');
      return null;
    } finally {
      setIsUploading(false);
      setCreationStep('idle');
    }
  }, []);

  /* ========= Trust score ========= */
  const hasBronze =
    initialSupply !== '' &&
    Number(initialSupply) > 0 &&
    distSum === 100 &&
    mintAuthority.trim().length > 0;

  const hasSilver = hasBronze && freezeEnabled !== null;
  const hasGold = hasSilver && lpLockMonths !== 0;

  const handleCheckTrust = () => {
    if (hasGold) setBadge('Gold');
    else if (hasSilver) setBadge('Silver');
    else if (hasBronze) setBadge('Bronze');
    else {
      setBadge(null);
      toast('Please complete more details to earn a badge.', { icon: 'ℹ️' });
    }
  };

  /* ========= Create on-chain + update backend ========= */
  const runCreate = useCallback(
    async (purchaseLamports: bigint) => {
      setCreationStep('creating');
      let tokenAddress: string | null = null;
      try {
        const symbol = tokenSymbol || makeSymbol(tokenName);
        tokenAddress = await createToken(tokenName, symbol, purchaseLamports);

        setCreationStep('updating');
        // giả lập chờ indexer/back-end cập nhật
        await new Promise((r) => setTimeout(r, 4000));

        if (tokenAddress && tokenImageUrl) {
          // Chuẩn hoá payload tokenomics để tránh lỗi type (và không gửi field rỗng)
          const tokenomicsPayload = {
            ...(initialSupply !== '' ? { initialSupply: Number(initialSupply) } : {}),
            distribution: {
              creator: distCreator,
              community: distCommunity,
              liquidity: distLiquidity,
            },
            ...(mintAuthority.trim() ? { mintAuthority: mintAuthority.trim() } : {}),
            renounceMint,
            ...(freezeEnabled !== null ? { freezeEnabled } : {}),
            lpLockMonths,
            ...(lockedUntil ? { lockedUntil } : {}),
            ...(badge ? { trustBadge: badge } : {}),
          } as const;

          await updateToken(tokenAddress, {
            logo: tokenImageUrl,
            description: tokenDescription,
            ...(website ? { website } : {}),
            ...(telegram ? { telegram } : {}),
            ...(discord ? { discord } : {}),
            ...(twitter ? { twitter } : {}),
            ...(youtube ? { youtube } : {}),
            // Nếu api.ts CHƯA khai báo `tokenomics`, cast tạm để không lỗi TS.
            tokenomics: tokenomicsPayload as any,
          } as any);

          setCreationStep('completed');
          toast.success('Token created successfully!');
          router.push(`/token/${tokenAddress}`);
        } else {
          throw new Error('Token address or image URL missing');
        }
      } catch (error: any) {
        setCreationStep('idle');
        if (error instanceof UserRejectedRequestError) toast.error('Transaction was cancelled.');
        else if (!tokenAddress) toast.error('Failed to create token on blockchain. Please try again.');
        else toast.error('Created on-chain but failed to update backend. Try later in Portfolio.');
      }
    },
    [
      tokenName, tokenSymbol, tokenImageUrl, tokenDescription,
      initialSupply, distCreator, distCommunity, distLiquidity,
      mintAuthority, renounceMint, freezeEnabled, lpLockMonths, lockedUntil, badge,
      website, telegram, discord, twitter, youtube,
      createToken, router, UserRejectedRequestError
    ]
  );

  const handleBuy = () => {
    if (buyAmount <= 0) return;
    setShowPurchasePopup(true);
  };
  const handleConfirmBuy = async () => {
    setShowPurchasePopup(false);
    await runCreate(toLamports(buyAmount));
  };
  const handleCreateWithoutBuy = async () => {
    await runCreate(BigInt(0));
  };

  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (creationStep === 'creating' || creationStep === 'updating') {
        e.preventDefault(); e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [creationStep]);

  useEffect(() => {
    setShowPreventNavigationModal(creationStep === 'creating' || creationStep === 'updating');
  }, [creationStep]);

  /* ========= Liquidity Settings (gear) ========= */
  const [showLiquidity, setShowLiquidity] = useState(false);
  const [liqMode, setLiqMode] = useState<'PSOL' | 'SOL'>('PSOL');
  const creatorReward = { sol: 2, points: 69 };

  /* ========= Render ========= */
  return (
    <Layout>
      <SEO title="Create Your Own Token - Bondle" description="Launch a coin that is instantly tradable — fair launch" image="/seo/create.jpg" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Title giữ nguyên như trước (center) */}
        <h1 className="text-xl sm:text-2xl font-bold text-orange mb-3 text-center">
          {step === 1 && 'Create New Token'}
          {step === 2 && 'Trust Score Setting'}
          {step === 3 && 'Finalize'}
        </h1>

        {/* Hàng dưới tiêu đề: Info (trái) + Setting (phải) – chỉ Step 1 */}
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

            {/* Setting button */}
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

        {/* ==================== STEP 1 – CREATE NEW TOKEN ==================== */}
        {step === 1 && (
          <div className="space-y-6 card gradient-border p-4 sm:p-6">
            {/* Form */}
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
                  onChange={(e) => setTokenSymbol(e.target.value)}
                  className="w-full py-2 px-3 bg-[var(--card2)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  placeholder="Enter token symbol"
                />
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

            {/* Next full-width */}
            <div className="flex">
              <button
                className="btn btn-primary w-full py-3 rounded-md disabled:opacity-50"
                disabled={!tokenName || !tokenSymbol}
                onClick={() => {
                  if (initialSupply === '') setInitialSupply(1000000000);
                  setStep(2);
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* ==================== STEP 2 – TRUST CORE SETTING ==================== */}
        {step === 2 && (
          <div className="space-y-6 card gradient-border p-4 sm:p-6">
            {/* Tokenomics */}
            <div className="rounded-lg border-thin p-4 bg-[var(--card2)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">1. Vesting Plan – Tokenomics</div>
                <span className="text-[11px] text-gray-400">Complete all → 🥉 Bronze</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Initial Supply</label>
                  <input
                    type="number"
                    min={0}
                    value={initialSupply}
                    onChange={(e) => setInitialSupply(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    placeholder="e.g. 1,000,000,000"
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-xs text-gray-400 mb-1">Mint Authority</label>
                  <input
                    value={mintAuthority}
                    onChange={(e) => setMintAuthority(e.target.value)}
                    className="w-full py-2 px-3 bg-[var(--card)] border-thin rounded-md text-white"
                    placeholder="Wallet address / program id"
                  />
                </div>

                <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[
                    { label: 'Creator %', value: distCreator, setter: setDistCreator },
                    { label: 'Community %', value: distCommunity, setter: setDistCommunity },
                    { label: 'Liquidity %', value: distLiquidity, setter: setDistLiquidity },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] sm:text-xs text-gray-400">{s.label}</span>
                        <span className="text-[10px] sm:text-xs text-white">{s.value}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={s.value}
                        onChange={(e) => s.setter(Number(e.target.value))}
                        className="w-full accent-[var(--primary)]"
                      />
                    </div>
                  ))}
                  <div className="sm:col-span-3 text-[11px] text-gray-400">
                    Sum: <span className={distSum === 100 ? 'text-green-400' : 'text-red-400'}>{distSum}%</span> (must be 100%)
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-[10px] sm:text-xs text-gray-400">Renounce mint authority</label>
                  <input type="checkbox" checked={renounceMint} onChange={(e) => setRenounceMint(e.target.checked)} />
                </div>
              </div>
            </div>

            {/* Freeze */}
            <div className="rounded-lg border-thin p-4 bg-[var(--card2)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">2. Freeze Authority</div>
                <span className="text-[11px] text-gray-400">Complete → 🥈 Silver (+20% trust)</span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-400">Enable</span>
                  <input type="radio" name="freeze" checked={freezeEnabled === true} onChange={() => setFreezeEnabled(true)} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] sm:text-xs text-gray-400">Disable</span>
                  <input type="radio" name="freeze" checked={freezeEnabled === false} onChange={() => setFreezeEnabled(false)} />
                </div>
                <InformationCircleIcon className="h-4 w-4 text-gray-400" title="If enabled, authority can temporarily freeze token accounts." />
              </div>
            </div>

            {/* LP Lock */}
            <div className="rounded-lg border-thin p-4 bg-[var(--card2)]">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-white">3. LP Lock</div>
                <span className="text-[11px] text-gray-400">Complete → 🥇 Gold</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {[0, 1, 6].map((m) => {
                  const active = lpLockMonths === m;
                  const base = 'px-4 py-2 rounded-full border-thin';
                  if (m === 0) {
                    // No lock: chữ luôn trắng
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setLpLockMonths(m as 0 | 1 | 6)}
                        className={`${base} ${active ? 'bg-[var(--primary)] text-black' : 'bg-[var(--card)] text-white'}`}
                      >
                        No lock
                      </button>
                    );
                  }
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setLpLockMonths(m as 0 | 1 | 6)}
                      className={`${base} ${active ? 'bg-[var(--primary)] text-black' : 'bg-[var(--card)] text-gray-200'}`}
                    >
                      {m} month{m > 1 ? 's' : ''}
                    </button>
                  );
                })}
              </div>

              {lockedUntil && (
                <div className="mt-3 text-[11px] text-white font-medium">
                  Liquidity will be locked until {lockedUntil}.
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="btn-secondary px-6 py-3 min-w-[160px] rounded-md" onClick={handleCheckTrust}>
                  Check Trust Score
                </button>
                <div className="text-xs flex items-center gap-2">
                  <span className="text-gray-400">Badge:</span>
                  {badge === 'Gold' && <span className="text-yellow-300">🥇 Gold</span>}
                  {badge === 'Silver' && <span className="text-gray-300">🥈 Silver</span>}
                  {badge === 'Bronze' && <span className="text-amber-400">🥉 Bronze</span>}
                  {!badge && <span className="text-gray-500">—</span>}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button className="btn-secondary px-8 py-3 min-w-[160px] rounded-md" onClick={() => setStep(1)}>
                  Back
                </button>
                <button className="btn btn-primary px-8 py-3 min-w-[180px] rounded-md" onClick={() => setStep(3)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== STEP 3 – FINALIZE ==================== */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-left">
              <div className="text-sm font-semibold text-[var(--foreground)]/90">Tip:</div>
              <div className="text-[14px] text-[var(--foreground)]/75">
                Optional: Make an initial buy to gain the most from your token
              </div>
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

              <button
                type="button"
                onClick={handleBuy}
                disabled={buyAmount <= 0}
                className="btn btn-secondary w-full mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                BUY
              </button>
            </div>

            <div className="flex gap-4 pt-2">
              <button type="button" onClick={() => setStep(2)} className="btn-secondary w-1/2">
                Back
              </button>
              <button type="button" onClick={handleCreateWithoutBuy} className="btn btn-primary w-1/2">
                Create Without Buying
              </button>
            </div>
          </div>
        )}

        {/* Confirm buy popup */}
        {showPurchasePopup && (
          <PurchaseConfirmationPopup
            onConfirm={handleConfirmBuy}
            onCancel={() => setShowPurchasePopup(false)}
            tokenSymbol="SOL"
          />
        )}

        {/* Liquidity Settings Modal */}
        {showLiquidity && (
          <Modal isOpen={showLiquidity} onClose={() => setShowLiquidity(false)}>
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-semibold mt-5 text-[var(--foreground)]">Liquidity</h3>
                </div>

                {/* Pill segmented control */}
                <div className="flex items-center bg-[var(--card)] border-thin rounded-full p-1">
                  {(['PSOL','SOL'] as const).map((key) => {
                    const active = liqMode === key;
                    return (
                      <button
                        key={key}
                        onClick={() => setLiqMode(key)}
                        className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition
                                    ${active ? 'bg-[var(--primary)] text-black' : 'text-[var(--foreground)]/85 hover:bg-[var(--card2)]'}`}
                      >
                        {key}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <p className="mt-4 text-sm text-[var(--foreground)]/75">
                pSOL works its magic for everyone — launch with SOL only if you’re strong enough!
              </p>

              {/* Reward strip */}
              <div className="mt-6 rounded-2xl bg-[var(--card2)] border-thin px-4 py-3 flex items-center justify-between">
                <div className="text-sm font-medium text-[var(--foreground)]/85">
                  <span className="opacity-80 mr-1">Creator Reward:</span>
                  <span className="font-bold">{creatorReward.sol} SOL</span> + {creatorReward.points} points
                </div>
                <button
                  onClick={() => setShowLiquidity(false)}
                  className="btn-secondary px-4 py-2 rounded-full"
                >
                  Done
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Prevent navigation modal */}
        {showPreventNavigationModal && (
          <Modal isOpen={showPreventNavigationModal} onClose={() => {}}>
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-100 mb-4">Please Wait</h3>
              <p className="text-sm text-gray-500">
                Your token is being {creationStep === 'creating' ? 'created' : 'updated'}. Please do not close or navigate away.
              </p>
            </div>
          </Modal>
        )}
      </div>
    </Layout>
  );
};

export default CreateToken;
