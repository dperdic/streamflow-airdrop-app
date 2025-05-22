import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";
import WalletContextProvider from "./WalletContextProvider";

const queryClient = new QueryClient();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WalletContextProvider>{children}</WalletContextProvider>
    </QueryClientProvider>
  );
}
