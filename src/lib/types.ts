import BN from "bn.js";

export type Airdrop = {
  distributor: string;
  recipients: {
    claimed: BN;
    total: BN;
  };
  tokens: {
    claimed: BN;
    total: BN;
  };
  type: string;
};

export type ClaimantData = {
  chain: string;
  distributorAddress: string;
  address: number;
  amountUnlocked: string;
  amountLocked: string;
  amountClaimed: string;
  proof: number[][];
};

export type TokenInfo = {
  mint: string;
  name?: string;
  symbol?: string;
  decimals: number;
};

export type ClaimData = {
  proof: number[][];
  amountUnlocked: BN;
  amountLocked: BN;
  totalClaimed: BN;
  totalUnlocked: BN;
  totalLocked: BN;
  unlockPerPeriod: BN;
  claimsCount?: number;
  nextClaimPeriod?: Date | null;
  canClaim: boolean;
};
