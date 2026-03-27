// src/components/TokenDetails/Chats.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { getChatMessages, addChatMessage } from '@/utils/api.index';
import { toastError } from '@/utils/customToast';
import { formatTimestamp, getRandomAvatarImage, shortenAddress } from '@/utils/chatUtils';
import { motion, AnimatePresence } from 'framer-motion';
import type { TokenWithTransactions, ChatMessage as BeChatMessage } from '@/interface/types';
import { Reply, X } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { COMMON, CHAT } from '@/constants/ui-text';
import { getMarketByAddress } from '@/data/markets';

type UiChatMessage = {
  messageId: string;
  walletAddress: string;
  message: string;
  timestamp: string;
};

interface ChatsProps {
  tokenAddress: string;
  tokenInfo: TokenWithTransactions;
}

const PAGE_LIMIT = 30;

/** Strip HTML tags to prevent XSS from API responses */
const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '');

const toUiMessage = (m: BeChatMessage): UiChatMessage => ({
  messageId: m.messageId,
  walletAddress: m.walletAddress,
  message: stripHtml(m.message),
  timestamp: m.timestamp,
});

/**
 * Token chat UI (Solana-only)
 * - GET /chat/messages => cursor pagination
 * - POST /chat/write   => requires Bearer token (AuthProvider)
 *
 * NOTE: API mới không có reply_to => reply UI sẽ quote message vào text.
 */
const Chats: React.FC<ChatsProps> = ({ tokenAddress, tokenInfo }) => {
  const { publicKey, connected } = useWallet();
  const { loading, authenticated } = useAuth();

  const walletAddress = useMemo(() => publicKey?.toBase58() || '', [publicKey]);

  // Skip real API calls for mock prediction markets
  const isMockMarket = useMemo(() => !!getMarketByAddress(tokenAddress), [tokenAddress]);

  const [messages, setMessages] = useState<UiChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState<UiChatMessage | null>(null);

  // cursor pagination
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const userAvatars = useMemo(() => {
    const avatars: Record<string, string> = {};
    messages.forEach((msg) => {
      const k = msg.walletAddress;
      if (!avatars[k]) avatars[k] = getRandomAvatarImage();
    });
    return avatars;
  }, [messages]);

  const fetchMessages = useCallback(
    async (isLoadMore = false) => {
      if (!tokenAddress || isMockMarket) return;

      try {
        if (isLoadMore) setLoadingMore(true);

        const res = await getChatMessages(tokenAddress, {
          limit: PAGE_LIMIT,
          cursor: isLoadMore ? cursor ?? undefined : undefined,
        });

        const ui = (res?.messages ?? []).map(toUiMessage);

        setMessages((prev) => (isLoadMore ? [...prev, ...ui] : ui));
        setCursor(res?.nextCursor ?? null);
        setHasMore(Boolean(res?.nextCursor));
      } catch (error: any) {
        console.error('Error fetching messages:', error);
        toastError(error?.message || 'Failed to load chat');
        setHasMore(false);
      } finally {
        if (isLoadMore) setLoadingMore(false);
      }
    },
    [tokenAddress, cursor, isMockMarket]
  );

  // reset + initial load when token changes
  useEffect(() => {
    setMessages([]);
    setCursor(null);
    setReplyingTo(null);
    setNewMessage('');

    if (isMockMarket) {
      setHasMore(false);
      return;
    }

    setHasMore(true);
    fetchMessages(false);

    const interval = setInterval(() => {
      if (!document.hidden) fetchMessages(false);
    }, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenAddress, isMockMarket]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    if (!connected || !walletAddress) {
      toastError('Connect Solana wallet to chat');
      return;
    }

    if (!authenticated) {
      toastError('Please authenticate to chat');
      return;
    }

    const raw = newMessage.trim();
    if (!raw) return;

    // Reply: API mới không có reply_to => quote vào body
    const finalMessage = replyingTo
      ? `↪ Reply to ${shortenAddress(replyingTo.walletAddress)}: "${replyingTo.message.slice(0, 120)}"\n${raw}`
      : raw;

    try {
      const posted = await addChatMessage({
        tokenAddress,
        walletAddress,
        message: finalMessage,
      });

      // optimistic prepend
      setMessages((prev) => [toUiMessage(posted as any), ...prev]);

      setNewMessage('');
      setReplyingTo(null);

      // refresh first page to keep consistent ordering
      fetchMessages(false);
    } catch (error: any) {
      console.error('Error sending message:', error);
      toastError(error?.message || 'Failed to send message');
    }
  };

  const isDev = useCallback(
    (wa: string) => {
      const c = String((tokenInfo as any)?.creatorAddress || '').toLowerCase();
      return c && String(wa || '').toLowerCase() === c;
    },
    [tokenInfo]
  );

  // Auth gating UI — only require wallet connection to view chat
  if (!connected || !walletAddress) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-sm text-gray-400">
        Connect your Solana wallet to view & send chat messages.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[400px] sm:h-[500px]">
      <div className="flex-grow overflow-y-auto custom-scrollbar space-y-2 sm:space-y-4 p-2">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.messageId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-[var(--card2)] rounded-lg p-2 sm:p-3 border-thin"
            >
              <div className="flex items-start gap-1.5 sm:gap-2">
                <Image
                  src={userAvatars[message.walletAddress] || getRandomAvatarImage()}
                  alt="Avatar"
                  width={20}
                  height={20}
                  className="rounded-full hidden sm:block"
                />
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-medium text-gray-300">
                      {shortenAddress(message.walletAddress)}
                      {isDev(message.walletAddress) && (
                        <span className="ml-1 text-[var(--primary)] text-[10px] sm:text-xs">(dev)</span>
                      )}
                    </span>
                    <span className="text-[10px] sm:text-xs text-gray-500">{formatTimestamp(message.timestamp)}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-gray-200 mt-0.5 sm:mt-1 whitespace-pre-wrap break-words">
                    {message.message}
                  </p>

                  <button
                    onClick={() => setReplyingTo(message)}
                    className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-400 hover:text-[var(--primary)] flex items-center gap-0.5 sm:gap-1"
                  >
                    <Reply size={10} className="sm:w-3 sm:h-3" />
                    Reply
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {messages.length === 0 && <div className="text-xs text-gray-400 p-2">No messages yet</div>}
      </div>

      {hasMore && (
        <div className="px-2">
          <button
            type="button"
            onClick={() => fetchMessages(true)}
            disabled={loadingMore}
            className="w-full px-5 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] hover:shadow text-sm disabled:opacity-50"
          >
            {loadingMore ? COMMON.LOADING : COMMON.LOAD_MORE}
          </button>
        </div>
      )}

      <form onSubmit={handleSendMessage} className="mt-2 sm:mt-4 space-y-1 sm:space-y-2 p-2">
        {replyingTo && (
          <div className="flex items-center justify-between bg-[var(--card)] p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm border-thin">
            <span className="text-gray-400">
              Replying to <span className="text-[var(--primary)]">{shortenAddress(replyingTo.walletAddress)}</span>
            </span>
            <button type="button" onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-white">
              <X size={14} className="sm:w-4 sm:h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-1.5 sm:gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={CHAT.PLACEHOLDER}
            className="flex-grow bg-[var(--card2)] text-white rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)] border-thin"
          />
          <button type="submit" disabled={!newMessage.trim() || loading} className="btn btn-primary text-xs sm:text-sm disabled:opacity-50">
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chats;
