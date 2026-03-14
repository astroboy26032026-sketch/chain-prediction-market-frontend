import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Token } from '@/interface/types';
import { checkRateLimit, isValidSolanaAddress } from '@/utils/apiSecurity';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Token>
) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (!checkRateLimit(req, res, { max: 60, keyPrefix: 'getTokenByAddress' })) return;

  try {
    const { address } = req.query;
    if (!address || typeof address !== 'string' || !isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Valid address is required' } as any);
    }

    const response = await axios.get(`${API_BASE_URL}/api/tokens/address/${address}`);
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[getTokenByAddress] API error:', error instanceof Error ? error.message : '');
    res.status(500).json({ error: 'Failed to fetch token' } as any);
  }
}
