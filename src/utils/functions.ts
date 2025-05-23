import { Connection, PublicKey } from "@solana/web3.js";
import { getClaimantStatusPda } from "@streamflow/distributor/solana";
import { distributorClient } from "@utils/constants";
import BN from "bn.js";

export function isInstant(startTs: BN, endTs: BN) {
  return startTs.eq(endTs);
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

// Returns the amount of tokens claimed by a claimant so far
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
