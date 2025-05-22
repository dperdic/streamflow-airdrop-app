import { ICluster } from "@streamflow/common";
import { SolanaDistributorClient } from "@streamflow/distributor/solana";

export const distributorClient = new SolanaDistributorClient({
  clusterUrl: import.meta.env.VITE_RPC_URL,
  cluster: ICluster.Devnet,
});
