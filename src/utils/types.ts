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

export type MintInfo = {
  mint: string;
  name?: string;
  symbol?: string;
  decimals: number;
};

export type ClaimData = {
  // used for claiming request
  proof: number[][];
  amountUnlocked: BN;
  amountLocked: BN;

  // used for displaying the total amount of tokens
  totalClaimed: BN;
  totalUnlocked: BN; // calculated based on startTs, endTs, unlockPeriod
  totalLocked: BN; // calculated based on startTs, endTs, unlockPeriod
  unlockPerPeriod: BN; // calculated based on totalAmount, amountUnlocked, startTs, endTs, unlockPeriod

  // blockchain results
  lockedAmountWithdrawn?: BN;
  closedTs?: BN;
  claimsCount?: number;
  nextClaimPeriod?: Date | null;
  canClaim: boolean;
};
