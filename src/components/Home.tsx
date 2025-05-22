import { distributorClient } from "@/utils/constants";
import { IProgramAccount } from "@streamflow/common/solana";
import { MerkleDistributor } from "@streamflow/distributor/solana";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { formatTokenAmount, isInstant, maskPublicKey } from "@utils/functions";
import { Airdrop } from "@utils/types";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const [distributors, setDistributors] = useState<
    IProgramAccount<MerkleDistributor>[]
  >([]);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [search, setSearch] = useState("");

  // Fetch all distributors
  useEffect(() => {
    const getDistributorData = async () => {
      const distributors = await distributorClient.searchDistributors({});
      setDistributors(distributors);
    };

    getDistributorData();
  }, []);

  const fetchData = async (options: {
    pageIndex: number;
    pageSize: number;
  }) => {
    if (distributors.length === 0) {
      return {
        rows: [],
        pageCount: 0,
        rowCount: 0,
      };
    }

    const data = distributors
      .sort((a, b) => (a.account.version.lt(b.account.version) ? 1 : -1))
      .map(x => {
        return {
          distributor: x.publicKey.toString(),
          recipients: {
            claimed: x.account.numNodesClaimed,
            total: x.account.maxNumNodes,
          },
          tokens: {
            claimed: x.account.totalAmountClaimed,
            total: x.account.maxTotalClaim,
          },
          type: isInstant(x.account.startTs, x.account.endTs)
            ? "Instant"
            : "Timed",
        } as unknown as Airdrop;
      });

    return {
      rows: data.slice(
        options.pageIndex * options.pageSize,
        (options.pageIndex + 1) * options.pageSize
      ),
      pageCount: Math.ceil(data.length / options.pageSize),
      rowCount: data.length,
    };
  };

  const dataQuery = useQuery({
    queryKey: [
      "distributors",
      pagination.pageIndex,
      pagination.pageSize,
      distributors,
    ],
    queryFn: async () => fetchData(pagination),
    placeholderData: keepPreviousData,
  });

  const filteredData = useMemo(() => {
    return distributors
      .filter(d =>
        d.publicKey.toString().toLowerCase().includes(search.toLowerCase())
      )
      .sort((a, b) => (a.account.version.lt(b.account.version) ? 1 : -1));
  }, [distributors, search]);

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
      type: isInstant(x.account.startTs, x.account.endTs) ? "Instant" : "Timed",
    }));
  }, [filteredData]);

  const paginatedRows = useMemo(() => {
    const start = pagination.pageIndex * pagination.pageSize;
    return mappedData.slice(start, start + pagination.pageSize);
  }, [mappedData, pagination.pageIndex, pagination.pageSize]);

  const columns = useMemo<ColumnDef<Airdrop>[]>(
    () => [
      {
        header: "Distributor",
        accessorKey: "distributor",
        cell: ({ row }) => {
          return maskPublicKey(row.original.distributor);
        },
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
          const claimed = formatTokenAmount(row.original.tokens.claimed, 9);
          const total = formatTokenAmount(row.original.tokens.total, 9);

          return `${claimed} / ${total}`;
        },
      },
      {
        header: "Type",
        accessorKey: "type",
        cell: ({ row }) => {
          return row.original.type;
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: paginatedRows,
    columns,
    rowCount: mappedData.length,
    state: {
      pagination,
    },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    debugTable: true,
  });

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
              {dataQuery.isFetching ? "Loading..." : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
