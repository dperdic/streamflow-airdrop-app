import { distributorClient } from "@lib/constants";
import { ClaimData } from "@lib/types";
import { useWallet } from "@solana/wallet-adapter-react";
import { SendTransactionError } from "@solana/web3.js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import BN from "bn.js";
import { toast } from "react-toastify";

export const useClaimAirdrop = (id: string | undefined) => {
  const { wallet } = useWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimData: ClaimData) => {
      if (!wallet || !id) throw new Error("Wallet or ID not available");

      const data = {
        id,
        proof: claimData.proof,
        amountUnlocked: new BN(claimData.amountUnlocked),
        amountLocked: new BN(claimData.amountLocked),
      };

      return await distributorClient.claim(data, {
        invoker: wallet.adapter as any,
      });
    },
    onSuccess: result => {
      toast.success(`Airdrop claimed successfully: ${result.txId}`);

      // Invalidate related queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ["distributor", id] });
      queryClient.invalidateQueries({ queryKey: ["claimData", id] });
    },
    onError: error => {
      console.error((error as SendTransactionError).message);
      toast.error("Airdrop claim failed");
    },
  });
};
