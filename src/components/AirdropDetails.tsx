import { Card } from "@components/ui/Card";
import {
  convertToUSD,
  formatDate,
  formatTokenAmount,
  getAirdropType,
} from "@lib/utils";
import { useClaimAirdrop } from "@queries/useClaimAirdrop";
import { useClaimData } from "@queries/useClaimData";
import { useDistributor } from "@queries/useDistributor";
import { useTokenInfo } from "@queries/useTokenInfo";
import { useTokenPrice } from "@queries/useTokenPrice";
import { useWallet } from "@solana/wallet-adapter-react";
import { useParams } from "react-router-dom";

export default function AirdropDetails() {
  const { id } = useParams<{ id: string }>();
  const { publicKey } = useWallet();

  const { data: distributor, isLoading: distributorLoading } =
    useDistributor(id);
  const { data: tokenInfo, isLoading: tokenInfoLoading } = useTokenInfo(
    distributor?.mint
  );
  const { data: claimData, isLoading: claimDataLoading } = useClaimData(
    id,
    publicKey,
    distributor
  );
  const { data: priceData } = useTokenPrice(tokenInfo?.symbol, tokenInfo?.mint);

  const claimMutation = useClaimAirdrop(id);

  const airdropType = distributor
    ? getAirdropType(distributor.startTs, distributor.endTs)
    : null;

  const isLoading = distributorLoading || tokenInfoLoading || claimDataLoading;

  const handleClaim = () => {
    if (claimData) {
      claimMutation.mutate(claimData);
    }
  };

  if (isLoading) {
    return (
      <div>
        <p className="text-center text-xl font-medium">Loading...</p>
      </div>
    );
  }

  if (!distributor) {
    return (
      <div>
        <p className="text-center text-xl font-medium">Distributor not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold">Airdrop Details</h1>
        <h2 className="text-lg break-all">Distributor: {id}</h2>
        <h2 className="text-lg break-all">
          Mint: {tokenInfo?.mint.toString()}
        </h2>
        {tokenInfo?.name && tokenInfo?.symbol && (
          <h2 className="text-lg break-all">
            Token: {tokenInfo?.name} ({tokenInfo?.symbol})
          </h2>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-lg font-medium">Global Airdrop Details</h3>

        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <Card title="Airdrop type" value={airdropType ?? ""} />
          <Card title="Recipients" value={distributor.maxNumNodes.toString()} />
          <Card
            title="Recipients Claimed/Total"
            value={`${distributor.numNodesClaimed.toString()} / ${distributor.maxNumNodes.toString()}`}
          />
          <Card
            title="Amount claimed/Total"
            value={`${formatTokenAmount(
              distributor.totalAmountClaimed,
              tokenInfo?.decimals ?? 9
            )} / ${formatTokenAmount(
              distributor.maxTotalClaim,
              tokenInfo?.decimals ?? 9
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
                      tokenInfo?.decimals ?? 9
                    )}
                    footer={convertToUSD(
                      claimData.totalLocked,
                      tokenInfo?.decimals ?? 9,
                      priceData?.price ?? "0"
                    )}
                  />
                  <Card
                    title="Unlocked"
                    value={formatTokenAmount(
                      claimData.totalUnlocked,
                      tokenInfo?.decimals ?? 9
                    )}
                    footer={convertToUSD(
                      claimData.totalUnlocked,
                      tokenInfo?.decimals ?? 9,
                      priceData?.price ?? "0"
                    )}
                  />
                  <Card
                    title="Claimed"
                    value={formatTokenAmount(
                      claimData.totalClaimed,
                      tokenInfo?.decimals ?? 9
                    )}
                    footer={convertToUSD(
                      claimData.totalClaimed,
                      tokenInfo?.decimals ?? 9,
                      priceData?.price ?? "0"
                    )}
                  />
                  <Card
                    title="Total"
                    value={formatTokenAmount(
                      claimData.amountUnlocked.add(claimData.amountLocked),
                      tokenInfo?.decimals ?? 9
                    )}
                    footer={convertToUSD(
                      claimData.amountUnlocked.add(claimData.amountLocked),
                      tokenInfo?.decimals ?? 9,
                      priceData?.price ?? "0"
                    )}
                  />
                </div>

                {airdropType === "Vested" && (
                  <div className="flex flex-col justify-start gap-4 md:flex-row">
                    <Card
                      title="Unlocked per period"
                      value={formatTokenAmount(
                        claimData.unlockPerPeriod,
                        tokenInfo?.decimals ?? 9
                      )}
                      footer={convertToUSD(
                        claimData.unlockPerPeriod,
                        tokenInfo?.decimals ?? 9,
                        priceData?.price ?? "0"
                      )}
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
                    onClick={() => handleClaim()}
                    disabled={claimMutation.isPending}
                  >
                    {claimMutation.isPending ? "Claiming..." : "Claim"}
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
              You are not eligible for this airdrop.
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
