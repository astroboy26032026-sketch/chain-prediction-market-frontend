import React, { useEffect, useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import SEO from "@/components/seo/SEO";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { getAllTokensTrends } from "@/utils/api";
import { Token } from "@/interface/types";
import LoadingBar from "@/components/ui/LoadingBar";

/* =========================
   Types
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
   Mock data fallback
========================= */
const MOCK_TOP: LeaderItem[] = [
  {
    id: "kuma",
    address: "kuma_address",
    rank: 1,
    name: "KUMA",
    subtitle: "Captain KUMA",
    icon: "/tokens/kuma.png",
    creator: { handle: "6LuR...rsWe", avatar: "/avatars/avatar1.png" },
    mcapUsd: 7084300,
    vol24hUsd: 9896.67,
    mcapChangePct: 3.54,
    volChangePct: 48.45,
    createdAgo: "5mos 16d 4h ago",
    followers: 12450,
  },
  {
    id: "fumble",
    address: "fumble_address",
    rank: 2,
    name: "FUMBLE",
    subtitle: "Fucked Up My Bag Lost Everything",
    icon: "/tokens/fumble.png",
    creator: { handle: "H3qx...7imC", avatar: "/avatars/avatar2.png" },
    mcapUsd: 2348200,
    vol24hUsd: 0,
    mcapChangePct: 0,
    volChangePct: 0,
    createdAgo: "3mos 12d 2h ago",
    followers: "n/a",
  },
  {
    id: "dachu",
    address: "dachu_address",
    rank: 3,
    name: "DACHU",
    subtitle: "DACHU THE CHEF",
    icon: "/tokens/dachu.png",
    creator: { handle: "BJno...rDvQ", avatar: "/avatars/avatar3.png" },
    mcapUsd: 551890,
    vol24hUsd: 4.34,
    mcapChangePct: -3.29,
    volChangePct: 100,
    createdAgo: "1mos 3d 9h ago",
    followers: 3911,
  },
];

/* =========================
   Helpers
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

const mapTokenToLeader = (t: Token, rank: number): LeaderItem => {
  const name = (t as any).symbol || (t as any).name || t.id || "UNKNOWN";
  const icon = (t as any).image || (t as any).logo || "/placeholder-token.png";
  const creatorHandle =
    (t as any).creatorHandle ||
    (t as any).creator ||
    (t as any).owner ||
    (t as any).deployer ||
    "unknown";
  const creatorAvatar = (t as any).creatorAvatar || "/avatars/avatar1.png";
  const mcap = Number((t as any).marketcapUsd) || 0;
  const vol24 = Number((t as any).volume24hUsd) || 0;

  return {
    id: t.id,
    address: (t as any).address || t.id,
    rank,
    name,
    subtitle: (t as any).tagline || (t as any).subtitle || undefined,
    icon,
    creator: { handle: String(creatorHandle), avatar: creatorAvatar },
    mcapUsd: mcap,
    vol24hUsd: vol24,
    mcapChangePct: Number((t as any).mcapChangePct ?? 0),
    volChangePct: Number((t as any).volChangePct ?? 0),
    createdAgo: timeAgo((t as any).createdAt),
    followers:
      typeof (t as any).followers === "number"
        ? (t as any).followers
        : (t as any).followers === "n/a"
        ? "n/a"
        : undefined,
  };
};

/* =========================
   Page
========================= */
const LeaderboardPage: React.FC = () => {
  const [items, setItems] = useState<LeaderItem[]>([]);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const tokens = await getAllTokensTrends();
        const mapped = tokens
          .filter((t) => !!t)
          .slice(0, 15)
          .map((t, i) => mapTokenToLeader(t, i + 1));
        setItems(mapped);
      } catch (e) {
        console.error("Failed to load leaderboard:", e);
        setItems(MOCK_TOP);
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

  const data = useMemo(() => (items.length > 0 ? items : MOCK_TOP), [items]);

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
                        src={t.icon || "/placeholder-token.png"}
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
                          mc {pctEl(t.mcapChangePct)} <span className="ml-1">{usd(t.mcapUsd)}</span>
                        </div>
                        <div>
                          24h vol {pctEl(t.volChangePct)} <span className="ml-1">{usd(t.vol24hUsd)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-auto">
                      <button
                        onClick={() => handleBuyClick(href)}
                        className="btn btn-primary"
                      >
                        buy
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-3 text-sm opacity-90">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-[var(--card-border)]">
                      <Image src={t.creator.avatar} width={32} height={32} alt="creator" />
                    </div>
                    <span className="opacity-70">by</span>
                    <span className="font-semibold">{t.creator.handle}</span>
                    <span className="opacity-60">• {t.createdAgo}</span>
                  </div>
                </article>
              );
            })}
          </div>

          {/* ===== Table ===== */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 pt-5 pb-3 text-sm uppercase tracking-widest opacity-70">token</div>
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
                          src={t.icon || "/placeholder-token.png"}
                          alt={t.name}
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{t.name}</div>
                        <div className="text-xs opacity-70 truncate">#{String(t.rank).padStart(3, "0")}</div>
                      </div>
                    </div>

                    {/* creator */}
                    <div className="col-span-3 hidden sm:flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full overflow-hidden border border-[var(--card-border)]">
                        <Image src={t.creator.avatar} alt="creator" width={28} height={28} />
                      </div>
                      <span className="truncate">{t.creator.handle}</span>
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
                      <button
                        className="btn btn-secondary"
                        onClick={() => handleBuyClick(href)}
                      >
                        buy
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LeaderboardPage;
