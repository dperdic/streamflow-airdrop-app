import { Connection, PublicKey } from "@solana/web3.js";
import { getClaimantStatusPda } from "@streamflow/distributor/solana";
import { distributorClient } from "@utils/constants";
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

export async function getAmountClaimed(
  distributor: PublicKey,
  claimant: PublicKey,
  connection: Connection
) {
  const programId = distributorClient.getDistributorProgramId();

  const distributorPDA = getClaimantStatusPda(programId, distributor, claimant);

  const signatures = await connection.getSignaturesForAddress(distributorPDA, {
    limit: 20,
  });

  if (signatures.length === 0) return new BN(0);

  let totalReceived = new BN(0);

  for (const { signature } of signatures) {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });

    if (!tx || !tx.meta) continue;

    const { preTokenBalances, postTokenBalances } = tx.meta;

    const recipient = postTokenBalances?.find(
      x => x.owner === claimant.toString() && x.accountIndex !== undefined
    );

    if (!recipient) continue;

    const recipientPreAmount = new BN(
      preTokenBalances?.find(b => b.accountIndex === recipient.accountIndex)
        ?.uiTokenAmount.amount ?? "0"
    );
    const recipientPostAmount = new BN(recipient.uiTokenAmount.amount);

    const received = recipientPostAmount.sub(recipientPreAmount);

    totalReceived = totalReceived.add(received);
  }

  return totalReceived;
}

export function getNextClaimPeriod(
  startTs: BN,
  endTs: BN,
  unlockPeriod: BN,
  lastClaimTs: BN
): Date | null {
  const now = new BN(Math.floor(Date.now() / 1000));

  if (now.lt(startTs)) {
    return new Date(startTs.mul(new BN(1000)).toNumber());
  }

  if (now.gt(endTs)) {
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

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    return format(dateObj, "dd.MM.yyyy. HH:mm");
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}
