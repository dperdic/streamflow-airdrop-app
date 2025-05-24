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
  formatDate,
  formatTokenAmount,
  getAirdropType,
  getAmountUnlockedPerPeriod,
  getNextClaimPeriod,
  getUnlockedAndLockedAmount,
} from "@utils/functions";
import { ClaimantData, ClaimData, MintInfo } from "@utils/types";
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
  const [mintInfo, setMintInfo] = useState<MintInfo | null>(null);
  const [claimData, setClaimData] = useState<ClaimData | null>(null);

  // done
  const fetchDistributor = useCallback(async () => {
    if (!id) return;
    console.log("called");

    const [res] = await distributorClient.getDistributors({ ids: [id] });

    if (res) {
      setDistributor(res);
      setAirdropType(getAirdropType(res.startTs, res.endTs));
    }
  }, [id]);

  // const getBlockchainClaims = useCallback(async () => {
  //   if (!distributor || !publicKey || !id) return;

  //   const [claim] = await distributorClient.getClaims([
  //     {
  //       id,
  //       recipient: publicKey.toString(),
  //     },
  //   ]);

  //   console.log("claim", claim);

  //   if (claim === null) {
  //     setClaimStatus(null);
  //     setCanClaim(true);
  //   } else if (isCompressedClaimStatus(claim)) {
  //     setCanClaim(false);
  //   } else {
  //     const claimLog = {
  //       ...claim,
  //       lockedAmount: claim.lockedAmount.toString(10),
  //       lockedAmountWithdrawn: claim.lockedAmountWithdrawn.toString(10),
  //       unlockedAmount: claim.unlockedAmount.toString(10),
  //       lastClaimTs: claim.lastClaimTs.toString(10),
  //       lastAmountPerUnlock: claim.lastAmountPerUnlock.toString(10),
  //       closedTs: claim.closedTs.toString(10),
  //     };

  //     console.log("claimLog", claimLog);

  //     setClaimStatus(claim);

  //     const nextPeriod = getNextClaimPeriod(
  //       distributor.startTs,
  //       distributor.endTs,
  //       distributor.unlockPeriod,
  //       claim.lastClaimTs
  //     );

  //     setNextClaimPeriod(nextPeriod);

  //     const now = new Date();

  //     if (nextPeriod && now >= nextPeriod) {
  //       setCanClaim(true);
  //     } else {
  //       setCanClaim(false);
  //     }
  //   }
  // }, [distributor, publicKey, id]);

  // const fetchClaimantData = useCallback(async () => {
  //   if (!id || !publicKey) return;

  //   try {
  //     // for instant airdrops to get the total amount
  //     const response = await fetch(
  //       `https://staging-api-public.streamflow.finance/v2/api/airdrops/${id}/claimants/${publicKey.toString()}`
  //     );

  //     if (!response.ok) {
  //       setClaimantData(null);
  //       return;
  //     }

  //     const data: ClaimantData = await response.json();

  //     console.log("claimantData", data);

  //     setClaimantData(data);
  //   } catch (_error) {
  //     toast.error("An error occurred while fetching claimant data");
  //     setClaimantData(null);
  //   }
  // }, [id, publicKey]);

  const fetchClaimData = useCallback(async () => {
    if (!id || !publicKey || !distributor || !airdropType) return;

    const claimData: ClaimData = {
      proof: [],
      amountUnlocked: new BN(0),
      amountLocked: new BN(0),
      totalUnlocked: new BN(0),
      totalLocked: new BN(0),
      canClaim: false,
      totalClaimed: new BN(0),
      unlockPerPeriod: new BN(0),
    };

    let data: ClaimantData;

    try {
      const response = await fetch(
        `https://staging-api-public.streamflow.finance/v2/api/airdrops/${id}/claimants/${publicKey.toString()}`
      );

      if (!response.ok) {
        setClaimData(null);
        return;
      }

      data = await response.json();

      if (data === null) {
        setClaimData(null);
        return;
      }

      claimData.proof = data.proof;

      if (airdropType === "Instant") {
        claimData.amountUnlocked = new BN(data.amountUnlocked);
        claimData.amountLocked = new BN(data.amountLocked);
        claimData.unlockPerPeriod = new BN(data.amountUnlocked);
        claimData.canClaim = true;
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while fetching claimant data");
      setClaimData(null);
      return;
    }

    try {
      const [claim] = await distributorClient.getClaims([
        {
          id,
          recipient: publicKey.toString(),
        },
      ]);

      console.log("claim", claim);
      console.log("distributor", distributor);

      // it is null if the user has not claimed yet if the airdrop is instant or vested
      if (claim === null) {
        claimData.amountUnlocked = new BN(data.amountUnlocked);
        claimData.amountLocked = new BN(data.amountLocked);
        claimData.totalUnlocked = new BN(data.amountUnlocked);
        claimData.totalLocked = new BN(data.amountLocked);
        claimData.totalClaimed = new BN(0);
        claimData.nextClaimPeriod = new Date(
          distributor.startTs.mul(new BN(1000)).toNumber()
        );
        claimData.canClaim = true;

        setClaimData(claimData);
        return;
        // if the user has claimed but the airdrop is instant
      } else if (isCompressedClaimStatus(claim)) {
        claimData.amountUnlocked = new BN(data.amountUnlocked);
        claimData.amountLocked = new BN(data.amountLocked);
        claimData.totalUnlocked = new BN(data.amountUnlocked);
        claimData.totalLocked = new BN(data.amountLocked);
        claimData.totalClaimed = new BN(data.amountUnlocked);
        claimData.nextClaimPeriod = new Date(
          distributor.startTs.mul(new BN(1000)).toNumber()
        );
        claimData.canClaim = false;

        setClaimData(claimData);
        return;
      } else {
        const claimLog = {
          ...claim,
          lockedAmount: claim.lockedAmount.toString(10),
          lockedAmountWithdrawn: claim.lockedAmountWithdrawn.toString(10),
          unlockedAmount: claim.unlockedAmount.toString(10),
          lastClaimTs: claim.lastClaimTs.toString(10),
          lastAmountPerUnlock: claim.lastAmountPerUnlock.toString(10),
          closedTs: claim.closedTs.toString(10),
        };
        console.log("claimLog", claimLog);

        const nextPeriod = getNextClaimPeriod(
          distributor.startTs,
          distributor.endTs,
          distributor.unlockPeriod,
          claim.lastClaimTs
        );

        const { locked, unlocked } = getUnlockedAndLockedAmount(
          claim.lockedAmount.add(claim.unlockedAmount),
          claim.unlockedAmount,
          distributor.startTs,
          distributor.endTs,
          distributor.unlockPeriod
        );

        const unlockPerPeriod = getAmountUnlockedPerPeriod(
          claim.lockedAmount.add(claim.unlockedAmount),
          claim.unlockedAmount,
          distributor.startTs,
          distributor.endTs,
          distributor.unlockPeriod
        );

        claimData.unlockPerPeriod = unlockPerPeriod;
        claimData.amountUnlocked = claim.unlockedAmount;
        claimData.amountLocked = claim.lockedAmount;

        claimData.totalUnlocked = unlocked;
        claimData.totalLocked = locked;
        claimData.totalClaimed =
          claim.claimsCount > 0
            ? claim.lockedAmountWithdrawn.eq(new BN(0))
              ? claim.unlockedAmount // user claimed only cliff amount
              : claim.lockedAmountWithdrawn.add(claim.unlockedAmount) // user claimed both cliff and locked amount that became unlocked
            : claimData.totalClaimed;

        claimData.nextClaimPeriod = nextPeriod;
        claimData.lastAmountPerUnlock = claim.lastAmountPerUnlock;
        claimData.lockedAmountWithdrawn = claim.lockedAmountWithdrawn;
        claimData.closedTs = claim.closedTs;

        const now = new Date();

        if (nextPeriod && now >= nextPeriod) {
          claimData.canClaim = true;
        } else {
          claimData.canClaim = false;
        }

        setClaimData(claimData);
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while fetching claims");
      setClaimData(null);
    }
  }, [id, publicKey, distributor, airdropType]);

  // done
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
      // no metadata, can't fetch price but get the mint info
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

  // done
  const claimAirdrop = useCallback(async () => {
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
      // fetchClaimantData();
      // getBlockchainClaims();
    }
  }, [publicKey, id, wallet, claimData, fetchDistributor, fetchClaimData]);

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

  // console.log("claimData", {
  //   ...claimData,
  //   amountUnlocked: claimData?.amountUnlocked?.toString(),
  //   amountLocked: claimData?.amountLocked?.toString(),
  //   nextClaimPeriod: claimData?.nextClaimPeriod?.toISOString(),
  //   lastClaimTs: claimData?.lastClaimTs?.toString(),
  //   lastAmountPerUnlock: claimData?.lastAmountPerUnlock?.toString(),
  //   lockedAmountWithdrawn: claimData?.lockedAmountWithdrawn?.toString(),
  //   closedTs: claimData?.closedTs?.toString(),
  // });

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
                    Claiming is available{" "}
                    {formatDate(claimData.nextClaimPeriod)}, come back later.
                  </p>
                )}

              {claimData.claimsCount &&
                claimData.claimsCount === distributor.claimsLimit && (
                  <p className="text-center text-xl font-medium">
                    You have reached the maximum number of claims.
                  </p>
                )}
            </>
          ) : (
            <p className="text-center text-xl font-medium">
              Not eligible for airdrop
            </p>
          )}
        </>
      ) : (
        <p className="text-center text-xl font-medium">
          Connect your wallet to check your eligibility for this airdrop.
        </p>
      )}
    </div>
  );
}
