"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Trade } from "@app/db";
import { Button } from "../ui/button";
import { CopyIcon } from "lucide-react";
import { ethers } from "ethers";

export const columns: ColumnDef<
  {
    strategy: {
      name: string;
      walletAddress: string;
    };
    fromToken: {
      symbol: string;
      address: string;
      decimals: number;
      logoURI: string;
    };
    toToken: {
      symbol: string;
      address: string;
      decimals: number;
      logoURI: string;
    };
  } & Trade
>[] = [
  {
    accessorKey: "id",
    header: "ID",
    cell: ({ row }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(row.original.id);
          }}
        >
          <CopyIcon className="h-4 w-4 mx-2" />
          <p>{row.original.id.slice(0, 4)} </p>
        </Button>
      );
    },
  },
  {
    accessorKey: "fromToken",
    header: "From",
    cell: ({ row }) => {
      return (
        <div className="flex items-center">{row.original.fromToken.symbol}</div>
      );
    },
  },
  {
    accessorKey: "fromAmount",
    header: "From Amount",
    cell: ({ row }) => {
      return (
        <div className="flex items-center">
          {parseFloat(
            ethers.formatUnits(
              row.original.fromAmount,
              row.original.fromToken.decimals
            )
          ).toFixed(5)}
        </div>
      );
    },
  },
  {
    accessorKey: "toToken",
    header: "To Token",
    cell: ({ row }) => {
      return (
        <div className="flex items-center">{row.original.toToken.symbol}</div>
      );
    },
  },
  {
    accessorKey: "strategy",
    header: "Strategy",
    cell: ({ row }) => {
      return <div className="flex items-center">{row.original.strategy.name}</div>;
    },
  },
  {
    accessorKey: "wallet",
    header: "Wallet",
    cell: ({ row }) => {
      return (
        // only return the first 4 characters of the wallet address and last 4 characters
        <div className="flex items-center">
          {row.original.strategy.walletAddress.slice(0, 6)}...
          {row.original.strategy.walletAddress.slice(-4)}
        </div>
      );
    },
  },
  {
    accessorKey: "txHash",
    header: "Transaction",
    cell: ({ row }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => {
            navigator.clipboard.writeText(row.original.txHash);
          }}
        >
          <CopyIcon className="h-4 w-4 mx-2" />
          <p>{row.original.txHash.slice(0, 10)}...</p>
        </Button>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created At",
    cell: ({ row }) => {
      // return in format 2021-10-10 10:10:10
      const date = new Date(row.original.createdAt);
      return <div className="flex items-center">{date.toISOString().replace("T", " ").slice(0, 19)}</div>;
    },
  },
];
