import { Airdrop } from "@lib/types";
import { formatTokenAmount, getAirdropType } from "@lib/utils";
import useDistributors from "@queries/useDistributors";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useMintStore } from "@store/mintStore";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();
  const { connection } = useConnection();
  const { fetchMintInfo, getMintInfo } = useMintStore();

  const { data: distributors, isLoading, error, isError } = useDistributors();

  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Filter and sort
  const filteredData = useMemo(() => {
    if (!distributors) return [];

    return distributors
      .filter(d =>
        d.publicKey.toString().toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.account.version.lt(b.account.version) ? 1 : -1));
  }, [distributors, search]);

  // Map to table data
  const mappedData = useMemo(() => {
    return filteredData.map(x => ({
      distributor: x.publicKey.toString(),
      recipients: {
        claimed: x.account.numNodesClaimed,
        total: x.account.maxNumNodes,
      },
      tokens: {
        claimed: x.account.totalAmountClaimed,
        total: x.account.maxTotalClaim,
      },
      type: getAirdropType(x.account.startTs, x.account.endTs),
      mint: x.account.mint,
    }));
  }, [filteredData]);

  const paginatedRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return mappedData.slice(start, start + pagination.pageSize);
  }, [mappedData, pagination.pageIndex, pagination.pageSize]);

  // Fetch mint info for currently displayed rows
  useEffect(() => {
    if (paginatedRows.length === 0 || !connection) return;

    const mints = paginatedRows.map(row => new PublicKey(row.mint));
    fetchMintInfo(mints, connection);
  }, [paginatedRows, connection, fetchMintInfo]);

  const columns = useMemo<ColumnDef<Airdrop & { mint: PublicKey }>[]>(
    () => [
      {
        header: "Distributor",
        accessorKey: "distributor",
        cell: ({ row }) => row.original.distributor,
      },
      {
        header: "Type",
        accessorKey: "type",
        cell: ({ row }) => row.original.type,
      },
      {
        header: "Recipients (claimed/total)",
        accessorKey: "recipients",
        cell: ({ row }) => {
          const claimed = row.original.recipients.claimed.toString();
          const total = row.original.recipients.total.toString();
          return `${claimed} / ${total}`;
        },
      },
      {
        header: "Amount in Tokens (claimed/total)",
        accessorKey: "tokens",
        cell: ({ row }) => {
          const mintInfo = getMintInfo(row.original.mint.toString());
          const decimals = mintInfo?.decimals ?? 9;

          const claimed = formatTokenAmount(
            row.original.tokens.claimed,
            decimals
          );
          const total = formatTokenAmount(row.original.tokens.total, decimals);
          return `${claimed} / ${total}`;
        },
      },
    ],
    [getMintInfo]
  );

  const table = useReactTable({
    data: paginatedRows,
    columns,
    rowCount: mappedData.length,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div>Loading airdrops...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 text-center">
        <div className="text-xl font-medium">
          Failed to load airdrops: {error?.message}
        </div>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-md btn-black"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Airdrops</h1>

        <div className="rounded-lg border-b border-gray-200 bg-white shadow">
          {/* Search */}
          <div className="flex flex-col gap-4 p-4">
            <div className="grow">
              <input
                type="text"
                placeholder="Search by distributor"
                className="block w-full rounded-md border border-gray-300 px-2.5 py-2 shadow-sm"
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setPagination(prev => ({ ...prev, pageIndex: 0 }));
                }}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-100">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-4 py-2 text-left text-xs font-medium tracking-wider whitespace-nowrap uppercase select-none"
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr
                    key={row.id}
                    className="bg-white hover:cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      navigate(`/airdrops/${row.original.distributor}`);
                    }}
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-4 py-2 text-sm font-normal text-gray-900"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="flex items-center gap-2 rounded-b-lg border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
              <button
                className="btn btn-xs btn-white"
                onClick={() => table.firstPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {"<<"}
              </button>
              <button
                className="btn btn-xs btn-white"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {"<"}
              </button>
              <button
                className="btn btn-xs btn-white"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {">"}
              </button>
              <button
                className="btn btn-xs btn-white"
                onClick={() => table.lastPage()}
                disabled={!table.getCanNextPage()}
              >
                {">>"}
              </button>
              <span className="flex items-center gap-1">
                <div>Page</div>
                <strong>
                  {table.getState().pagination.pageIndex + 1} of{" "}
                  {table.getPageCount().toLocaleString()}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                | Go to page:
                <input
                  type="number"
                  min="1"
                  max={table.getPageCount()}
                  defaultValue={table.getState().pagination.pageIndex + 1}
                  onChange={e => {
                    const page = e.target.value
                      ? Number(e.target.value) - 1
                      : 0;
                    table.setPageIndex(page);
                  }}
                  className="w-16 rounded border p-1"
                />
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={e => {
                  table.setPageSize(Number(e.target.value));
                }}
              >
                {[10, 20, 30, 40, 50].map(pageSize => (
                  <option key={pageSize} value={pageSize}>
                    Show {pageSize}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
