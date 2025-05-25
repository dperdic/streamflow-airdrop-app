import { fetchJupiterPrice, fetchPythPrice } from "@lib/utils";
import { useQuery } from "@tanstack/react-query";

export const useTokenPrice = (
  tokenSymbol: string | undefined,
  tokenMint: string | undefined
) => {
  return useQuery({
    queryKey: ["tokenPrice", tokenSymbol, tokenMint],
    queryFn: async () => {
      if (tokenSymbol) {
        const price = await fetchPythPrice(tokenSymbol);

        return {
          priceFeed: "pyth" as const,
          price,
        };
      } else if (tokenMint) {
        const price = await fetchJupiterPrice(tokenMint);

        return {
          priceFeed: "jupiter" as const,
          price,
        };
      }

      return {
        priceFeed: null,
        price: null,
      };
    },
    enabled: !!(tokenSymbol || tokenMint),
    staleTime: 1000 * 30, // 30 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
