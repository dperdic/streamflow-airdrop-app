import { umi } from "@lib/constants";
import { TokenInfo } from "@lib/types";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { unpackMint } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMintStore } from "@store/mintStore";
import { useQuery } from "@tanstack/react-query";

export const useTokenInfo = (mint: PublicKey | undefined) => {
  const { connection } = useConnection();
  const { getMintInfo } = useMintStore();

  return useQuery({
    queryKey: ["tokenInfo", mint?.toString()],
    queryFn: async (): Promise<TokenInfo | null> => {
      if (!connection || !mint) {
        return null;
      }

      // Try to fetch metadata first
      try {
        const asset = await fetchDigitalAsset(umi, mint as any);

        return {
          mint: asset.mint.publicKey.toString(),
          name: asset.metadata.name,
          symbol: asset.metadata.symbol,
          decimals: asset.mint.decimals,
        };
      } catch (_error) {
        // No metadata, check mint store first
        const mintInfo = getMintInfo(mint.toString());

        if (mintInfo) {
          return {
            mint: mintInfo.publicKey.toString(),
            decimals: mintInfo.decimals,
          };
        }

        // Fetch from account info
        const mintAccountInfo = await connection.getAccountInfo(mint);

        if (mintAccountInfo) {
          const data = unpackMint(mint, mintAccountInfo);
          return {
            mint: data.address.toString(),
            decimals: data.decimals,
          };
        }
      }

      return null;
    },
    enabled: !!connection && !!mint,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
