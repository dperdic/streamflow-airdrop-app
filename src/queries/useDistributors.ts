import { distributorClient } from "@lib/constants";
import { useQuery } from "@tanstack/react-query";

const useDistributors = () => {
  return useQuery({
    queryKey: ["distributors"],
    queryFn: () => distributorClient.searchDistributors({}),
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchInterval: 1000 * 60 * 5, // 5 minutes
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export default useDistributors;
