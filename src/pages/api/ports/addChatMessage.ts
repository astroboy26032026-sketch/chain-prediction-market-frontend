import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { checkRateLimit, checkCsrf, requireAuth, sanitizeMessage, isValidSolanaAddress } from '@/utils/apiSecurity';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ id: number }>
) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // Security: CSRF check
  if (!checkCsrf(req, res)) return;

  // Security: require auth
  if (!requireAuth(req, res)) return;

  // Security: rate limit (20 messages per minute per IP)
  if (!checkRateLimit(req, res, { max: 20, keyPrefix: 'chat' })) return;

  try {
    const { user, token, message, replyTo } = req.body;
    if (!user || !token || !message) {
      return res.status(400).json({ error: 'User, token, and message are required' } as any);
    }

    // Validate wallet address format
    if (typeof user === 'string' && !isValidSolanaAddress(user)) {
      return res.status(400).json({ error: 'Invalid wallet address' } as any);
    }

    // Sanitize message content
    const cleanMessage = sanitizeMessage(String(message));
    if (!cleanMessage) {
      return res.status(400).json({ error: 'Message cannot be empty' } as any);
    }

    const response = await axios.post(
      `${API_BASE_URL}/chats`,
      {
        user,
        token,
        message: cleanMessage,
        reply_to: replyTo,
      },
      {
        headers: {
          Authorization: req.headers.authorization || '',
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[addChatMessage] API error:', error instanceof Error ? error.message : '');
    res.status(500).json({ error: 'Failed to add chat message' } as any);
  }
}
