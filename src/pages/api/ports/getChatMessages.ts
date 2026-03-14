import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { checkRateLimit } from '@/utils/apiSecurity';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (!checkRateLimit(req, res, { max: 60, keyPrefix: 'getChatMessages' })) return;

  try {
    const { token } = req.query;
    if (!token || typeof token !== 'string') {
      return res.status(400).json([]);
    }

    const response = await axios.get(`${API_BASE_URL}/chats`, {
      params: { token }
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[getChatMessages] API error:', error instanceof Error ? error.message : '');
    res.status(500).json([]);
  }
}
