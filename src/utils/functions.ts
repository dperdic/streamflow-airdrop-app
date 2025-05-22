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
