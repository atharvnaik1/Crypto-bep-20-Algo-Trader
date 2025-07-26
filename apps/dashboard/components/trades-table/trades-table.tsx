import { PrismaClient, Trade } from "@app/db";
import { DataTable } from "./data-table";
import { columns } from "./columns";
import { Card } from "@tremor/react";

export default async function TradesTable() {
  const prisma = new PrismaClient();
  const trades: ({
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
  } & Trade)[] = await prisma.trade.findMany({
    orderBy: {
      createdAt: "desc",
    },
    take: 100,
    include: {
      fromToken: {
        select: {
          address: true,
          decimals: true,
          symbol: true,
          logoURI: true,
        },
      },
      strategy: {
        select: {
          name: true,
          walletAddress: true,
        },
      },
      toToken: {
        select: {
          address: true,
          logoURI: true,
          decimals: true,
          symbol: true,
        },
      },
    },
  });

  if (trades.length === 0) {
    return <div>No trades yet</div>;
  }

  return (
    <Card className="w-full">
      <DataTable columns={columns} data={trades} />
    </Card>
  );
}
