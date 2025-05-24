import { Card } from "@components/ui/Card";
import { fetchDigitalAsset } from "@metaplex-foundation/mpl-token-metadata";
import { unpackMint } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { SendTransactionError } from "@solana/web3.js";
import {
  isCompressedClaimStatus,
  MerkleDistributor,
} from "@streamflow/distributor/solana";
import { distributorClient, umi } from "@utils/constants";
import {
  buildClaimDataForCompressedClaim,
  buildClaimDataForNoClaim,
  buildClaimDataForVestedClaim,
  fetchClaimantDataFromAPI,
  formatDate,
  formatTokenAmount,
  getAirdropType,
} from "@utils/functions";
import { ClaimData, TokenInfo } from "@utils/types";
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
  const [airdropType, setAirdropType] = useState<string | null>(null);
  const [mintInfo, setMintInfo] = useState<TokenInfo | null>(null);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);

  const fetchDistributor = useCallback(async () => {
    if (!id) return;

    const [res] = await distributorClient.getDistributors({ ids: [id] });

    if (res) {
      setDistributor(res);
      setAirdropType(getAirdropType(res.startTs, res.endTs));
    }
  }, [id]);

  const fetchClaimData = useCallback(async () => {
    if (!id || !publicKey || !distributor || !airdropType) return;

    try {
      // Fetch claimant data from API
      const data = await fetchClaimantDataFromAPI(id, publicKey.toString());

      if (!data) {
        setClaimData(null);
        return;
      }

      // Get existing claim from blockchain
      const [claim] = await distributorClient.getClaims([
        {
          id,
          recipient: publicKey.toString(),
        },
      ]);

      let claimData: ClaimData;

      if (!claim) {
        // No claim PDA yet - calculate unlocked/locked amounts
        claimData = buildClaimDataForNoClaim(data, distributor, airdropType);
      } else if (isCompressedClaimStatus(claim)) {
        // Claim already made, PDA compressed or closed
        claimData = buildClaimDataForCompressedClaim(data);
      } else {
        // Vested claim, PDA exists
        claimData = buildClaimDataForVestedClaim(data, claim, distributor);
      }

      setClaimData(claimData);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while fetching claim data");
      setClaimData(null);
    }
  }, [id, publicKey, distributor, airdropType]);

  const fetchMintInfo = useCallback(async () => {
    if (!connection || !distributor) return;

    try {
      const asset = await fetchDigitalAsset(umi, distributor.mint as any);

      setMintInfo({
        mint: asset.mint.publicKey.toString(),
        name: asset.metadata.name,
        symbol: asset.metadata.symbol,
        decimals: asset.mint.decimals,
      });
    } catch (_error) {
      // no metadata, can't fetch token name and symbol can get mint and decimals
      const mintAccountInfo = await connection.getAccountInfo(distributor.mint);

      if (mintAccountInfo) {
        const data = unpackMint(distributor.mint, mintAccountInfo);

        setMintInfo({
          mint: data.address.toString(),
          decimals: data.decimals,
        });
      }
    }
  }, [connection, distributor]);

  const claimAirdrop = async () => {
    if (!wallet || !publicKey || !id || !claimData) return;

    try {
      const data = {
        id,
        proof: claimData.proof,
        amountUnlocked: new BN(claimData.amountUnlocked),
        amountLocked: new BN(claimData.amountLocked),
      };

      const claimRes = await distributorClient.claim(data, {
        invoker: wallet.adapter as any,
      });

      toast.success(`Airdrop claimed successfully: ${claimRes.txId}`);
    } catch (error) {
      console.error((error as SendTransactionError).message);
      toast.error("Airdrop claim failed");
    } finally {
      fetchDistributor();
      fetchClaimData();
    }
  };

  useEffect(() => {
    fetchDistributor();
  }, [fetchDistributor]);

  useEffect(() => {
    fetchMintInfo();
    fetchClaimData();
  }, [fetchMintInfo, fetchClaimData]);

  if (!distributor)
    return (
      <div>
        <p className="text-center text-xl font-medium">Loading...</p>
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Airdrop Details</h1>
        <h2 className="text-lg break-all">Distributor: {id}</h2>
        <h2 className="text-lg break-all">Mint: {mintInfo?.mint.toString()}</h2>
        <h2 className="text-lg break-all">
          Token: {mintInfo?.name} ({mintInfo?.symbol})
        </h2>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-medium">Global Airdrop Details</h3>

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
              mintInfo?.decimals ?? 9
            )} / ${formatTokenAmount(
              distributor.maxTotalClaim,
              mintInfo?.decimals ?? 9
            )}`}
          />
        </div>
      </div>

      {publicKey ? (
        <>
          {claimData ? (
            <>
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-medium">Your Airdrop Details</h3>

                <div className="flex flex-col justify-between gap-4 md:flex-row">
                  <Card
                    title="Locked"
                    value={formatTokenAmount(
                      claimData.totalLocked,
                      mintInfo?.decimals ?? 9
                    )}
                    footer="$1.1561"
                  />
                  <Card
                    title="Unlocked"
                    value={formatTokenAmount(
                      claimData.totalUnlocked,
                      mintInfo?.decimals ?? 9
                    )}
                    footer="$1.1561"
                  />
                  <Card
                    title="Claimed"
                    value={formatTokenAmount(
                      claimData.totalClaimed,
                      mintInfo?.decimals ?? 9
                    )}
                    footer="$1.1561"
                  />
                  <Card
                    title="Total"
                    value={formatTokenAmount(
                      claimData.amountUnlocked.add(claimData.amountLocked),
                      mintInfo?.decimals ?? 9
                    )}
                    footer="$12.3"
                  />
                </div>

                {airdropType === "Vested" && (
                  <div className="flex flex-col justify-start gap-4 md:flex-row">
                    <Card
                      title="Unlocked per period"
                      value={formatTokenAmount(
                        claimData.unlockPerPeriod,
                        mintInfo?.decimals ?? 9
                      )}
                      footer="$12.3"
                    />
                    <Card
                      title="Claims limit"
                      value={
                        distributor.claimsLimit > 0
                          ? distributor.claimsLimit.toString()
                          : "No limit"
                      }
                    />
                  </div>
                )}
              </div>

              {claimData.canClaim && (
                <div className="flex justify-center">
                  <button
                    className="btn btn-md btn-black"
                    onClick={() => claimAirdrop()}
                  >
                    Claim
                  </button>
                </div>
              )}

              {claimData.nextClaimPeriod &&
                new Date(claimData.nextClaimPeriod) > new Date() && (
                  <p className="text-center text-xl font-medium">
                    Next claim is available{" "}
                    {formatDate(claimData.nextClaimPeriod)}, come back later.
                  </p>
                )}

              {claimData.claimsCount &&
                claimData.claimsCount === distributor.claimsLimit && (
                  <p className="text-center text-xl font-medium">
                    You have reached the maximum number of claims.
                  </p>
                )}

              {distributor.clawedBack && (
                <p className="text-center text-xl font-medium">
                  The airdrop has been clawed back - you can't claim anymore.
                </p>
              )}
            </>
          ) : (
            <p className="text-center text-xl font-medium">
              YOu are not eligible for this airdrop.
            </p>
          )}
        </>
      ) : (
        <p className="text-center text-xl font-medium">
          Connect your wallet to check you are eligible for this airdrop.
        </p>
      )}
    </div>
  );
}
