import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Token, TokenWithLiquidityEvents } from '@/interface/types';
import { useTokenLiquidity, formatTimestampV1 } from '@/utils/blockchainUtils';
import { Clock } from 'lucide-react';

/**
 * TokenCardProps
 * ---------------------------------------------------------------------------
 * token:
 *  - Dữ liệu token để render card.
 *  - Có thể là:
 *    + Token (thường dùng cho danh sách / mock / response cơ bản)
 *    + TokenWithLiquidityEvents (có thêm liquidityEvents cho trạng thái graduated)
 *
 * isEnded:
 *  - Flag do component cha quyết định để biết token đã kết thúc phase bonding chưa.
 *  - Khi isEnded = true và token đạt điều kiện (isCompleted) thì UI chuyển sang trạng thái "Graduated".
 *
 * onTokenClick:
 *  - Callback khi người dùng click vào card (thường dùng để navigate / open modal / select token).
 *  - TokenCard không tự router.push để giữ component thuần UI; điều hướng do parent xử lý.
 *
 * onLiquidityUpdate (optional):
 *  - Callback nhận liquidity mới nhất lấy từ on-chain.
 *  - Hiện tại progress đang tính theo MarketCap (mock), nên callback này chủ yếu để “chuẩn bị sẵn”
 *    cho giai đoạn sau khi chuyển logic graduation/progress sang on-chain.
 */
interface TokenCardProps {
  token: Token | TokenWithLiquidityEvents;
  isEnded: boolean;
  onTokenClick: (address: string) => void;
  onLiquidityUpdate?: (liquidityAmount: bigint) => void;
}

