import { distributorClient } from "@lib/constants";
import { useQuery } from "@tanstack/react-query";

export const useDistributors = () => {
  return useQuery({
    queryKey: ["distributors"],
    queryFn: () => distributorClient.searchDistributors({}),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 60 * 2, // 2 minutes
  });
};
