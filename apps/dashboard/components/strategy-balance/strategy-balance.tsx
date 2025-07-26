import { PrismaClient } from "@app/db";
import BalanceChart from "./donut-chart";
import { Card } from "@tremor/react";

export default async function StrategyBalance({
  strategyId,
}: {
  strategyId: string;
}) {
  const client = new PrismaClient();
  const balance:
    | ({
        balances: {
          tokenAddress: string;
          balance: string;
          value: number;
        }[];
      } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        strategyId: string;
        walletAddress: string;
        totalValue: number;
      })
    | null = await client.snapshot.findFirst({
    where: {
      strategyId: strategyId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      balances: {
        select: {
          balance: true,
          value: true,
          tokenAddress: true,
        },
      },
    },
  });
  const tokens = await client.token.findMany();

  if (!balance) {
    return <div>No balance yet</div>;
  }

  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-tremor-title text-tremor-content-strong dark:text-dark-tremor-content-strong font-medium">
        Strategy Balance {balance.totalValue.toFixed(2)}
      </h3>
      <BalanceChart balance={balance} tokens={tokens} />{" "}
    </Card>
  );
}
