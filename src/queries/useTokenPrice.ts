import { fetchJupiterPrice, fetchPythPrice } from "@lib/utils";
import { useQuery } from "@tanstack/react-query";

export const useTokenPrice = (
  tokenSymbol: string | undefined,
  tokenMint: string | undefined
) => {
  return useQuery({
    queryKey: ["tokenPrice", tokenSymbol, tokenMint],
    queryFn: async () => {
      let priceFeed: "pyth" | "jupiter" | null = null;
      let price = null;

      if (tokenSymbol) {
        price = await fetchPythPrice(tokenSymbol);

        priceFeed = "pyth" as const;
      } else if (price === null && tokenMint) {
        price = await fetchJupiterPrice(tokenMint);

        priceFeed = "jupiter" as const;
      }

      return {
        priceFeed,
        price,
      };
    },
    enabled: !!(tokenSymbol || tokenMint),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
