import { fetchMintInfo } from "@lib/utils";
import { Connection, PublicKey } from "@solana/web3.js";
import { create } from "zustand";

interface MintInfo {
  publicKey: PublicKey;
  decimals: number;
}

interface MintStore {
  mintCache: Map<string, MintInfo>;
  loading: Set<string>;
  fetchMintInfo: (mints: PublicKey[], connection: Connection) => Promise<void>;
  getMintInfo: (mintAddress: string) => MintInfo | undefined;
  clearCache: () => void;
}

export const useMintStore = create<MintStore>((set, get) => ({
  mintCache: new Map(),
  loading: new Set(),

  fetchMintInfo: async (mints: PublicKey[], connection: Connection) => {
    const { mintCache, loading } = get();

    // Filter out mints that are already cached or currently being fetched
    const uncachedMints = mints.filter(mint => {
      const mintStr = mint.toString();
      return !mintCache.has(mintStr) && !loading.has(mintStr);
    });

    if (uncachedMints.length === 0) return;

    // Mark mints as loading
    const newLoading = new Set(loading);
    uncachedMints.forEach(mint => newLoading.add(mint.toString()));
    set({ loading: newLoading });

    try {
      const mintInfoResults = await fetchMintInfo(uncachedMints, connection);

      // Update cache with results
      const newCache = new Map(mintCache);
      mintInfoResults.forEach(mintInfo => {
        if (mintInfo) {
          newCache.set(mintInfo.publicKey.toString(), mintInfo);
        }
      });

      // Remove from loading
      const updatedLoading = new Set(newLoading);
      uncachedMints.forEach(mint => updatedLoading.delete(mint.toString()));

      set({
        mintCache: newCache,
        loading: updatedLoading,
      });
    } catch (error) {
      console.error("Failed to fetch mint info:", error);

      // Remove from loading even on error
      const updatedLoading = new Set(loading);
      uncachedMints.forEach(mint => updatedLoading.delete(mint.toString()));
      set({ loading: updatedLoading });
    }
  },

  getMintInfo: (mintAddress: string) => {
    return get().mintCache.get(mintAddress);
  },

  clearCache: () => {
    set({ mintCache: new Map(), loading: new Set() });
  },
}));
