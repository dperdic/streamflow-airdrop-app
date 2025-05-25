import { hermesClient } from "@lib/constants";
import { ClaimantData, ClaimData, JupiterPriceResponse } from "@lib/types";
import { unpackMint } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { ClaimStatus, MerkleDistributor } from "@streamflow/distributor/solana";
import BN from "bn.js";
import { format } from "date-fns";

export function getAirdropType(startTs: BN, endTs: BN): "Instant" | "Vested" {
  return startTs.eq(endTs) ? "Instant" : "Vested";
}

export function formatTokenAmount(
  tokenAmount: BN,
  tokenDecimals: number
): string {
  const divisor = new BN(10).pow(new BN(tokenDecimals));
  const whole = tokenAmount.div(divisor).toString();
  const fraction = tokenAmount
    .mod(divisor)
    .toString()
    .padStart(tokenDecimals, "0");

  // Trim trailing zeroes from the fractional part
  const trimmedFraction = fraction.replace(/0+$/, "");

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

export function convertToUSD(
  tokenAmount: BN,
  tokenDecimals: number,
  tokenToUsdRate: string
): string {
  try {
    const divisor = new BN(10).pow(new BN(tokenDecimals));
    const whole = tokenAmount.div(divisor).toString();
    const fraction = tokenAmount
      .mod(divisor)
      .toString()
      .padStart(tokenDecimals, "0");

    // Create decimal representation as string
    const tokenAmountStr = `${whole}.${fraction}`;

    // Convert to number for calculation
    const tokenAmountFloat = parseFloat(tokenAmountStr);
    const rate = parseFloat(tokenToUsdRate);

    // Handle invalid inputs
    if (isNaN(tokenAmountFloat) || isNaN(rate)) {
      return "$0.00";
    }

    // Calculate USD value
    const usdValue = tokenAmountFloat * rate;

    // Format to 2 decimal places with $ prefix
    return `$${usdValue.toFixed(2)}`;
  } catch (error) {
    console.error("Error calculating token dollar price:", error);
    return "$0.00";
  }
}

export function maskPublicKey(publicKey: string): string {
  return publicKey.slice(0, 5) + "..." + publicKey.slice(-5);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    return format(dateObj, "dd.MM.yyyy. HH:mm");
  } catch (error) {
    console.error("Error formatting date: ", error);
    return "";
  }
}

// Helper function to fetch claimant data from API
export async function fetchClaimantDataFromAPI(
  id: string,
  publicKey: string
): Promise<ClaimantData | null> {
  try {
    const response = await fetch(
      `https://staging-api-public.streamflow.finance/v2/api/airdrops/${id}/claimants/${publicKey}`
    );

    if (!response.ok) {
      return null;
    }

    const data: ClaimantData = await response.json();

    return data;
  } catch (error) {
    console.error("Error fetching claimant data from API: ", error);
    return null;
  }
}

// Helper function to create base claim data structure
function createBaseClaimData(data: ClaimantData): ClaimData {
  return {
    proof: data.proof,
    amountUnlocked: new BN(data.amountUnlocked),
    amountLocked: new BN(data.amountLocked),
    totalUnlocked: new BN(0),
    totalLocked: new BN(0),
    canClaim: false,
    totalClaimed: new BN(0),
    unlockPerPeriod: new BN(0),
  };
}

// Helper function to handle claim data when no claim PDA exists yet
export function buildClaimDataForNoClaim(
  data: ClaimantData,
  distributor: MerkleDistributor,
  airdropType: string
): ClaimData {
  const claimData = createBaseClaimData(data);
  const totalAmount = new BN(data.amountLocked).add(
    new BN(data.amountUnlocked)
  );

  const { locked, unlocked } = getTotalLockedAndUnlockedAmount(
    totalAmount,
    new BN(data.amountUnlocked),
    distributor.startTs,
    distributor.endTs,
    distributor.unlockPeriod
  );

  const unlockPerPeriod =
    airdropType === "Instant"
      ? new BN(data.amountUnlocked)
      : getAmountUnlockedPerPeriod(
          totalAmount,
          new BN(data.amountUnlocked),
          distributor.startTs,
          distributor.endTs,
          distributor.unlockPeriod
        );

  return {
    ...claimData,
    totalUnlocked: unlocked,
    totalLocked: locked,
    totalClaimed: new BN(0),
    nextClaimPeriod: new Date(distributor.startTs.mul(new BN(1000)).toNumber()),
    unlockPerPeriod,
    canClaim: !distributor.clawedBack,
  };
}

