import { Card } from "@components/ui/Card";
import {
  DigitalAsset,
  fetchDigitalAsset,
} from "@metaplex-foundation/mpl-token-metadata";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  ClaimStatus,
  isCompressedClaimStatus,
  MerkleDistributor,
} from "@streamflow/distributor/solana";
import { distributorClient, umi } from "@utils/constants";
import {
  formatDate,
  formatTokenAmount,
  getAirdropType,
  getNextClaimPeriod,
} from "@utils/functions";
import { ClaimantData } from "@utils/types";
import BN from "bn.js";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

export default function AirdropDetails() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, wallet } = useWallet();
  const { connection } = useConnection();

  const [distributor, setDistributor] = useState<MerkleDistributor | null>(
    null
  );
  const [asset, setAsset] = useState<DigitalAsset | null>(null);

  const [claimantData, setClaimantData] = useState<ClaimantData | null>(null);
  const [claimStatus, setClaimStatus] = useState<ClaimStatus | null>(null);
  const [canClaim, setCanClaim] = useState(false);
  const [nextClaimPeriod, setNextClaimPeriod] = useState<Date | null>(null);

  useEffect(() => {
    if (!id) return;

    distributorClient.getDistributors({ ids: [id] }).then(res => {
      setDistributor(res[0]);
    });
  }, [id]);

  const getBlockchainClaims = useCallback(async () => {
    if (!distributor || !publicKey || !id) return;

    const [claim] = await distributorClient.getClaims([
      {
        id,
        recipient: publicKey.toString(),
      },
    ]);

    if (claim === null) {
      setClaimStatus(null);
      setCanClaim(true);
    } else if (isCompressedClaimStatus(claim)) {
      setCanClaim(false);
    } else {
      setClaimStatus(claim);

      const nextPeriod = getNextClaimPeriod(
        distributor.startTs,
        distributor.endTs,
        distributor.unlockPeriod,
        claim.lastClaimTs
      );

      setNextClaimPeriod(nextPeriod);

      const now = new Date();

      if (nextPeriod && now >= nextPeriod) {
        setCanClaim(true);
      } else {
        setCanClaim(false);
      }
    }
  }, [distributor, publicKey, id]);

  const fetchClaimantData = useCallback(async () => {
    if (!id || !publicKey) return;

    try {
      // for instant airdrops to get the total amount
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
      const data = {
        id,
        proof: claimantData.proof,
        amountUnlocked: new BN(claimantData.amountUnlocked),
        amountLocked: new BN(claimantData.amountLocked),
      };

      const claimRes = await distributorClient.claim(data, {
        invoker: wallet.adapter as any,
      });

      toast.success(`Airdrop claimed successfully: ${claimRes.txId}`);
    } catch (_error) {
      toast.error("Airdrop claim failed");
    }
  }, [publicKey, id, wallet, claimantData]);

  const fetchMintInfo = useCallback(async () => {
    if (!connection || !distributor) return;

    try {
      const asset = await fetchDigitalAsset(umi, distributor.mint as any);

      setAsset(asset);
    } catch (_error) {
      // no metadata, can't fetch price but get the mint info
      const mintInfo = await connection.getAccountInfo(distributor.mint);

      console.log("mintInfo", mintInfo);
    }
  }, [connection, distributor]);

  useEffect(() => {
    fetchClaimantData();
    fetchMintInfo();
    getBlockchainClaims();
  }, [fetchClaimantData, fetchMintInfo, getBlockchainClaims]);

  if (!distributor) return <div>Loading...</div>;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Airdrop Details</h1>
        <h2 className="text-lg break-all">Distributor: {id}</h2>
        <h2 className="text-lg break-all">
          Mint: {distributor.mint.toString()}
        </h2>
      </div>

      <div className="flex flex-col justify-between gap-4 md:flex-row">
        <Card
          title="Airdrop type"
          value={getAirdropType(distributor.startTs, distributor.endTs)}
        />
        <Card title="Recipients" value={distributor.maxNumNodes.toString()} />
        <Card
          title="Recipients Claimed/Total"
          value={`${distributor.numNodesClaimed.toString()} / ${distributor.maxNumNodes.toString()}`}
        />
        <Card
          title="Amount claimed/Total"
          value={`${formatTokenAmount(
            distributor.totalAmountClaimed,
            asset?.mint.decimals ?? 9
          )} / ${formatTokenAmount(
            distributor.maxTotalClaim,
            asset?.mint.decimals ?? 9
          )}`}
        />
      </div>

      {publicKey ? (
        <>
          <div className="flex flex-col justify-between gap-4 md:flex-row">
            <Card title="Total" value={"0.1"} footer="$12.3" />
            <Card title="Unlocked" value={"0.01269"} footer="$1.1561" />
            <Card title="Claimed" value={"0.01269"} footer="$1.1561" />
            <Card title="Locked" value={"0.08731"} footer="$10.74" />
          </div>

          <>
            {canClaim ? (
              <div className="flex justify-center">
                <button
                  className="btn btn-md btn-black"
                  onClick={() => claimAirdrop()}
                >
                  Claim Airdrop
                </button>
              </div>
            ) : claimantData ? (
              <p className="text-center text-xl font-medium">
                Claiming is available {formatDate(nextClaimPeriod)}, come back
                later.
              </p>
            ) : (
              <p className="text-center text-xl font-medium">
                Not eligible for airdrop
              </p>
            )}
          </>
        </>
      ) : (
        <p className="text-center text-xl font-medium">
          Connect your wallet to check your eligibility for this airdrop.
        </p>
      )}
    </div>
  );
}
