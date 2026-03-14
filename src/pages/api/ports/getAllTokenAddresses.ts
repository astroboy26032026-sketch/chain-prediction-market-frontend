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

  if (!checkRateLimit(req, res, { max: 30, keyPrefix: 'getAllTokenAddresses' })) return;

  try {
    const response = await axios.get(`${API_BASE_URL}/api/tokens/addresses`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[getAllTokenAddresses] API error:', error instanceof Error ? error.message : error);
    res.status(500).json([]);
  }
}