// Helper function to handle compressed (instant) claim data
export function buildClaimDataForCompressedClaim(
  data: ClaimantData
): ClaimData {
  const claimData = createBaseClaimData(data);

  return {
    ...claimData,
    totalUnlocked: new BN(data.amountUnlocked).add(new BN(data.amountLocked)),
    totalLocked: new BN(0),
    totalClaimed: new BN(data.amountUnlocked).add(new BN(data.amountLocked)),
    canClaim: false,
  };
}

// Helper function to handle vested claim data
export function buildClaimDataForVestedClaim(
  data: ClaimantData,
  claim: ClaimStatus,
  distributor: MerkleDistributor
): ClaimData {
  const claimData = createBaseClaimData(data);

  const nextClaimPeriod = getNextClaimPeriod(
    distributor.startTs,
    distributor.endTs,
    distributor.unlockPeriod,
    claim.lastClaimTs
  );

  const { locked, unlocked } = getTotalLockedAndUnlockedAmount(
    claim.lockedAmount.add(claim.unlockedAmount),
    claim.unlockedAmount,
    distributor.startTs,
    distributor.endTs,
    distributor.unlockPeriod
  );

  const totalClaimed = calculateTotalClaimed(claim);

  const canClaim = isClaimingAvailable(
    nextClaimPeriod,
    claim.claimsCount,
    distributor.claimsLimit,
    distributor.clawedBack
  );

  return {
    ...claimData,
    unlockPerPeriod: claim.lastAmountPerUnlock,
    amountUnlocked: claim.unlockedAmount,
    amountLocked: claim.lockedAmount,
    totalUnlocked: unlocked,
    totalLocked: locked,
    totalClaimed,
    nextClaimPeriod,
    claimsCount: claim.claimsCount,
    canClaim,
  };
}

export async function fetchMintInfo(
  publicKeys: PublicKey[],
  connection: Connection
): Promise<({ publicKey: PublicKey; decimals: number } | null)[]> {
  const accounts = await connection.getMultipleAccountsInfo(publicKeys);

  const mintInfo = accounts
    .map((account, index) => {
      if (!account) {
        return null;
      }

      try {
        const mint = unpackMint(publicKeys[index], account);

        return {
          publicKey: mint.address,
          decimals: mint.decimals,
        };
      } catch (error) {
        console.warn(
          `Failed to unpack mint for ${publicKeys[index].toString()}:`,
          error
        );
        return null;
      }
    })
    .filter(Boolean);

  return mintInfo;
}

export async function fetchJupiterPrice(tokenMint: string) {
  try {
    const response = await fetch(
      `https://lite-api.jup.ag/price/v2?ids=${tokenMint}`
    );

    const data: JupiterPriceResponse = await response.json();

    return data.data[tokenMint.toString()]?.price || null;
  } catch (error) {
    console.error("Error fetching Jupiter price:", error);
    return null;
  }
}

export async function fetchPythPrice(tokenSymbol: string) {
  const query = `Crypto.${tokenSymbol}/USD`;

  const pricefeeds = await hermesClient.getPriceFeeds({
    assetType: "crypto",
    query,
  });

  const priceFeed = pricefeeds.find(item => item.attributes.symbol === query);

  if (!priceFeed) {
    return null;
  }

  const priceUpdates = await hermesClient.getLatestPriceUpdates(
    [priceFeed.id],
    {
      parsed: true,
      ignoreInvalidPriceIds: true,
    }
  );

  const parsedPriceUpdate = priceUpdates.parsed?.find(
    item => item.id === priceFeed.id
  );

  if (!parsedPriceUpdate) {
    return null;
  }

  const divisor = new BN(10).pow(new BN(parsedPriceUpdate.price.expo));
  const whole = new BN(parsedPriceUpdate.price.price).div(divisor).toString();
  const fraction = new BN(parsedPriceUpdate.price.price)
    .mod(divisor)
    .toString()
    .padStart(parsedPriceUpdate.price.expo, "0");

  const formattedPrice = `${whole}.${fraction}`;

  return formattedPrice;
}

