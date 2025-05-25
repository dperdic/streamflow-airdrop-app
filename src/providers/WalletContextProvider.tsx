import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { ReactNode } from "react";

const getEndpoint = (): string => {
  const rpcUrl = import.meta.env.VITE_RPC_URL;

  return rpcUrl;
};

export default function WalletContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const endpoint = getEndpoint();

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect={true}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
