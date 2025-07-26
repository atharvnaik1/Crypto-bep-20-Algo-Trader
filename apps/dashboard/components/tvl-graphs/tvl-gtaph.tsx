import { PrismaClient } from "@app/db";
import TVLGraphClientComponent from "./graph";
import { Card } from "@tremor/react";

export default async function TVLGraph() {
  const client = new PrismaClient();

  const strategies: ({
    snapshots: {
      createdAt: Date;
      totalValue: number;
    }[];
  } & {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
    walletAddress: string;
  })[] = await client.strategy.findMany({
    include: {
      snapshots: {
        select: {
          id: true,
          totalValue: true,
          createdAt: true,
        },
      },
    },
  });
  

  /**
   * {
   *    date: "2021-10-10",
   *    strategy1: 1000,
   *    strategy2: 2000,
   *    strategy3: 3000,
   * }
   */
  const data: {
    [key: string]: string | number;
  }[] = [];

  const allStrategyNames = strategies.map((s) => s.name);

  for (const strategy of strategies) {
    const firstSnapshot = strategy.snapshots[0];
    for (const snapshot of strategy.snapshots) {
      //  first snapshot of this strategy

      const dateString = snapshot.createdAt.toISOString().split("T")[0];
      const date = data.find((d) => d.date === dateString);
      if (date) {
        date[strategy.name] = snapshot.totalValue / firstSnapshot.totalValue;
        continue;
      } else {
        data.push({
          date: dateString,
          [strategy.name]: snapshot.totalValue / firstSnapshot.totalValue,
        });
      }
    }
  }

  return (
    <Card className="w-full">
      <TVLGraphClientComponent
        data={data}
        strategyNames={allStrategyNames}
      />
    </Card>
  );
}
