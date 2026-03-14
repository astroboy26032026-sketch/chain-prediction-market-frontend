import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { checkRateLimit } from '@/utils/apiSecurity';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<{ totalTokens: number }>
) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (!checkRateLimit(req, res, { max: 60, keyPrefix: 'getTotalTokenCount' })) return;

  try {
    const response = await axios.get(`${API_BASE_URL}/api/tokens/total-count`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[getTotalTokenCount] API error:', error instanceof Error ? error.message : error);
    res.status(500).json({ totalTokens: 0 });
  }
}
