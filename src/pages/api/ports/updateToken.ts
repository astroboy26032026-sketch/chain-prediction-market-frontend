import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Token } from '@/interface/types';
import { checkRateLimit, checkCsrf, requireAuth, isValidSolanaAddress } from '@/utils/apiSecurity';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Token>
) {
  if (req.method !== 'PATCH') {
    return res.status(405).end();
  }

  // Security: CSRF check
  if (!checkCsrf(req, res)) return;

  // Security: require auth
  if (!requireAuth(req, res)) return;

  // Security: rate limit
  if (!checkRateLimit(req, res, { max: 10, keyPrefix: 'updateToken' })) return;

  try {
    const { address, data } = req.body;
    if (!address || !data) {
      return res.status(400).json({ error: 'Address and data are required' } as any);
    }

    // Validate address format
    if (!isValidSolanaAddress(String(address))) {
      return res.status(400).json({ error: 'Invalid token address' } as any);
    }

    // Forward auth header so backend can verify creator ownership
    const response = await axios.patch(
      `${API_BASE_URL}/api/tokens/update/${address}`,
      data,
      {
        headers: {
          Authorization: req.headers.authorization || '',
        },
      }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[updateToken] API error:', error instanceof Error ? error.message : '');
    res.status(500).json({ error: 'Failed to update token' } as any);
  }
}
