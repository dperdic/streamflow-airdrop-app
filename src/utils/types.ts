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
  // api results
  proof: number[][];

  // api results or blockchain results
  amountUnlocked: BN;
  amountLocked: BN;

  // blockchain results
  lastClaimTs?: BN;
  lastAmountPerUnlock?: BN;
  lockedAmountWithdrawn?: BN;
  closedTs?: BN;

  nextClaimPeriod?: Date | null;

  canClaim: boolean;
};
