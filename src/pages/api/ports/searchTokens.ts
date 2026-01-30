import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import { Token, PaginatedResponse } from '@/interface/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') ||
  'https://dev.pumpfunclone2025.win';

type TokenSearchBE<T> = {
  items: T[];
  nextCursor?: string | null;
};

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaginatedResponse<Token>>
) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const {
      q,
      category,
      includeNsfw,
      mcapMin,
      mcapMax,
      volMin,
      volMax,

      // backward compatibility
      page = '1',
      pageSize = '20',

      // new cursor-based
      limit,
      cursor,
    } = req.query;

    const pageNum = Number(Array.isArray(page) ? page[0] : page);
    const pageSizeNum = Number(Array.isArray(pageSize) ? pageSize[0] : pageSize);

    // ưu tiên limit nếu có, không có thì dùng pageSize
    const limitNum = clamp(
      Number(Array.isArray(limit) ? limit[0] : limit) || pageSizeNum || 20,
      1,
      50
    );

    const params: any = {
      q: Array.isArray(q) ? q[0] : q,
      category: Array.isArray(category) ? category[0] : category,
      cursor: Array.isArray(cursor) ? cursor[0] : cursor,
      includeNsfw:
        includeNsfw === undefined
          ? false
          : (Array.isArray(includeNsfw) ? includeNsfw[0] : includeNsfw) === 'true',
      limit: limitNum,
    };

    // optional numeric params
    const pickNum = (v: any) => {
      const s = Array.isArray(v) ? v[0] : v;
      if (s === undefined || s === null || s === '') return undefined;
      const num = Number(s);
      return Number.isFinite(num) ? num : undefined;
    };

    const nMcapMin = pickNum(mcapMin);
    const nMcapMax = pickNum(mcapMax);
    const nVolMin = pickNum(volMin);
    const nVolMax = pickNum(volMax);

    if (nMcapMin !== undefined) params.mcapMin = nMcapMin;
    if (nMcapMax !== undefined) params.mcapMax = nMcapMax;
    if (nVolMin !== undefined) params.volMin = nVolMin;
    if (nVolMax !== undefined) params.volMax = nVolMax;

    // ⚠️ page-based: nếu page > 1 mà không có cursor thì không map được chính xác
    if (pageNum > 1 && !params.cursor) {
      return res.status(200).json({
        tokens: [],
        data: [],
        totalCount: 0,
        currentPage: pageNum,
        totalPages: 1,
        nextCursor: null,
      });
    }

    const response = await axios.get<TokenSearchBE<Token>>(`${API_BASE_URL}/token/search`, {
      params,
      headers: { 'Content-Type': 'application/json' },
    });

    const items = response.data?.items ?? [];
    const nextCursor = response.data?.nextCursor ?? null;

    // trả theo format FE cũ hiểu (PaginatedResponse)
    return res.status(200).json({
      tokens: [],
      data: items,
      totalCount: items.length, // BE không trả totalCount -> tạm set length
      currentPage: pageNum,
      totalPages: 1,
      nextCursor,
    });
  } catch (error) {
    return res.status(500).json({
      tokens: [],
      data: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 1,
      nextCursor: null,
    });
  }
}
