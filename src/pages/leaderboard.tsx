// src/pages/leaderboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/seo/SEO";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import LoadingBar from "@/components/ui/LoadingBar";
import { getLeaderboardTop, getLeaderboardList } from "@/utils/api.index";

/* =========================
   Types (GIỮ UI)
========================= */
type LeaderItem = {
  id: string;
  address: string;
  rank: number;
  name: string;
  subtitle?: string;
  icon: string;
  creator: { handle: string; avatar: string };
  mcapUsd: number;
  vol24hUsd: number;
  mcapChangePct: number;
  volChangePct: number;
  createdAgo: string;
  followers?: number | "n/a";
};

/* =========================
   Helpers (GIỮ UI)
========================= */
const usd = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(0)}K`
    : `$${n.toFixed(2)}`;

const pctEl = (n: number) => {
  const sign = n > 0 ? "+" : "";
  const color =
    n > 0 ? "text-emerald-400" : n < 0 ? "text-red-400" : "text-gray-400";
  return <span className={color}>{`${sign}${n.toFixed(2)}%`}</span>;
};

const timeAgo = (ts?: string | number | Date): string => {
  if (!ts) return "n/a";
  const then = new Date(ts).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = 1000 * 60,
    h = m * 60,
    d = h * 24,
    mo = d * 30;
  const mos = Math.floor(diff / mo);
  const days = Math.floor((diff % mo) / d);
  const hours = Math.floor((diff % d) / h);
  return `${mos}mos ${days}d ${hours}h ago`;
};

const shortAddr = (addr?: string) => {
  if (!addr) return "unknown";
  return addr.length > 10 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;
};

const DEFAULT_ICON = "/placeholder-token.png";
const DEFAULT_AVATAR = "/avatars/avatar1.png";

/**
 * Map API /leaderboard/top item -> LeaderItem (GIỮ UI)
 * API schema:
 * { rank, tokenAddress, name, symbol, subtitle, creatorAddress, marketCap, marketCapChange24h, volume24h, volumeChange24h, createdAt }
 */
const mapTopToLeader = (t: any): LeaderItem => {
  const address = String(t.tokenAddress || "");
  const name = String(t.symbol || t.name || "UNKNOWN");
  return {
    id: address || `${t.rank ?? ""}-${name}`,
    address,
    rank: Number(t.rank ?? 0),
    name,
    subtitle: t.subtitle ? String(t.subtitle) : undefined,
    icon: DEFAULT_ICON, // API không có icon => giữ UI, dùng placeholder
    creator: {
      handle: String(t.creatorAddress || "unknown"),
      avatar: DEFAULT_AVATAR, // API không có avatar => placeholder
    },
    mcapUsd: Number(t.marketCap ?? 0),
    vol24hUsd: Number(t.volume24h ?? 0),
    mcapChangePct: Number(t.marketCapChange24h ?? 0),
    volChangePct: Number(t.volumeChange24h ?? 0),
    createdAgo: timeAgo(t.createdAt),
    followers: "n/a",
  };
};

/**
 * Map API /leaderboard/list item -> LeaderItem (GIỮ UI)
 * API schema:
 * { rank, tokenAddress, name, symbol, creatorAddress, holders, marketCap, marketCapChange24h }
 */
const mapListToLeader = (t: any): LeaderItem => {
  const address = String(t.tokenAddress || "");
  const name = String(t.symbol || t.name || "UNKNOWN");
  return {
    id: address || `${t.rank ?? ""}-${name}`,
    address,
    rank: Number(t.rank ?? 0),
    name,
    subtitle: undefined,
    icon: DEFAULT_ICON,
    creator: {
      handle: String(t.creatorAddress || "unknown"),
      avatar: DEFAULT_AVATAR,
    },
    mcapUsd: Number(t.marketCap ?? 0),
    vol24hUsd: 0, // list schema không có volume => giữ UI, set 0
    mcapChangePct: Number(t.marketCapChange24h ?? 0),
    volChangePct: 0,
    createdAgo: "", // list schema không có createdAt => giữ UI, để rỗng
    followers:
      typeof t.holders === "number"
        ? t.holders
        : Number.isFinite(Number(t.holders))
        ? Number(t.holders)
        : "n/a",
  };
};

const LeaderboardPage: React.FC = () => {
  const [items, setItems] = useState<LeaderItem[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        // ✅ NEW API: top 3 cards
        const top = await getLeaderboardTop(3);
        const topMapped = (top || []).map(mapTopToLeader);

        // ✅ NEW API: table list (full)
        const listRes = await getLeaderboardList({
          limit: 50,
          sort: "marketCap",
          order: "desc",
        });

        const listMapped = (listRes?.items || []).map(mapListToLeader);

        // ✅ Keep UI behavior:
        // - cards lấy data.slice(0,3) => phải đảm bảo top 3 nằm trước
        // - table dùng data.map => cần merged list
        const topAddr = new Set(topMapped.map((x) => x.address));
        const merged = [
          ...topMapped,
          ...listMapped.filter((x) => x.address && !topAddr.has(x.address)),
        ];

        // fallback nếu BE trả thiếu rank: sort theo rank tăng dần
        merged.sort((a, b) => (a.rank || 0) - (b.rank || 0));

        setItems(merged);
      } catch (e) {
        console.error("Failed to load leaderboard:", e);
        setItems([]); // ✅ xoá mock fallback hoàn toàn
      }
    })();
  }, []);

  // ✅ Tắt loading khi route hoàn tất
  useEffect(() => {
    const done = () => setIsPageLoading(false);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);
    return () => {
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
    };
  }, [router.events]);

  // ✅ UI giữ nguyên: data = items (không mock)
  const data = useMemo(() => items, [items]);

  const handleBuyClick = (href: string, isExternal = false) => {
    setIsPageLoading(true);
    if (isExternal) {
      window.open(href, "_blank");
      setTimeout(() => setIsPageLoading(false), 300);
    } else {
      router.push(href);
    }
  };

  return (
    <Layout>
      <SEO title="Leaderboard" description="Top 15 trending tokens leaderboard" />

      {isPageLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <LoadingBar size="large" />
        </div>
      )}

      <div className="min-h-screen flex flex-col items-center justify-start py-10">
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-10 xl:px-16">
          <div className="w-full mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-left">
              Leaderboard
            </h1>
          </div>

          {/* ===== Top 3 Cards ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-10">
            {data.slice(0, 3).map((t) => {
              const href = `/token/${encodeURIComponent(t.address)}`;
              return (
                <article
                  key={t.id}
                  className="card relative overflow-hidden"
                  style={{
                    background:
                      "radial-gradient(120% 100% at 20% 0%, rgba(201,142,107,0.20), transparent 60%), radial-gradient(120% 120% at 100% 0%, rgba(121,201,181,0.16), transparent 60%), var(--card)",
                  }}
                >
                  <div className="absolute left-4 top-4 text-sm font-extrabold opacity-70">
                    #{String(t.rank).padStart(3, "0")}
                  </div>

                  <div className="flex items-center gap-4 mt-6">
                    <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[var(--card-border)] shrink-0">
                      <Image
                        src={t.icon || DEFAULT_ICON}
                        alt={t.name}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="text-xl font-extrabold leading-tight">{t.name}</div>
                      {t.subtitle && <div className="text-xs opacity-75">{t.subtitle}</div>}
                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                        <div>
                          mc {pctEl(t.mcapChangePct)}{" "}
                          <span className="ml-1">{usd(t.mcapUsd)}</span>
                        </div>
                        <div>
                          24h vol {pctEl(t.volChangePct)}{" "}
                          <span className="ml-1">{usd(t.vol24hUsd)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto">
                      <button onClick={() => handleBuyClick(href)} className="btn btn-primary">
                        buy
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-sm opacity-90">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--card-border)]">
                      <Image src={t.creator.avatar} width={32} height={32} alt="creator" />
                    </div>
                    <span className="opacity-70">by</span>
                    <span className="font-semibold">{shortAddr(t.creator.handle)}</span>
                    <span className="opacity-60">
                      {t.createdAgo ? `• ${t.createdAgo}` : ""}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ===== Table ===== */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 pt-5 pb-3 text-sm uppercase tracking-widest opacity-70">
              token
            </div>
            <div className="divide-y divide-[var(--card-border)]">
              {data.map((t) => {
                const href = `/token/${encodeURIComponent(t.address)}`;
                return (
                  <div
                    key={`row-${t.id}`}
                    className="grid grid-cols-12 items-center px-4 sm:px-6 py-4 hover:bg-[var(--card-hover)] transition-colors"
                  >
                    {/* token */}
                    <div className="col-span-5 flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden border border-[var(--card-border)] shrink-0">
                        <Image
                          src={t.icon || DEFAULT_ICON}
                          alt={t.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.name}</div>
                        <div className="text-xs opacity-70 truncate">
                          #{String(t.rank).padStart(3, "0")}
                        </div>
                      </div>
                    </div>

                    {/* creator */}
                    <div className="col-span-3 hidden sm:flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--card-border)]">
                        <Image src={t.creator.avatar} alt="creator" width={28} height={28} />
                      </div>
                      <span className="truncate">{shortAddr(t.creator.handle)}</span>
                    </div>

                    {/* followers */}
                    <div className="col-span-2 text-sm opacity-80">{t.followers ?? "n/a"}</div>

                    {/* mcap */}
                    <div className="col-span-1 text-right md:text-left text-sm font-semibold">
                      {usd(t.mcapUsd)}
                      <div className="text-xs opacity-70">{pctEl(t.mcapChangePct)}</div>
                    </div>

                    {/* buy */}
                    <div className="col-span-1 mt-3 md:mt-0 md:justify-self-end">
                      <button className="btn btn-secondary" onClick={() => handleBuyClick(href)}>
                        buy
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* ✅ Không đổi UI layout, chỉ thêm fallback text nhẹ (nếu muốn bỏ thì xoá block này) */}
              {data.length === 0 && (
                <div className="px-6 py-10 text-center opacity-70">No data</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LeaderboardPage;
