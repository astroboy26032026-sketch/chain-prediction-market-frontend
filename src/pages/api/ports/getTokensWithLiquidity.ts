import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { TokenWithLiquidityEvents, PaginatedResponse } from '@/interface/types';
import { clampPagination, checkRateLimit } from '@/utils/apiSecurity';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedResponse<TokenWithLiquidityEvents>>
) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  if (!checkRateLimit(req, res, { max: 60, keyPrefix: 'getTokensWithLiquidity' })) return;

  try {
    const { page, pageSize } = clampPagination(req.query);
    const response = await axios.get(`${API_BASE_URL}/api/tokens/with-liquidityEvent`, {
      params: { page, pageSize }
    });
    res.status(200).json(response.data);
  } catch (error) {
    console.error('[getTokensWithLiquidity] API error:', error instanceof Error ? error.message : error);
    res.status(500).json({
      tokens: [],
      data: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1
    });
  }
}
