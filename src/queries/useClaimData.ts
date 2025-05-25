import { distributorClient } from "@lib/constants";
import { ClaimData } from "@lib/types";
import {
  buildClaimDataForCompressedClaim,
  buildClaimDataForNoClaim,
  buildClaimDataForVestedClaim,
  fetchClaimantDataFromAPI,
  getAirdropType,
} from "@lib/utils";
import { PublicKey } from "@solana/web3.js";
import {
  isCompressedClaimStatus,
  MerkleDistributor,
} from "@streamflow/distributor/solana";
import { useQuery } from "@tanstack/react-query";

export const useClaimData = (
  id: string | undefined,
  publicKey: PublicKey | null,
  distributor: MerkleDistributor | null | undefined
) => {
  return useQuery({
    queryKey: ["claimData", id, publicKey?.toString(), distributor],
    queryFn: async (): Promise<ClaimData | null> => {
      if (!id || !publicKey || !distributor) {
        return null;
      }

      const airdropType = getAirdropType(
        distributor.startTs,
        distributor.endTs
      );

      // Fetch claimant data from API
      const data = await fetchClaimantDataFromAPI(id, publicKey.toString());

      if (!data) {
        return null;
      }

      // Get existing claim from blockchain
      const [claim] = await distributorClient.getClaims([
        {
          id,
          recipient: publicKey.toString(),
        },
      ]);

      if (!claim) {
        // No claim PDA yet - calculate unlocked/locked amounts
        return buildClaimDataForNoClaim(data, distributor, airdropType);
      } else if (isCompressedClaimStatus(claim)) {
        // Claim already made, PDA compressed or closed
        return buildClaimDataForCompressedClaim(data);
      } else {
        // Vested claim, PDA exists
        return buildClaimDataForVestedClaim(data, claim, distributor);
      }
    },
    enabled: !!id && !!publicKey && !!distributor,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
