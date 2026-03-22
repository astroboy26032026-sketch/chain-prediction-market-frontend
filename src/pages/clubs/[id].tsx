import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import {
  MOCK_CLUBS, MOCK_FEED, MOCK_MISSIONS, MOCK_WARS, MOCK_MEMBERS,
  type Club, type ClubFeedItem, type ClubMission, type ClubArenaWar, type ClubMember,
} from '@/constants/clubs-mock';
import {
  ArrowLeft, Users, Trophy, Flame, Shield, Crown, Swords, Target,
  MessageCircle, Star, Clock, ChevronRight, Heart, Reply, Share2,
  CheckCircle2, Circle, Lock, Zap, Award, TrendingUp,
} from 'lucide-react';

/* ─── helpers ─── */
function fmtNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function timeLeft(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const h = Math.floor(diff / 3_600_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return `${h}h ${m}m`;
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  owner: { label: '👑 Owner', color: 'text-yellow-400' },
  admin: { label: '🛡️ Admin', color: 'text-blue-400' },
  og: { label: '💎 OG', color: 'text-purple-400' },
  member: { label: 'Member', color: 'text-gray-400' },
};

type TabKey = 'feed' | 'wars' | 'missions' | 'leaderboard' | 'members';
const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'feed', label: 'Feed', icon: <MessageCircle size={14} /> },
  { key: 'wars', label: 'Arena Wars', icon: <Swords size={14} /> },
  { key: 'missions', label: 'Missions', icon: <Target size={14} /> },
  { key: 'leaderboard', label: 'Leaderboard', icon: <Trophy size={14} /> },
  { key: 'members', label: 'Members', icon: <Users size={14} /> },
];

