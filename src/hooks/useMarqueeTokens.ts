// Hook: fetches trending tokens for marquee (independent from main list)

import { useEffect, useRef, useState } from 'react';
import { searchTokens } from '@/utils/api.index';
import type { TokenSearchFilters, TokenCategory } from '@/utils/api';
import type { Token } from '@/interface/types';

const MARQUEE_LIMIT = 40;

export function useMarqueeTokens(includeNsfw: boolean) {
  const [marqueeTokens, setMarqueeTokens] = useState<Token[]>([]);
  const [marqueeLogoError, setMarqueeLogoError] = useState<Record<string, boolean>>({});
  const marqueeReqRef = useRef(0);

  useEffect(() => {
    const run = async () => {
      const myReq = ++marqueeReqRef.current;

      try {
        const f: TokenSearchFilters = {
          category: 'trending' as TokenCategory,
          includeNsfw,
        };
        const res = await searchTokens('', 1, MARQUEE_LIMIT, undefined, f);
        if (myReq !== marqueeReqRef.current) return;

        setMarqueeTokens((res?.data ?? []) as Token[]);
        setMarqueeLogoError({});
      } catch (e) {
        console.error('marquee trending fetch error:', e);
        if (myReq !== marqueeReqRef.current) return;
        setMarqueeTokens([]);
        setMarqueeLogoError({});
      }
    };

    run();
  }, [includeNsfw]);

  const onLogoError = (key: string) => {
    setMarqueeLogoError((p) => ({ ...p, [key]: true }));
  };

  return { marqueeTokens, marqueeLogoError, onLogoError };
}
