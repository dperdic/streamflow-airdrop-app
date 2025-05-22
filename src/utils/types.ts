export type Airdrop = {
  distributor: string;
  numRecipients: number;
  amountInTokens: number;
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
