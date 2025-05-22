import { distributorClient } from "@/utils/constants";
import { IProgramAccount } from "@streamflow/common/solana";
import { MerkleDistributor } from "@streamflow/distributor/solana";
import { formatTokenAmount, isInstant, maskPublicKey } from "@utils/functions";
import { Airdrop } from "@utils/types";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const [distributorData, setDistributorData] = useState<
    IProgramAccount<MerkleDistributor>[]
  >([]);

  const getDistributorData = useCallback(async () => {
    // fetch all distributors by admin, omit admin to fetch all distributors
    const distributors = await distributorClient.searchDistributors({
      admin: import.meta.env.VITE_DISTRIBUTOR_ADMIN,
      mint: "So11111111111111111111111111111111111111112",
    });

    setDistributorData(distributors);

    const x = distributors.map(x => {
      return {
        distributor: x.publicKey.toString(),
        amountInTokens: x.account.maxTotalClaim.toString(),
        numRecipients: x.account.maxNumNodes.toString(),
        type: isInstant(x.account.startTs, x.account.endTs)
          ? "Instant"
          : "Timed",
      } as unknown as Airdrop;
    });

    console.log(x);
  }, []);

  useEffect(() => {
    getDistributorData();
  }, [getDistributorData]);

  return (
    <div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Airdrops</h1>

        <div className="rounded-lg border-b border-gray-200 bg-white shadow">
          <div className="overflow-x-auto rounded-lg">
            <table className="min-w-full">
              <thead className="bg-gray-300">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider whitespace-nowrap uppercase select-none">
                    Distributor
                  </th>

                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider whitespace-nowrap uppercase select-none">
                    Number of Recipients (claimed/total)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider whitespace-nowrap uppercase select-none">
                    Amount in Tokens (claimed/total)
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium tracking-wider whitespace-nowrap uppercase select-none">
                    Type
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-200">
                {distributorData.map(distributor => (
                  <tr
                    className="bg-white hover:cursor-pointer hover:bg-gray-50"
                    key={distributor.publicKey.toString()}
                    onClick={() => {
                      navigate(`/airdrops/${distributor.publicKey.toString()}`);
                    }}
                  >
                    <td className="px-4 py-2 text-sm font-normal text-gray-900">
                      {maskPublicKey(distributor.publicKey.toString())}
                    </td>

                    <td className="px-4 py-2 text-sm font-normal text-gray-900">
                      {distributor.account.numNodesClaimed.toString()} /{" "}
                      {distributor.account.maxNumNodes.toString()}
                    </td>

                    <td className="px-4 py-2 text-sm font-normal text-gray-900">
                      {formatTokenAmount(
                        distributor.account.totalAmountClaimed,
                        9
                      )}{" "}
                      /{" "}
                      {formatTokenAmount(distributor.account.maxTotalClaim, 9)}
                    </td>

                    <td className="px-4 py-2 text-sm font-normal text-gray-900">
                      {isInstant(
                        distributor.account.startTs,
                        distributor.account.endTs
                      )
                        ? "Instant"
                        : "Timed"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
