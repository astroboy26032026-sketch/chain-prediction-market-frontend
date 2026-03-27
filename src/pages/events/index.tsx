import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { useWallet } from '@solana/wallet-adapter-react';
import { toastError } from '@/utils/customToast';
import { MOCK_EVENTS, EventItem } from '@/data/events';
import { getZugarEvents } from '@/utils/zugarApi';

/* =========================
   Category tabs
========================= */
type EventCategory = 'all' | 'live' | 'upcoming';

const TABS: { key: EventCategory; emoji: string; label: string }[] = [
  { key: 'all',      emoji: '🧭', label: 'DISCOVER' },
  { key: 'live',     emoji: '🔥', label: 'LIVE' },
  { key: 'upcoming', emoji: '✨', label: 'UPCOMING' },
];

function daysLeft(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.ceil(diff / 86_400_000);
  return `${d}d left`;
}

export default function EventsListPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();
  const [category, setCategory] = useState<EventCategory>('all');
  const [events, setEvents] = useState<EventItem[]>(MOCK_EVENTS);

  // Fetch events from Zugar API (merge with local data for JSX icons)
  useEffect(() => {
    const status = category === 'all' ? undefined : category;
    getZugarEvents(status)
      .then(({ events: apiEvents }) => {
        if (!apiEvents?.length) return;
        // Map API events back to local data by ID for JSX icon support
        const merged = apiEvents.map((ae) => {
          const local = MOCK_EVENTS.find((e) => e.id === ae.id);
          return local ?? { ...ae, description: '', icon: <span className="text-2xl">{ae.icon}</span>, badgeColor: 'bg-pink-500', rewards: [], rules: [], joinRoute: null } as EventItem;
        });
        setEvents(merged);
      })
      .catch(() => { /* use fallback */ });
  }, [category]);

  const filtered = useMemo(() => {
    if (category === 'all') return events;
    return events.filter((e) => e.status === category);
  }, [category, events]);

  const handleJoin = (event: EventItem) => {
    if (!event.joinRoute) {
      router.push(`/events/${event.id}`);
      return;
    }
    const route = event.joinRoute;
    if (route === 'points' || route === 'points-trading') {
      if (!address) { toastError('Please connect your wallet first'); return; }
      router.push(`/point/${address}${route === 'points-trading' ? '?tab=trading' : ''}`);
    } else if (route === 'reward') {
      if (!address) { toastError('Please connect your wallet first'); return; }
      router.push(`/reward/${address}`);
    }
  };

  return (
    <Layout>
      <SEO title="Promote" description="Events, challenges & promotions on Zugar" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-center mb-6">🍬 Promote</h1>

        {/* Category tabs */}
        <div className="flex items-end gap-0 border-b border-[var(--card-border)] mb-6">
          {TABS.map(({ key, emoji, label }) => {
            const isActive = key === category;
            return (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={`
                  relative flex items-center gap-1.5 px-4 py-2.5
                  text-sm font-extrabold tracking-wide
                  transition-colors duration-200 whitespace-nowrap
                  focus:outline-none
                  ${isActive
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--foreground)]/50 hover:text-[var(--foreground)]/80'}
                `}
              >
                <span className="text-base leading-none">{emoji}</span>
                <span>{label}</span>
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full"
                    style={{ background: 'linear-gradient(90deg, var(--primary), var(--accent))' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Events grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((event) => (
              <div
                key={event.id}
                onClick={() => router.push(`/events/${event.id}`)}
                className="rounded-2xl border border-[var(--card-border)] bg-[var(--card)] p-5 cursor-pointer hover:border-[var(--primary)]/40 transition-colors group"
              >
                {/* Title row: icon + title + badge on one line */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(var(--primary-rgb,124,111,255),0.12)' }}>
                    {event.icon}
                  </div>
                  <h3 className="text-sm font-bold text-white truncate group-hover:text-[var(--primary)] transition-colors flex-1 min-w-0">
                    {event.title}
                  </h3>
                  {event.badge && (
                    <span className={`shrink-0 px-2 py-0.5 rounded text-[9px] font-extrabold text-white ${event.badgeColor}`}>
                      {event.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 line-clamp-2 mb-2">{event.subtitle}</p>

                <div className="text-[10px] text-gray-500">
                  {event.status === 'live'
                    ? `${event.participants.toLocaleString()} joined · ${daysLeft(event.endDate)}`
                    : `Starts ${new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
                  }
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {event.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-semibold border border-[var(--card-border)] text-gray-400">
                      {tag}
                    </span>
                  ))}
                </div>

                {event.status === 'live' && event.joinRoute && (
                  <div className="mt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleJoin(event); }}
                      className="w-full py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}
                    >
                      Join Now
                    </button>
                  </div>
                )}
              </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No events in this category</div>
        )}
      </div>
    </Layout>
  );
}