export default function ClubDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [tab, setTab] = useState<TabKey>('feed');

  const club = useMemo(() => MOCK_CLUBS.find(c => c.id === id) ?? null, [id]);

  if (!club) {
    return (
      <Layout>
        <SEO title="Club Not Found" description="" />
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="text-gray-400 mb-4">Club not found</div>
          <button onClick={() => router.push('/clubs')} className="text-[var(--primary)] hover:underline">Back to Clubs</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEO title={`${club.name} — Clubs`} description={club.description} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => router.push('/clubs')} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-5 text-sm">
          <ArrowLeft size={15} /> Back to Clubs
        </button>

        {/* Banner + Club Info */}
        <div className="rounded-2xl overflow-hidden border border-[var(--card-border)] mb-6">
          <div className="h-32 sm:h-40 relative" style={{ background: club.banner }}>
            <div className="absolute inset-0 flex items-end px-6 pb-4">
              <div className="flex items-end gap-4 flex-1">
                <span className="text-5xl sm:text-6xl drop-shadow-xl">{club.avatar}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white">{club.name}</h1>
                    <span className="text-xs text-gray-400 font-mono">[{club.tag}]</span>
                    {!club.isPublic && <Lock size={14} className="text-gray-400" />}
                  </div>
                  <p className="text-xs text-gray-300/70 line-clamp-1 mt-0.5">{club.description}</p>
                </div>
              </div>
              <button
                className="shrink-0 px-5 py-2 rounded-xl text-sm font-bold text-white hover:scale-105 transition-transform"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                Join Club
              </button>
            </div>
          </div>

          {/* Stats bar */}
          <div className="bg-[var(--card)] px-6 py-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center text-xs">
            <StatMini label="Rank" value={`#${club.rank}`} color="text-yellow-400" />
            <StatMini label="Level" value={`Lv.${club.level}`} color="text-purple-400" />
            <StatMini label="Members" value={fmtNum(club.members)} />
            <StatMini label="Win Rate" value={`${club.winRate}%`} color="text-green-400" />
            <StatMini label="Arena W/L" value={`${club.arenaWins}/${club.arenaLosses}`} />
            <StatMini label="Weekly Pts" value={fmtNum(club.weeklyPoints)} color="text-[var(--primary)]" />
            <StatMini label="Total Pts" value={fmtNum(club.totalPoints)} color="text-[var(--primary)]" />
            <StatMini label="Streak" value={`${club.streak}W`} color={club.streak >= 3 ? 'text-orange-400' : undefined} />
          </div>
        </div>

        {/* Two-column: Left = Tabs content, Right = Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ──── LEFT: Main content ──── */}
          <div className="flex-1 min-w-0">
            {/* Tab bar */}
            <div className="flex bg-[var(--card2)] rounded-xl p-1 mb-5 overflow-x-auto">
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-1.5 flex-1 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap px-2 justify-center ${
                    tab === t.key ? 'text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
                  }`}
                  style={tab === t.key ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'feed' && <FeedTab />}
            {tab === 'wars' && <WarsTab clubName={club.name} clubAvatar={club.avatar} />}
            {tab === 'missions' && <MissionsTab />}
            {tab === 'leaderboard' && <LeaderboardTab />}
            {tab === 'members' && <MembersTab />}
          </div>

          {/* ──── RIGHT: Sidebar ──── */}
          <div className="w-full lg:w-[320px] shrink-0 space-y-5">
            {/* Club Info */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4">
              <span className="text-sm font-bold text-[var(--foreground)] block mb-3">About</span>
              <p className="text-xs text-gray-400 leading-relaxed mb-3">{club.description}</p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                <Crown size={12} className="text-yellow-400" />
                <span>Owner: <span className="text-white font-semibold">{club.ownerName}</span></span>
              </div>
              {club.linkedTokenName && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <Zap size={12} className="text-[var(--primary)]" />
                  <span>Token: <span className="text-[var(--primary)] font-semibold">{club.linkedTokenName}</span></span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock size={12} />
                <span>Created {timeAgo(club.createdAt)}</span>
              </div>
            </div>

            {/* Perks */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4">
              <span className="text-sm font-bold text-[var(--foreground)] block mb-3">Club Perks</span>
              <div className="space-y-2">
                {club.perks.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <Star size={12} className="text-yellow-400 shrink-0" />
                    <span className="text-gray-300">{p}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weekly Rankings */}
            <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4">
              <span className="text-sm font-bold text-[var(--foreground)] block mb-3">Weekly Top Contributors</span>
              <div className="space-y-2">
                {MOCK_MEMBERS.slice(0, 5).map((m, i) => (
                  <div key={m.address} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold w-4 ${i < 3 ? ['text-yellow-400', 'text-gray-300', 'text-orange-400'][i] : 'text-gray-500'}`}>
                        {i + 1}
                      </span>
                      <span className="text-white font-medium">{m.name}</span>
                    </div>
                    <span className="text-[var(--primary)] font-semibold">{fmtNum(m.points)} pts</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5">
              {club.tags.map(t => (
                <span key={t} className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[var(--card)] text-gray-400 border border-[var(--card-border)]">
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

/* ─── Sub-components ─── */

function StatMini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className={`text-sm font-bold ${color ?? 'text-white'}`}>{value}</div>
    </div>
  );
}

/* ─── Feed Tab ─── */
function FeedTab() {
  return (
    <div className="space-y-3">
      {/* Post input */}
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[var(--card2)] border border-[var(--card-border)] flex items-center justify-center text-gray-500 text-sm">?</div>
        <input
          type="text"
          placeholder="Post something to your club..."
          className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
        />
        <button
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white"
          style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
        >
          Post
        </button>
      </div>

      {MOCK_FEED.map(item => (
        <FeedCard key={item.id} item={item} />
      ))}
    </div>
  );
}

function FeedCard({ item }: { item: ClubFeedItem }) {
  const badge = ROLE_BADGE[item.authorRole];
  const isSys = item.type !== 'post';

  return (
    <div className={`bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 ${
      isSys ? 'border-l-2 border-l-[var(--primary)]' : ''
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-full bg-[var(--card2)] border border-[var(--card-border)] flex items-center justify-center text-xs">
          {item.authorRole === 'owner' ? '👑' : item.authorRole === 'admin' ? '🛡️' : item.authorRole === 'og' ? '💎' : '🐸'}
        </div>
        <span className="text-sm font-semibold text-white">{item.author}</span>
        <span className={`text-[10px] font-semibold ${badge.color}`}>{badge.label}</span>
        <span className="text-[10px] text-gray-500 ml-auto">{timeAgo(item.timestamp)}</span>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{item.content}</p>
      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
        <button className="flex items-center gap-1 hover:text-red-400 transition-colors"><Heart size={13} /> {item.likes}</button>
        <button className="flex items-center gap-1 hover:text-blue-400 transition-colors"><Reply size={13} /> {item.replies}</button>
        <button className="flex items-center gap-1 hover:text-[var(--primary)] transition-colors"><Share2 size={13} /> Share</button>
      </div>
    </div>
  );
}

/* ─── Arena Wars Tab ─── */
function WarsTab({ clubName, clubAvatar }: { clubName: string; clubAvatar: string }) {
  return (
    <div className="space-y-4">
      {MOCK_WARS.map(war => {
        const isWin = war.status === 'completed' && war.myClubScore > war.opponentScore;
        const isLoss = war.status === 'completed' && war.myClubScore < war.opponentScore;

        return (
          <div key={war.id} className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4">
            {/* Status badge */}
            <div className="flex items-center justify-between mb-3">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                war.status === 'live' ? 'bg-green-500/20 text-green-400' :
                war.status === 'upcoming' ? 'bg-yellow-500/20 text-yellow-400' :
                isWin ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {war.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                {war.status === 'live' ? 'LIVE' : war.status === 'upcoming' ? 'UPCOMING' : isWin ? 'VICTORY' : 'DEFEAT'}
              </span>
              <span className="text-[10px] text-gray-500">
                {war.status === 'live' ? timeLeft(war.endTime) + ' left' :
                 war.status === 'upcoming' ? 'Starts in ' + timeLeft(war.startTime) :
                 timeAgo(war.endTime)}
              </span>
            </div>

            {/* VS display */}
            <div className="flex items-center justify-center gap-4 mb-3">
              <div className="text-center flex-1">
                <span className="text-3xl">{clubAvatar}</span>
                <div className="text-xs font-bold text-white mt-1">{clubName}</div>
                <div className="text-lg font-extrabold text-[var(--primary)]">{fmtNum(war.myClubScore)}</div>
              </div>
              <div className="text-xl font-extrabold text-gray-500">VS</div>
              <div className="text-center flex-1">
                <span className="text-3xl">{war.opponentAvatar}</span>
                <div className="text-xs font-bold text-white mt-1">{war.opponentClub}</div>
                <div className="text-lg font-extrabold text-gray-400">{fmtNum(war.opponentScore)}</div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-6 text-[11px] text-gray-500">
              <span className="flex items-center gap-1"><Users size={12} /> {war.participants} fighters</span>
              <span className="flex items-center gap-1"><TrendingUp size={12} /> {war.totalBets} SOL bet</span>
            </div>

            {/* Action */}
            {war.status === 'live' && (
              <button
                className="w-full mt-3 py-2 rounded-xl text-xs font-bold text-white"
                style={{ backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
              >
                Join Battle
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Missions Tab ─── */
function MissionsTab() {
  return (
    <div className="space-y-3">
      {MOCK_MISSIONS.map(m => {
        const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
        const done = pct >= 100;

        return (
          <div key={m.id} className={`bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-4 ${done ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {done ? <CheckCircle2 size={16} className="text-green-400" /> : <Circle size={16} className="text-gray-500" />}
                <span className="text-sm font-bold text-white">{m.title}</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--primary)]/20 text-[var(--primary)]">
                +{m.reward} pts
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3 ml-6">{m.description}</p>

            {/* Progress bar */}
            <div className="ml-6">
              <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                <span>{m.progress} / {m.target}</span>
                <span>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--card2)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundImage: done ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, var(--primary), var(--accent))',
                  }}
                />
              </div>
              <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                <Clock size={10} /> {timeLeft(m.expiresAt)} left
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Leaderboard Tab ─── */
function LeaderboardTab() {
  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] overflow-hidden">
      <div className="grid grid-cols-[40px_1fr_80px_80px_60px] text-[10px] text-gray-500 font-semibold px-4 py-2.5 border-b border-[var(--card-border)]">
        <span>#</span>
        <span>Member</span>
        <span className="text-center">Points</span>
        <span className="text-center">Arena W</span>
        <span className="text-center">Streak</span>
      </div>
      {MOCK_MEMBERS.map((m, i) => {
        const badge = ROLE_BADGE[m.role];
        return (
          <div key={m.address} className="grid grid-cols-[40px_1fr_80px_80px_60px] items-center px-4 py-3 hover:bg-[var(--card2)] transition-colors text-sm">
            <span className={`font-bold text-xs ${i < 3 ? ['text-yellow-400', 'text-gray-300', 'text-orange-400'][i] : 'text-gray-500'}`}>
              {i + 1}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-white font-semibold text-xs truncate">{m.name}</span>
              <span className={`text-[9px] font-semibold ${badge.color}`}>{badge.label}</span>
            </div>
            <span className="text-center text-xs font-bold text-[var(--primary)]">{fmtNum(m.points)}</span>
            <span className="text-center text-xs text-green-400">{m.arenaWins}</span>
            <span className="text-center text-xs text-orange-400">{m.streak}d</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Members Tab ─── */
function MembersTab() {
  return (
    <div className="space-y-2">
      {MOCK_MEMBERS.map(m => {
        const badge = ROLE_BADGE[m.role];
        return (
          <div key={m.address} className="bg-[var(--card)] rounded-xl border border-[var(--card-border)] p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--card2)] border border-[var(--card-border)] flex items-center justify-center text-sm">
                {m.role === 'owner' ? '👑' : m.role === 'admin' ? '🛡️' : m.role === 'og' ? '💎' : '🐸'}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-white">{m.name}</span>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--card2)] ${badge.color}`}>{badge.label}</span>
                </div>
                <div className="text-[10px] text-gray-500 font-mono">{m.address}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-[var(--primary)]">{fmtNum(m.points)} pts</div>
              <div className="text-[10px] text-gray-500">Joined {timeAgo(m.joinedAt)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
