import { ReactNode } from "react";
import WalletContextProvider from "./WalletContextProvider";

export default function Providers({ children }: { children: ReactNode }) {
  return <WalletContextProvider>{children}</WalletContextProvider>;
}
