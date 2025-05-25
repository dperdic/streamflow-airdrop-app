import { distributorClient } from "@lib/constants";
import { useQuery } from "@tanstack/react-query";

export const useDistributor = (id: string | undefined) => {
  return useQuery({
    queryKey: ["distributor", id],
    queryFn: async () => {
      if (!id) {
        return null;
      }

      const [res] = await distributorClient.getDistributors({ ids: [id] });

      return res;
    },
    enabled: !!id,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
};