// Internal helper functions
// ----------------------------

function isClaimingAvailable(
  nextClaimPeriod: Date | null,
  claimsCount: number,
  claimsLimit: number,
  isClawedBack: boolean
): boolean {
  if (isClawedBack) return false;
  if (nextClaimPeriod && new Date() < nextClaimPeriod) return false;
  if (claimsLimit > 0 && claimsCount >= claimsLimit) return false;

  return true;
}

function calculateTotalClaimed(claim: ClaimStatus): BN {
  if (claim.claimsCount === 0) {
    return new BN(0);
  }

  const hasOnlyClaimedCliff = claim.lockedAmountWithdrawn.eq(new BN(0));

  if (hasOnlyClaimedCliff) {
    return claim.unlockedAmount; // user claimed only cliff amount
  }

  return claim.lockedAmountWithdrawn.add(claim.unlockedAmount); // user claimed both cliff and locked
}

function isVestingPeriodActive(
  currentTime: BN,
  startTime: BN,
  endTime: BN
): "before" | "active" | "after" {
  if (currentTime.lt(startTime)) return "before";
  if (currentTime.gte(endTime)) return "after";
  return "active";
}

function getNextClaimPeriod(
  startTs: BN,
  endTs: BN,
  unlockPeriod: BN,
  lastClaimTs: BN
): Date | null {
  const currentTime = new BN(Math.floor(Date.now() / 1000));
  const vestingStatus = isVestingPeriodActive(currentTime, startTs, endTs);

  if (vestingStatus === "before") {
    return new Date(startTs.mul(new BN(1000)).toNumber());
  }

  if (vestingStatus === "after") {
    return null;
  }

  // Calculate the next period after lastClaimTs
  let nextPeriod = startTs;

  if (lastClaimTs.gte(startTs)) {
    const periodsSinceStart = lastClaimTs
      .sub(startTs)
      .div(unlockPeriod)
      .addn(1);
    nextPeriod = startTs.add(unlockPeriod.mul(periodsSinceStart));
  }

  if (nextPeriod.gt(endTs)) {
    return null;
  }

  return new Date(nextPeriod.mul(new BN(1000)).toNumber());
}

function getAmountUnlockedPerPeriod(
  totalAmount: BN,
  initialUnlocked: BN,
  startTime: BN,
  endTime: BN,
  unlockPeriod: BN
): BN {
  const duration = endTime.sub(startTime);
  const periods = duration.div(unlockPeriod);

  // never happens, but just in case
  if (periods.isZero()) {
    return initialUnlocked;
  }

  const toVest = totalAmount.sub(initialUnlocked);

  // Rounded up unlock per period: ceil(toVest / periods)
  const unlockPerPeriod = toVest.add(periods.subn(1)).div(periods);

  return unlockPerPeriod;
}

function getTotalLockedAndUnlockedAmount(
  totalAmount: BN,
  initialUnlocked: BN,
  startTime: BN,
  endTime: BN,
  unlockPeriod: BN
): { unlocked: BN; locked: BN } {
  const currentTime = new BN(Math.floor(Date.now() / 1000));
  const toVest = totalAmount.sub(initialUnlocked);
  const vestingStatus = isVestingPeriodActive(currentTime, startTime, endTime);

  // Before vesting starts
  if (vestingStatus === "before") {
    return {
      unlocked: initialUnlocked,
      locked: toVest,
    };
  }

  // After vesting ends
  if (vestingStatus === "after") {
    return {
      unlocked: totalAmount,
      locked: new BN(0),
    };
  }

  // During vesting period
  const totalDuration = endTime.sub(startTime);
  const totalPeriods = totalDuration.div(unlockPeriod);

  // Rounded up unlock per period
  const unlockPerPeriod = toVest.add(totalPeriods.subn(1)).div(totalPeriods);
  const elapsedTime = currentTime.sub(startTime);
  const elapsedPeriods = elapsedTime.div(unlockPeriod);

  // Amount unlocked during vesting so far
  let vested = unlockPerPeriod.mul(elapsedPeriods);
  if (vested.gt(toVest)) {
    vested = toVest;
  }

  const unlocked = initialUnlocked.add(vested);
  const locked = totalAmount.sub(unlocked);

  return { unlocked, locked };
}
