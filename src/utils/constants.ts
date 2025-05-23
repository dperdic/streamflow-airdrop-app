import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { ICluster } from "@streamflow/common";
import { SolanaDistributorClient } from "@streamflow/distributor/solana";

export const distributorClient = new SolanaDistributorClient({
  clusterUrl: import.meta.env.VITE_RPC_URL,
  cluster: ICluster.Devnet,
});

export const umi = createUmi(import.meta.env.VITE_RPC_URL, {
  commitment: "confirmed",
}).use(mplTokenMetadata());
