// src/utils/zugarApi.ts — Zugar Mock API client
import axios from 'axios';

const ZUGAR_BASE = process.env.NEXT_PUBLIC_ZUGAR_API_URL || 'http://localhost:4000';

const zugarClient = axios.create({
  baseURL: ZUGAR_BASE,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Points ───
export type ZugarLeaderboardEntry = {
  rank: number;
  user: string;
  avatar: string;
  points: number;
};

export async function getZugarPointsLeaderboard(page = 1): Promise<{
  entries: ZugarLeaderboardEntry[];
  page: number;
  totalPages: number;
}> {
  const { data } = await zugarClient.get('/zugar/points/leaderboard', { params: { page } });
  return data;
}

// ─── Rewards ───
export type ZugarRewardInfo = {
  tickets: number;
  points: number;
  claimableSol: number;
};

export async function getZugarRewardInfo(): Promise<ZugarRewardInfo> {
  const { data } = await zugarClient.get('/zugar/rewards/info');
  return data;
}

export type ZugarMysteryBox = {
  id: string;
  name: string;
  cost: number;
  emoji: string;
  prizes: string[];
};

export async function getZugarRewardBoxes(): Promise<{ boxes: ZugarMysteryBox[] }> {
  const { data } = await zugarClient.get('/zugar/rewards/boxes');
  return data;
}

export async function openZugarBox(boxId: string): Promise<{
  boxId: string;
  boxName: string;
  prize: string;
  isSol: boolean;
}> {
  const { data } = await zugarClient.post('/zugar/rewards/open-box', { boxId });
  return data;
}

export async function claimZugarReward(): Promise<{ success: boolean; claimedSol: number; message: string }> {
  const { data } = await zugarClient.post('/zugar/rewards/claim');
  return data;
}

export async function getZugarRecentOpens(limit = 10): Promise<{
  opens: { user: string; box: string; prize: string; time: string }[];
}> {
  const { data } = await zugarClient.get('/zugar/rewards/recent-opens', { params: { limit } });
  return data;
}

// ─── Referral ───
export type ZugarReferralStats = {
  totalReferrals: number;
  totalVolume: number;
  unclaimedRewards: number;
};

export async function getZugarReferralStats(): Promise<ZugarReferralStats> {
  const { data } = await zugarClient.get('/zugar/referral/stats');
  return data;
}

export async function getZugarReferralList(): Promise<{
  referrals: { date: string; wallet: string; volume: number; reward: number }[];
}> {
  const { data } = await zugarClient.get('/zugar/referral/list');
  return data;
}

export async function createZugarReferralLink(linkName?: string): Promise<{ link: string; success: boolean }> {
  const { data } = await zugarClient.post('/zugar/referral/create-link', { linkName });
  return data;
}

export async function claimZugarReferral(): Promise<{ success: boolean; claimedSol: number }> {
  const { data } = await zugarClient.post('/zugar/referral/claim');
  return data;
}

// ─── Events ───
export type ZugarEvent = {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  badge: string;
  status: string;
  startDate: string;
  endDate: string;
  participants: number;
  tags: string[];
};

export async function getZugarEvents(status?: string): Promise<{ events: ZugarEvent[] }> {
  const { data } = await zugarClient.get('/zugar/events', { params: status ? { status } : {} });
  return data;
}

