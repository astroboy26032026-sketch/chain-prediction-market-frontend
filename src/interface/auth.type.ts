// src/interface/auth.types.ts

/** I. POST /auth/wallet/challenge */
export type IssueChallengeRequest = {
  wallet: string;
  ref?: string;
};

export type IssueChallengeResponse = {
  nonce: string;
  expiresInSeconds: number;
  challenge: string;
  domain: string;
};

/** II. POST /auth/wallet/login */
export type LoginWalletRequest = {
  wallet: string;
  signature: string; // recommended: base64 signature of challenge bytes
};

export type LoginWalletResponse = {
  access_token: string;
  token_type: string; // usually "Bearer"
  isNewUser: boolean;
  userProfile: {
    walletAddress: string;
    createdAt: string; // ISO date string
  };
  expiresInSec: number;
};

/** III. GET /auth/me */
export type AuthMeResponse = {
  wallet: string;
  role: string;
  id: number;
  authenticated: boolean;
  address: string;
  expiresInSec: number;
};

/** IV. POST /auth/refresh */
export type RefreshAuthResponse = {
  jwt: string;
  expiresInSec: number;
};

/** V. POST /auth/logout */
export type LogoutAuthResponse = {
  ok: boolean;
};
