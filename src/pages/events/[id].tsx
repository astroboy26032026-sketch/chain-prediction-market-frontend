import React from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { useWallet } from '@solana/wallet-adapter-react';
import { toastError } from '@/utils/customToast';
import { MOCK_EVENTS } from '@/data/events';

const SPACE_GRADIENT = 'linear-gradient(135deg, #0a0e1a 0%, #111827 50%, #0d1220 100%)';

function formatDate(d: string) {
  const date = new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function daysLeft(end: string) {
  const diff = new Date(end).getTime() - Date.now();
  if (diff <= 0) return 'Ended';
  const d = Math.ceil(diff / 86_400_000);
  return `${d}d left`;
}

export default function EventDetailPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const address = publicKey?.toBase58();
  const { id } = router.query;

  const event = MOCK_EVENTS.find(e => e.id === id);

  if (!event) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="text-4xl mb-4">🌌</div>
            <p className="opacity-60">Promote not found</p>
            <button onClick={() => router.push('/events')} className="mt-4 btn btn-primary px-4 py-2 text-sm">Back to Promote</button>
          </div>
        </div>
      </Layout>
    );
  }

  const statusColor = event.status === 'live' ? 'text-green-400' : 'text-yellow-400';
  const statusLabel = event.status === 'live' ? '● Live Now' : 'Coming Soon';

  const handleJoin = () => {
    if (!event.joinRoute) return;
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
      <SEO title={event.title} description={event.subtitle} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <button onClick={() => router.push('/events')} className="flex items-center gap-1.5 text-sm opacity-50 hover:opacity-80 transition-opacity mb-6">
          ← Back to Promote
        </button>

        {/* Header card */}
        <div className="rounded-2xl border border-white/10 overflow-hidden mb-6"
          style={{ background: SPACE_GRADIENT }}
        >
          <div className="px-6 py-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
                {event.icon}
              </div>
              <div>
                {event.badge && (
                  <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold text-white ${event.badgeColor} mb-2`}>
                    {event.badge}
                  </span>
                )}
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">{event.title}</h1>
                <p className="text-sm text-gray-400 mt-1">{event.subtitle}</p>
                <div className={`mt-2 text-xs font-semibold ${statusColor}`}>{statusLabel}</div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 border-t border-white/5">
            <div className="px-5 py-4 border-r border-white/5 text-center">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Participants</div>
              <div className="text-lg font-extrabold" style={{ color: 'var(--primary)' }}>{event.participants.toLocaleString()}</div>
              {event.maxParticipants && <div className="text-[10px] opacity-40">/ {event.maxParticipants.toLocaleString()} max</div>}
            </div>
            <div className="px-5 py-4 border-r border-white/5 text-center">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Duration</div>
              <div className="text-xs font-semibold">{formatDate(event.startDate)}</div>
              <div className="text-[10px] opacity-40">→ {formatDate(event.endDate)}</div>
            </div>
            <div className="px-5 py-4 text-center">
              <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Time Left</div>
              <div className={`text-lg font-extrabold ${statusColor}`}>
                {event.status === 'upcoming' ? 'Not yet' : daysLeft(event.endDate)}
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl border border-white/10 p-5 mb-4" style={{ background: SPACE_GRADIENT }}>
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">About</div>
          <p className="text-sm text-gray-300 leading-relaxed">{event.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {event.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-semibold border border-white/10 opacity-60">{tag}</span>
            ))}
          </div>
        </div>

        {/* Step cards: Rewards + Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Rewards */}
          <div className="rounded-2xl border border-white/10 p-5" style={{ background: SPACE_GRADIENT }}>
            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">Rewards</div>
            <div className="space-y-2.5">
              {event.rewards.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold"
                    style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', color: '#fff' }}>
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-300 pt-0.5">{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rules */}
          <div className="rounded-2xl border border-white/10 p-5" style={{ background: SPACE_GRADIENT }}>
            <div className="text-[10px] uppercase tracking-widest opacity-40 mb-3">Rules</div>
            <div className="space-y-2.5">
              {event.rules.map((r, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-extrabold border border-white/15 opacity-60">
                    {i + 1}
                  </div>
                  <span className="text-sm text-gray-400 pt-0.5">{r}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
