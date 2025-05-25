import { mplTokenMetadata } from "@metaplex-foundation/mpl-token-metadata";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { HermesClient } from "@pythnetwork/hermes-client";
import { ICluster } from "@streamflow/common";
import { SolanaDistributorClient } from "@streamflow/distributor/solana";

export const distributorClient = new SolanaDistributorClient({
  clusterUrl: import.meta.env.VITE_RPC_URL,
  cluster: ICluster.Devnet,
});

export const umi = createUmi(import.meta.env.VITE_RPC_URL, {
  commitment: "confirmed",
}).use(mplTokenMetadata());

export const hermesClient = new HermesClient("https://hermes.pyth.network/");
