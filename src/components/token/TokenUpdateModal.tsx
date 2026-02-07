// src/components/token/TokenUpdateModal.tsx
import React, { useState, useRef, useEffect } from 'react';
import type { Token } from '@/interface/types';
import { updateToken, type UpdateTokenRequest } from '@/utils/api.index';
import { toast } from 'react-toastify';
import axios from 'axios';
import { CloudArrowUpIcon, XMarkIcon } from '@heroicons/react/24/outline';

// ✅ Solana wallet
import { useWallet } from '@solana/wallet-adapter-react';

interface TokenUpdateModalProps {
  token: Token;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (token: Token) => void;
}

/**
 * Modal for updating token metadata (logo, description, socials).
 * Solana-only: auth = connected wallet === token.creatorAddress
 */
export const TokenUpdateModal: React.FC<TokenUpdateModalProps> = ({
  token,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const { publicKey, connected } = useWallet();

  const [isLoading, setIsLoading] = useState(false);

  const [description, setDescription] = useState(token?.description || '');
  const [twitter, setTwitter] = useState(token?.twitter || '');
  const [telegram, setTelegram] = useState(token?.telegram || '');
  const [website, setWebsite] = useState(token?.website || '');
  const [discord, setDiscord] = useState(token?.discord || '');

  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [socialLinksCount, setSocialLinksCount] = useState(0);

  useEffect(() => {
    setDescription(token?.description || '');
    setTwitter(token?.twitter || '');
    setTelegram(token?.telegram || '');
    setWebsite(token?.website || '');
    setDiscord(token?.discord || '');
    setUploadedImageUrl(null);
  }, [token]);

  useEffect(() => {
    const links = [token.twitter, token.telegram, token.discord, token.website].filter(Boolean);
    setSocialLinksCount(links.length);
  }, [token.twitter, token.telegram, token.discord, token.website]);

  const needsUpdate = !token.logo || !token.description || socialLinksCount < 3;

  // ✅ Solana auth check
  const isCreator =
    connected &&
    publicKey &&
    token.creatorAddress &&
    publicKey.toBase58() === token.creatorAddress;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleFileUpload = async (file: File) => {
    if (file.size > 1024 * 1024) {
      toast.error('File size should be less than 1MB');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/upload-to-ipfs', formData);
      setUploadedImageUrl(res.data.url);
      toast.success('Image uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await handleFileUpload(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFileUpload(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!connected || !publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!isCreator) {
      toast.error('Only token creator can update token info');
      return;
    }

    setIsLoading(true);

    try {
      const payload: UpdateTokenRequest = {
        address: token.address,
        description: description || token.description,
        imageUrl: uploadedImageUrl || token.logo,
        socials: {
          twitter: twitter || token.twitter,
          telegram: telegram || token.telegram,
          website: website || token.website,
          discord: discord || token.discord,
        },
      };

      const updatedToken = await updateToken(payload);

      toast.success('Token updated successfully');
      onUpdate(updatedToken);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (String(err?.message).includes('not implemented')) {
        toast.info('Update token sẽ bật sau (BE chưa support)');
      } else {
        toast.error('Failed to update token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  if (!needsUpdate) {
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="card gradient-border rounded-xl w-full max-w-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Token Information Complete</h2>
            <button onClick={onClose}>
              <XMarkIcon className="h-5 w-5 text-gray-400" />
            </button>
          </div>
          <p className="text-gray-400 text-sm">
            Token đã đủ logo, description và social links.
          </p>
          <div className="mt-4 flex justify-end">
            <button onClick={onClose} className="btn btn-primary text-xs">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="card gradient-border rounded-xl w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-white">Update Token Information</h2>
          <button onClick={onClose}>
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {!connected ? (
          <p className="text-sm text-gray-400 text-center">
            Please connect your Solana wallet to continue
          </p>
        ) : !isCreator ? (
          <p className="text-sm text-red-400 text-center">
            Connected wallet is not token creator
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-3">
              {!token.logo && (
                <>
                  <div
                    className={`rounded-lg p-3 text-center cursor-pointer border-dashed border-thin ${
                      isDragging ? 'bg-[var(--card2)] border-[var(--primary)]' : ''
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileSelect}
                    />
                    <CloudArrowUpIcon className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-xs text-gray-400">
                      Drag & drop image or click to upload
                    </p>
                  </div>

                  {uploadedImageUrl && (
                    <img src={uploadedImageUrl} className="w-16 h-16 mx-auto rounded-full mt-2" />
                  )}
                </>
              )}

              {!token.description && (
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[var(--card2)] text-white text-sm rounded-lg"
                  placeholder="Token description"
                />
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary text-xs">
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary text-xs disabled:opacity-50"
              >
                {isLoading ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default TokenUpdateModal;
