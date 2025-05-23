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
