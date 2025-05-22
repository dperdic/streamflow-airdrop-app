import { Card } from "@components/ui/Card";
import { Mint, unpackMint } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { MerkleDistributor } from "@streamflow/distributor/solana";
import { distributorClient } from "@utils/constants";
import { formatTokenAmount, isInstant } from "@utils/functions";
import { ClaimantData } from "@utils/types";
import { BN } from "bn.js";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

export default function AirdropDetails() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();

  const [claimantData, setClaimantData] = useState<ClaimantData | null>(null);
  const [mintData, setMintData] = useState<Mint | null>(null);
  const [distributor, setDistributor] = useState<MerkleDistributor | null>(
    null
  );

  useEffect(() => {
    if (!id) return;

    distributorClient.getDistributors({ ids: [id] }).then(res => {
      setDistributor(res[0]);
    });
  }, [id]);

  const fetchClaimantData = useCallback(async () => {
    if (!id || !publicKey) return;

    try {
      const response = await fetch(
        `https://staging-api-public.streamflow.finance/v2/api/airdrops/${id}/claimants/${publicKey.toString()}`
      );

      if (!response.ok) {
        setClaimantData(null);
        return;
      }

      const data: ClaimantData = await response.json();

      setClaimantData(data);
    } catch (_error) {
      toast.error("An error occurred while fetching claimant data");
      setClaimantData(null);
    }
  }, [id, publicKey]);

  const claimAirdrop = useCallback(async () => {
    if (!wallet || !publicKey || !id || !claimantData) return;

    try {
      const claimRes = await distributorClient.claim(
        {
          id,
          proof: claimantData.proof,
          amountUnlocked: new BN(claimantData.amountUnlocked),
          amountLocked: new BN(claimantData.amountLocked),
        },
        {
          invoker: wallet.adapter as any,
        }
      );

      console.log(claimRes);

      toast.success(`Airdrop claimed successfully: ${claimRes.txId}`);
    } catch (_error) {
      toast.error("Airdrop claim failed");
    }
  }, [publicKey, id, wallet, claimantData]);

  const fetchBatchMintInfo = useCallback(async () => {
    if (!connection || !distributor) return;

    const mintAccountInfo = await connection.getAccountInfo(
      new PublicKey(distributor.mint)
    );

    if (!mintAccountInfo) return;

    const mintData = unpackMint(distributor.mint, mintAccountInfo);

    setMintData(mintData);
  }, [connection, distributor]);

  // jup fetch price data, replace with pyth or switchboard
  const _fetchPriceData = useCallback(async () => {
    const priceResponse = await fetch(
      "https://lite-api.jup.ag/price/v2?ids=JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN,So11111111111111111111111111111111111111112,4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU,Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr"
    );

    const priceData = await priceResponse.json();

    console.log(priceData);
  }, []);

  useEffect(() => {
    fetchClaimantData();
    fetchBatchMintInfo();
  }, [fetchClaimantData, fetchBatchMintInfo]);

  console.log(claimantData);

  if (!distributor) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Airdrop Details</h1>
        <h2 className="text-lg break-all">{id}</h2>
      </div>

      {publicKey ? (
        <>
          {claimantData ? (
            <button
              className="btn btn-md btn-black"
              onClick={() => claimAirdrop()}
            >
              Claim Airdrop
            </button>
          ) : (
            <p className="text-red-500">Not eligible for airdrop</p>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-12">
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <Card
              title="Airdrop type"
              value={
                isInstant(distributor.startTs, distributor.endTs)
                  ? "Instant"
                  : "Timed"
              }
            />
            <Card
              title="Recipients"
              value={distributor.maxNumNodes.toString()}
            />
            <Card
              title="Recipients Claimed/Total"
              value={`${distributor.numNodesClaimed.toString()} / ${distributor.maxNumNodes.toString()}`}
            />
            <Card
              title="Amount claimed/Total"
              value={`${formatTokenAmount(
                distributor.totalAmountClaimed,
                mintData?.decimals ?? 9
              )} / ${formatTokenAmount(
                distributor.maxTotalClaim,
                mintData?.decimals ?? 9
              )}`}
            />
          </div>

          <p className="text-center text-xl font-medium">
            Connect your wallet to claim this airdrop.
          </p>
        </div>
      )}
    </div>
  );
}