const TokenCard: React.FC<TokenCardProps> = ({
  token,
  isEnded,
  onTokenClick,
  onLiquidityUpdate,
}) => {
  /**
   * currentLiquidity
   * -------------------------------------------------------------------------
   * - Lưu liquidity hiện tại (ở dạng string) để tránh thao tác trực tiếp với bigint trong state.
   * - Data liquidity lấy từ hook useTokenLiquidity (thường là bigint).
   * - Hiện tại chỉ “sync state” và gọi callback onLiquidityUpdate, chưa dùng để tính progress.
   * - Mục đích: về sau khi chuyển sang progress/graduation dựa trên on-chain liquidity thì có sẵn state.
   */
  const [currentLiquidity, setCurrentLiquidity] = useState<string>('0');

  /**
   * tokenAddress
   * -------------------------------------------------------------------------
   * - Ép kiểu để phù hợp các hook web3 (thường yêu cầu template literal `0x${string}`).
   */
  const tokenAddress = token.address as `0x${string}`;

  /**
   * shouldFetchLiquidity
   * -------------------------------------------------------------------------
   * - Nếu token đã có _count.liquidityEvents (tức đã từng tạo liquidity event) -> thường là graduated
   *   => không cần fetch liquidity on-chain nữa để giảm RPC calls.
   * - Nếu chưa có => fetch liquidity on-chain để phục vụ future logic và/hoặc show dữ liệu khác.
   */
  const shouldFetchLiquidity = !token._count?.liquidityEvents;

  /**
   * useTokenLiquidity
   * -------------------------------------------------------------------------
   * - Hook custom để fetch liquidity từ blockchain.
   * - Truyền null khi không cần fetch để hook tự skip (tránh call không cần thiết).
   * - liquidityData là mảng/tuple; code hiện tại dùng liquidityData[2] (theo quy ước của hook).
   *   (Ví dụ: [token0, token1, liquidity] tuỳ implementation)
   */
  const { data: liquidityData } = useTokenLiquidity(
    shouldFetchLiquidity ? tokenAddress : null
  );

  // ===========================================================================
  // HELPERS (Normalize data & format display)
  // ===========================================================================

  /**
   * resolveNumber(v)
   * -------------------------------------------------------------------------
   * Mục tiêu: normalize dữ liệu số về kiểu number để:
   *  - UI render ổn định
   *  - tránh NaN / Infinity
   *  - hỗ trợ nhiều kiểu input (string/bigint/number)
   *
   * Quy ước:
   *  - null/undefined => return null
   *  - parse fail => return null
   *  - parse OK => return number
   *
   * Lưu ý:
   *  - Number(bigint) có thể overflow nếu bigint quá lớn, nhưng với dữ liệu UI (mcap/vol) thường an toàn.
   */
  const resolveNumber = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n =
      typeof v === 'string'
        ? Number(v)
        : typeof v === 'bigint'
        ? Number(v)
        : v;
    return Number.isFinite(n) ? n : null;
  };

  /**
   * getVolume(tokenLike)
   * -------------------------------------------------------------------------
   * Mục tiêu: lấy Volume 24h để hiển thị trong card.
   * Vì schema data có thể khác nhau giữa:
   *  - mock data
   *  - BE response
   *  - các version cũ
   *
   * Nên hàm sẽ thử nhiều field theo thứ tự ưu tiên, lấy field đầu tiên hợp lệ:
   *  - volume24h
   *  - volume24hUsd
   *  - vol24hUsd
   *  - volume (fallback)
   */
  const getVolume = (t: any): number | null =>
    resolveNumber(t.volume24h) ??
    resolveNumber(t.volume24hUsd) ??
    resolveNumber(t.vol24hUsd) ??
    resolveNumber(t.volume) ??
    null;

  /**
   * getMarketCap(tokenLike)
   * -------------------------------------------------------------------------
   * Mục tiêu: lấy Market Cap để hiển thị trong card.
   * Tương tự volume, schema có thể khác nhau nên sẽ thử các field phổ biến:
   *  - marketCap
   *  - marketCapUsd
   *  - mcapUsd
   *
   * Lưu ý:
   *  - Ở MVP/mock hiện tại, marketCap là “giá trị USD” để tính progress lên DEX.
   *  - Sau này có thể đổi sang on-chain/price* supply tuỳ mô hình.
   */
  const getMarketCap = (t: any): number | null =>
    resolveNumber(t.marketCap) ??
    resolveNumber(t.marketCapUsd) ??
    resolveNumber(t.mcapUsd) ??
    null;

  /**
   * formatUSD(value)
   * -------------------------------------------------------------------------
   * Format number -> string USD ngắn gọn dạng compact:
   *  - 1250000 => $1.25M
   *  - 48500   => $48.5K
   * Nếu null => hiển thị "—" để UI không bị giật/NaN.
   */
  const formatUSD = (v: number | null) => {
    if (v === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 2,
    }).format(v);
  };

  /**
   * Các giá trị derived từ token:
   * -------------------------------------------------------------------------
   * volume   : số volume (24h) đã normalize
   * marketCap: số market cap đã normalize
   * maxCap   : “mốc” market cap để đạt graduation/progress 100% (định nghĩa trong mock/BE)
   *
   * Note:
   * - maxCap hiện đọc từ (token as any).maxCap vì interface Token hiện có thể chưa khai báo field này.
   * - Về convention/typing: ideal là thêm maxCap?: number vào interface Token để bỏ any.
   */
  const volume = getVolume(token);
  const marketCap = getMarketCap(token);
  const maxCap = resolveNumber((token as any).maxCap);

  // ===========================================================================
  // LIQUIDITY SYNC (future-proof for on-chain graduation)
  // ===========================================================================

  /**
   * Đồng bộ liquidity từ hook vào state:
   * -------------------------------------------------------------------------
   * Điều kiện update:
   *  - shouldFetchLiquidity: chỉ sync khi đang fetch liquidity
   *  - liquidityData tồn tại và liquidityData[2] tồn tại
   *  - giá trị mới khác currentLiquidity hiện tại (tránh setState loop)
   *
   * Khi update:
   *  - setCurrentLiquidity(newValue)
   *  - gọi onLiquidityUpdate nếu được truyền vào (optional chaining)
   *
   * Lưu ý:
   * - Hiện tại UI/progress không dùng currentLiquidity (progress = marketCap/maxCap).
   * - Block này giữ lại để tương lai chuyển logic sang on-chain mà không phải rewrite lớn.
   */
  useEffect(() => {
    if (
      shouldFetchLiquidity &&
      liquidityData &&
      liquidityData[2] &&
      liquidityData[2].toString() !== currentLiquidity
    ) {
      setCurrentLiquidity(liquidityData[2].toString());
      onLiquidityUpdate?.(liquidityData[2]);
    }
  }, [liquidityData, shouldFetchLiquidity, currentLiquidity, onLiquidityUpdate]);

  // ===========================================================================
  // PROGRESS (MVP: based on Market Cap)
  // ===========================================================================

  /**
   * calculateProgressByCap(marketCap, maxCap)
   * -------------------------------------------------------------------------
   * Logic progress cho MVP/mock:
   *  - progress = (marketCap / maxCap) * 100
   *  - clamp tối đa 100%
   *
   * Guard:
   *  - Nếu marketCap hoặc maxCap không tồn tại => progress = 0
   *  - Nếu maxCap <= 0 => progress = 0 (tránh chia cho 0)
   *
   * Note:
   *  - marketCap/maxCap được hiểu cùng đơn vị (USD) trong mock hiện tại.
   */
  const calculateProgressByCap = (
    marketCap: number | null,
    maxCap: number | null
  ): number => {
    if (!marketCap || !maxCap || maxCap <= 0) return 0;
    return Math.min((marketCap / maxCap) * 100, 100);
  };

  /**
   * progress:
   * -------------------------------------------------------------------------
   * - Giá trị % để render progress bar.
   * - Dùng cho component <Progress percent={progress} />
   */
  const progress = calculateProgressByCap(marketCap, maxCap);

  /**
   * isCompleted:
   * -------------------------------------------------------------------------
   * - Token đạt điều kiện graduation dựa trên market cap (mock).
   * - Khi isCompleted = true:
   *   + Progress label hiển thị "Completed"
   *   + Nếu isEnded cũng true => render layout Graduated (có nút Trade/View)
   */
  const isCompleted =
    marketCap !== null && maxCap !== null && marketCap >= maxCap;

  /**
   * handleClick:
   * -------------------------------------------------------------------------
   * - Khi click card -> gọi callback từ parent.
   * - Không tự navigate để giữ TokenCard thuần UI/Reusable.
   */
  const handleClick = () => onTokenClick(token.address);

  // ===========================================================================
  // GRADUATED VIEW
  // ===========================================================================

  /**
   * Graduated condition:
   * -------------------------------------------------------------------------
   * - isEnded: token đã kết thúc phase bonding (do parent quyết định)
   * - isCompleted: market cap đã đạt maxCap
   * - 'liquidityEvents' in token: đảm bảo token có shape TokenWithLiquidityEvents
   *
   * Note:
   * - Link trade hiện hardcode theo chewyswap/shibarium (tuỳ chain/project).
   * - Nếu về sau chain khác -> nên chuyển link builder ra config/helper.
   */
  if (isEnded && isCompleted && 'liquidityEvents' in token) {
    const uniswapLink = `https://chewyswap.dog/swap/?outputCurrency=${token.address}&chain=shibarium`;

    return (
      <div onClick={handleClick} className="cursor-pointer">
        <div className="bg-[var(--card)] rounded-lg overflow-hidden">
          <div className="p-4">
            {/* Header: logo + name/symbol + stats */}
            <Header
              token={token}
              volume={volume}
              marketCap={marketCap}
              formatUSD={formatUSD}
            />

            {/* Progress: Completed state */}
            <Progress completed />

            {/* Actions: Trade + View */}
            <div className="flex gap-2 mt-4">
              <a
                href={uniswapLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()} // tránh click lan lên card (không trigger onTokenClick)
                className="flex-1 text-center py-2 text-sm bg-[var(--primary)] text-black rounded-md"
              >
                Trade
              </a>

              {/* Link nội bộ Next.js để xem trang detail */}
              <Link
                href={`/token/${token.address}`}
                className="flex-1 text-center py-2 text-sm bg-[var(--card-boarder)] text-white rounded-md"
              >
                View
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // DEFAULT VIEW
  // ===========================================================================

  /**
   * Default view:
   * -------------------------------------------------------------------------
   * - Hiển thị stats + thời gian tạo token (relative time)
   * - Hiển thị progress bar (marketCap/maxCap)
   */
  return (
    <div onClick={handleClick} className="cursor-pointer">
      <div className="bg-[var(--card)] rounded-lg overflow-hidden">
        <div className="p-4">
          <Header
            token={token}
            volume={volume}
            marketCap={marketCap}
            formatUSD={formatUSD}
          />

          {/* createdAt: hiển thị thời gian tương đối (vd: 1h, 2d...) */}
          <div className="flex items-center text-sm text-gray-400 mb-2">
            <Clock size={16} className="mr-2" />
            {formatTimestampV1(token.createdAt)}
          </div>

          {/* Progress bar theo market cap */}
          <Progress percent={progress} />
        </div>
      </div>
    </div>
  );
};

export default TokenCard;

// ============================================================================
// SUB COMPONENTS (UI-only, keep TokenCard JSX clean)
// ============================================================================

/**
 * Header
 * ----------------------------------------------------------------------------
 * UI block chứa:
 *  - logo token (ưu tiên token.logo; fallback noimg)
 *  - token name & symbol
 *  - 2 ô stats: Volume + Market Cap
 *
 * Note:
 * - Header đang dùng props any để đơn giản hoá MVP.
 * - Convention tốt hơn: define type cho props (HeaderProps) để bỏ any.
 */
const Header = ({ token, volume, marketCap, formatUSD }: any) => (
  <div className="flex gap-4 mb-4">
    <div className="w-24 h-24 flex-shrink-0">
      <img
        src={token.logo || '/chats/noimg.svg'}
        alt={token.name}
        className="w-full h-full object-cover rounded-lg"
      />
    </div>

    <div className="flex-grow">
      <h3 className="text-lg font-semibold text-orange">{token.name}</h3>
      <div className="text-sm text-gray-400">{token.symbol}</div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Stat label="Volume" value={formatUSD(volume)} />
        <Stat label="Market Cap" value={formatUSD(marketCap)} />
      </div>
    </div>
  </div>
);

/**
 * Stat
 * ----------------------------------------------------------------------------
 * UI cell hiển thị 1 chỉ số dạng:
 *  - Label (text nhỏ)
 *  - Value (text đậm)
 *
 * label: tên chỉ số (Volume / Market Cap)
 * value: giá trị đã format (vd: $48.5K)
 */
const Stat = ({ label, value }: any) => (
  <div className="bg-[var(--card-boarder)]/60 rounded-md px-3 py-2">
    <div className="text-gray-400">{label}</div>
    <div className="font-semibold text-white">{value}</div>
  </div>
);

/**
 * Progress
 * ----------------------------------------------------------------------------
 * UI progress bar hiển thị tiến độ lên DEX.
 *
 * percent:
 *  - % tiến độ (0 -> 100)
 *  - Default 100 để tránh undefined gây width: "undefined%"
 *
 * completed:
 *  - Nếu true: label hiển thị "Completed"
 *  - Nếu false: label hiển thị `${Math.floor(percent)}%` để UI gọn (không .00)
 *
 * Note:
 * - Math.floor(...) giúp hiển thị số nguyên (vd: 12%, 88%) theo style Pump.fun.
 */
const Progress = ({
  percent = 100,
  completed = false,
}: {
  percent?: number;
  completed?: boolean;
}) => (
  <div className="space-y-2">
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">Progress to DEX</span>
      <span className={completed ? 'text-[var(--primary)]' : 'text-white'}>
        {completed ? 'Completed' : `${Math.floor(percent)}%`}
      </span>
    </div>

    <div className="w-full bg-[var(--card-boarder)] rounded-full h-2">
      <div
        className="bg-[var(--primary)] h-2 rounded-full transition-all"
        style={{ width: `${percent}%` }}
      />
    </div>
  </div>
);
