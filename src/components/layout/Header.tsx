import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useEffect, useState } from "react";

export default function Header() {
  const [balance, setBalance] = useState(0);

  const { connection } = useConnection();
  const { publicKey } = useWallet();

  useEffect(() => {
    if (!publicKey) {
      setBalance(0);
      return;
    }

    connection.onAccountChange(
      publicKey,
      updatedAccountInfo => {
        setBalance(updatedAccountInfo.lamports / LAMPORTS_PER_SOL);
        console.log("account changed");
      },
      { commitment: "confirmed" }
    );

    connection.getAccountInfo(publicKey).then(info => {
      if (info) {
        setBalance(info.lamports / LAMPORTS_PER_SOL);
      }
    });
  }, [connection, publicKey]);

  return (
    <header className="fixed top-0 z-10 flex h-18 w-full border-b bg-white shadow-xs">
      <nav className="flex h-full w-full items-center justify-between gap-4 px-8 sm:px-16">
        <a href="/">
          <img src="/vite.svg" alt="Vite" className="size-10 cursor-pointer" />
        </a>
        <div className="flex gap-4">
          <span className="my-auto">Balance: {balance} SOL</span>
          <WalletMultiButton className="my-auto" />
        </div>
      </nav>
    </header>
  );
}
