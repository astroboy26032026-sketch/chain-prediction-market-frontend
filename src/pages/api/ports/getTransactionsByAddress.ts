import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { TransactionResponse } from '@/interface/types';
import { clampPagination, checkRateLimit, isValidSolanaAddress } from '@/utils/apiSecurity';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransactionResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (!checkRateLimit(req, res, { max: 60, keyPrefix: 'getTransactions' })) return;

  try {
    const { address } = req.query;
    if (!address || typeof address !== 'string' || !isValidSolanaAddress(address)) {
      return res.status(400).json({ error: 'Valid address is required' } as any);
    }

    const { page, pageSize } = clampPagination(req.query);

    const response = await axios.get(
      `${API_BASE_URL}/api/transactions/address/${address}`,
      { params: { page, pageSize } }
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[getTransactionsByAddress] API error:', error instanceof Error ? error.message : error);
    res.status(500).json({ error: 'Failed to fetch transactions' } as any);
  }
}
