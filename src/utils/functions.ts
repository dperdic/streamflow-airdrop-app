import { ClaimStatus, MerkleDistributor } from "@streamflow/distributor/solana";
import { ClaimantData, ClaimData } from "@utils/types";
import BN from "bn.js";
import { format } from "date-fns";

export function getAirdropType(startTs: BN, endTs: BN) {
  return startTs.eq(endTs) ? "Instant" : "Vested";
}

export function formatTokenAmount(amount: BN, decimals: number): string {
  const divisor = new BN(10).pow(new BN(decimals));
  const whole = amount.div(divisor).toString();
  const fraction = amount.mod(divisor).toString().padStart(decimals, "0");

  // Trim trailing zeroes from the fractional part
  const trimmedFraction = fraction.replace(/0+$/, "");

  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

export function maskPublicKey(publicKey: string) {
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

export function getNextClaimPeriod(
  startTs: BN,
  endTs: BN,
  unlockPeriod: BN,
  lastClaimTs: BN,
  closedTs?: BN
): Date | null {
  if (closedTs) {
    return null;
  }

  const currentTime = new BN(Math.floor(Date.now() / 1000));

  if (currentTime.lt(startTs)) {
    return new Date(startTs.mul(new BN(1000)).toNumber());
  }

  if (currentTime.gt(endTs)) {
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

export function getAmountUnlockedPerPeriod(
  totalAmount: BN,
  initialUnlocked: BN,
  startTime: BN,
  endTime: BN,
  unlockPeriod: BN
) {
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

export function getTotalLockedAndUnlockedAmount(
  totalAmount: BN,
  initialUnlocked: BN,
  startTime: BN,
  endTime: BN,
  unlockPeriod: BN
) {
  const currentTime = new BN(Math.floor(Date.now() / 1000));

  const toVest = totalAmount.sub(initialUnlocked);

  // Before vesting starts
  if (currentTime.lt(startTime)) {
    return {
      unlocked: initialUnlocked,
      locked: toVest,
    };
  }

  // After vesting ends
  if (currentTime.gte(endTime)) {
    return {
      unlocked: totalAmount,
      locked: new BN(0),
    };
  }

  const totalDuration = endTime.sub(startTime);
  const totalPeriods = totalDuration.div(unlockPeriod);
  if (totalPeriods.isZero()) {
    throw new Error("Unlock period longer than total duration");
  }

  // Rounded up unlock per period
  const unlockPerPeriod = toVest.add(totalPeriods.subn(1)).div(totalPeriods);

  const elapsedTime = currentTime.sub(startTime);
  const elapsedPeriods = elapsedTime.div(unlockPeriod);

  // Amount unlocked during vesting so far
  let vested = unlockPerPeriod.mul(elapsedPeriods);
  if (vested.gt(toVest)) vested = toVest;

  const unlocked = initialUnlocked.add(vested);
  const locked = totalAmount.sub(unlocked);

  return {
    unlocked,
    locked,
  };
}

// Helper function to fetch claimant data from API
export async function fetchClaimantDataFromAPI(
  id: string,
  publicKey: string
): Promise<ClaimantData | null> {
  const response = await fetch(
    `https://staging-api-public.streamflow.finance/v2/api/airdrops/${id}/claimants/${publicKey}`
  );

  if (!response.ok) {
    return null;
  }

  const data: ClaimantData = await response.json();
  return data || null;
}

// Helper function to create base claim data structure
export function createBaseClaimData(data: ClaimantData): ClaimData {
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
    totalUnlocked: new BN(data.amountUnlocked),
    totalLocked: new BN(data.amountLocked),
    totalClaimed: new BN(data.amountUnlocked),
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

  const totalClaimed =
    claim.claimsCount > 0
      ? claim.lockedAmountWithdrawn.eq(new BN(0))
        ? claim.unlockedAmount // user claimed only cliff amount
        : claim.lockedAmountWithdrawn.add(claim.unlockedAmount) // user claimed both cliff and locked amount that became unlocked
      : new BN(0);

  const canClaim = Boolean(
    nextClaimPeriod &&
      new Date() >= nextClaimPeriod &&
      (distributor.claimsLimit === 0 ||
        claim.claimsCount < distributor.claimsLimit) &&
      !distributor.clawedBack
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
    lockedAmountWithdrawn: claim.lockedAmountWithdrawn,
    closedTs: claim.closedTs,
    claimsCount: claim.claimsCount,
    canClaim,
  };
}
