import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/Layout';
import SEO from '@/components/seo/SEO';
import { ArrowLeft, Upload, Users, Lock, Globe, Zap, Trophy, Gift, TrendingUp, Crown, Percent } from 'lucide-react';
import toast from 'react-hot-toast';
import { type ClubCategory, CLUB_CATEGORIES } from '@/constants/clubs-mock';

const AVATARS = ['🐸', '🐕', '☀️', '🦍', '👑', '⚽', '🎌', '💩', '🐶', '🔍', '🔨', '⚪', '🦁', '🐉', '🎯', '⚔️', '🏴‍☠️', '🚀', '💎', '🎮'];

export default function CreateClubPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ClubCategory>('meme');
  const [isPublic, setIsPublic] = useState(true);
  const [avatar, setAvatar] = useState('🐸');
  const [linkedToken, setLinkedToken] = useState('');
  const [creating, setCreating] = useState(false);
  const [enableRewards, setEnableRewards] = useState(false);
  const [rewardDistribution, setRewardDistribution] = useState<'contribution' | 'equal' | 'rank'>('contribution');

  const canCreate = name.trim().length >= 3 && tag.trim().length >= 2 && description.trim().length >= 10;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    // TODO: integrate with BE when ready
    await new Promise(r => setTimeout(r, 1500));
    toast.success('Club created successfully!');
    setCreating(false);
    router.push('/clubs');
  };

  return (
    <Layout>
      <SEO title="Create Club" description="Create your own club or faction" />

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back */}
        <button onClick={() => router.push('/clubs')} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-5 text-sm">
          <ArrowLeft size={15} /> Back to Clubs
        </button>

        <h1 className="text-2xl font-extrabold text-[var(--primary)] mb-6">Create Club</h1>

        <div className="space-y-6">
          {/* Avatar picker */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5">
            <span className="text-sm font-bold text-[var(--foreground)] block mb-3">Club Avatar</span>
            <div className="flex items-center gap-4 mb-3">
              <span className="text-5xl">{avatar}</span>
              <div className="text-xs text-gray-400">Choose an avatar for your club</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                    avatar === a
                      ? 'ring-2 ring-[var(--primary)] bg-[var(--card2)] scale-110'
                      : 'bg-[var(--card2)] border border-[var(--card-border)] hover:scale-105'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Tag */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5 space-y-4">
            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-1.5">Club Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. PEPE Army"
                maxLength={30}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--card2)] border border-[var(--card-border)] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
              <div className="text-[10px] text-gray-500 mt-1 text-right">{name.length} / 30</div>
            </div>

            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-1.5">Club Tag *</label>
              <input
                type="text"
                value={tag}
                onChange={e => setTag(e.target.value.toUpperCase())}
                placeholder="e.g. PEPE"
                maxLength={6}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--card2)] border border-[var(--card-border)] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors font-mono"
              />
              <div className="text-[10px] text-gray-500 mt-1">2-6 characters, displayed as [{tag || '...'}]</div>
            </div>

            <div>
              <label className="text-sm font-bold text-[var(--foreground)] block mb-1.5">Description *</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Tell others what your club is about..."
                maxLength={200}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-[var(--card2)] border border-[var(--card-border)] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors resize-none"
              />
              <div className="text-[10px] text-gray-500 mt-1 text-right">{description.length} / 200</div>
            </div>
          </div>

          {/* Category */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5">
            <span className="text-sm font-bold text-[var(--foreground)] block mb-3">Category</span>
            <div className="flex flex-wrap gap-2">
              {CLUB_CATEGORIES.filter(c => c.value !== 'all').map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value as ClubCategory)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    category === c.value
                      ? 'text-white shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 bg-[var(--card2)] border border-[var(--card-border)]'
                  }`}
                  style={category === c.value ? { backgroundImage: 'linear-gradient(135deg, var(--primary), var(--accent))' } : undefined}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Linked token (optional) */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Zap size={14} className="text-[var(--primary)]" />
              <span className="text-sm font-bold text-[var(--foreground)]">Link Token (Optional)</span>
            </div>
            <p className="text-xs text-gray-500 mb-3">Link a token to your club. Holders get automatic badge and early supporter role.</p>
            <input
              type="text"
              value={linkedToken}
              onChange={e => setLinkedToken(e.target.value)}
              placeholder="Token mint address..."
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--card2)] border border-[var(--card-border)] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[var(--primary)] transition-colors font-mono"
            />
          </div>

          {/* Reward Participation */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5">
            <div className="flex items-center gap-2 mb-1.5">
              <Trophy size={14} className="text-[var(--primary)]" />
              <span className="text-sm font-bold text-[var(--foreground)]">Reward Participation</span>
            </div>
            <p className="text-xs text-gray-500 mb-4">Enable rewards so your club members automatically receive prizes from completed missions.</p>

            {/* Toggle */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setEnableRewards(true)}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  enableRewards ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--card-border)] bg-[var(--card2)]'
                }`}
              >
                <Gift size={20} className={enableRewards ? 'text-[var(--primary)]' : 'text-gray-500'} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${enableRewards ? 'text-white' : 'text-gray-400'}`}>Yes, enable rewards</div>
                  <div className="text-[10px] text-gray-500">Members earn auto-distributed prizes</div>
                </div>
              </button>
              <button
                onClick={() => setEnableRewards(false)}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  !enableRewards ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--card-border)] bg-[var(--card2)]'
                }`}
              >
                <Lock size={20} className={!enableRewards ? 'text-[var(--primary)]' : 'text-gray-500'} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${!enableRewards ? 'text-white' : 'text-gray-400'}`}>No rewards</div>
                  <div className="text-[10px] text-gray-500">Club for social / community only</div>
                </div>
              </button>
            </div>

            {/* Distribution options — shown only if rewards enabled */}
            {enableRewards && (
              <div className="border-t border-[var(--card-border)] pt-4">
                <span className="text-xs font-bold text-gray-300 block mb-3">How should rewards be distributed?</span>
                <div className="space-y-2">
                  {([
                    {
                      key: 'contribution' as const,
                      icon: <Percent size={16} />,
                      title: 'By Contribution %',
                      desc: 'Members who contribute more to missions get a larger share. Fair and motivating.',
                      example: 'e.g. Member A did 40% of mission work → gets 40% of reward pool',
                    },
                    {
                      key: 'equal' as const,
                      icon: <Users size={16} />,
                      title: 'Equal Split',
                      desc: 'All active members receive the same reward regardless of contribution.',
                      example: 'e.g. 10 active members → each gets 10% of reward pool',
                    },
                    {
                      key: 'rank' as const,
                      icon: <Crown size={16} />,
                      title: 'By Rank / Leaderboard',
                      desc: 'Top contributors on the leaderboard get the biggest share, descending by rank.',
                      example: 'e.g. #1 gets 30%, #2 gets 20%, #3 gets 15%, rest split remaining',
                    },
                  ]).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setRewardDistribution(opt.key)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        rewardDistribution === opt.key
                          ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                          : 'border-[var(--card-border)] bg-[var(--card2)] hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={rewardDistribution === opt.key ? 'text-[var(--primary)]' : 'text-gray-500'}>{opt.icon}</span>
                        <span className={`text-sm font-semibold ${rewardDistribution === opt.key ? 'text-white' : 'text-gray-400'}`}>
                          {opt.title}
                        </span>
                        {rewardDistribution === opt.key && (
                          <span className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-bold bg-[var(--primary)]/20 text-[var(--primary)]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 ml-6">{opt.desc}</p>
                      <p className="text-[10px] text-gray-600 ml-6 mt-1 italic">{opt.example}</p>
                    </button>
                  ))}
                </div>

                <div className="mt-4 p-3 rounded-xl bg-[var(--card2)] border border-[var(--card-border)]">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={12} className="text-[var(--primary)]" />
                    <span className="text-[10px] font-bold text-gray-300">Note</span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    Reward distribution method can be changed later by the club owner. Rewards are distributed automatically at the end of each mission cycle (weekly). Members must be active (completed at least 1 mission) to be eligible.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Privacy */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--card-border)] p-5">
            <span className="text-sm font-bold text-[var(--foreground)] block mb-3">Privacy</span>
            <div className="flex gap-3">
              <button
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isPublic ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--card-border)] bg-[var(--card2)]'
                }`}
              >
                <Globe size={20} className={isPublic ? 'text-[var(--primary)]' : 'text-gray-500'} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${isPublic ? 'text-white' : 'text-gray-400'}`}>Public</div>
                  <div className="text-[10px] text-gray-500">Anyone can join</div>
                </div>
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  !isPublic ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--card-border)] bg-[var(--card2)]'
                }`}
              >
                <Lock size={20} className={!isPublic ? 'text-[var(--primary)]' : 'text-gray-500'} />
                <div className="text-left">
                  <div className={`text-sm font-semibold ${!isPublic ? 'text-white' : 'text-gray-400'}`}>Private</div>
                  <div className="text-[10px] text-gray-500">Invite only</div>
                </div>
              </button>
            </div>
          </div>

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!canCreate || creating}
            className="btn btn-primary w-full py-3.5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              'Create Club'
            )}
          </button>
        </div>
      </div>
    </Layout>
  );
}
