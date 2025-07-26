import TradesTable from "@dashboard/components/trades-table/trades-table";
import { strategies } from "@dashboard/config/strategies";

import { CheckCircle, XCircle } from "lucide-react";
import { Card } from "@tremor/react";
import StrategyBalance from "@dashboard/components/strategy-balance/strategy-balance";
import TVLGraph from "@dashboard/components/tvl-graphs/tvl-gtaph";
export const dynamic = "force-dynamic";

export default async function Home() {
  const statuses = [];

  for (const strategy of strategies) {
    const info = await fetch(`${strategy.url}/info`);
    const health = await fetch(`${strategy.url}/health`);
    statuses.push({
      strategy: await info.json(),
      status: (await health.json()).status,
    });
  }
  return (
    <main className="flex flex-col items-start justify-center p-4 md:p-12 xl:p-24 gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statuses.map((status) => (
          <Card key={status.strategy.name}>
            {status.status === "ok" ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <XCircle className="w-8 h-8 text-red-500" />
            )}
            <h2 className="text-xl mt-4">{status.strategy.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2 break-all">
              {status.strategy.walletAddress}
            </p>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {status.strategy.description}
            </p>
          </Card>
        ))}
      </div>
      <TVLGraph />
      <div className="flex flex-col w-full gap-4">
        {statuses.map((strategy) => (
          <StrategyBalance
            strategyId={strategy.strategy.id}
            key={strategy.strategy.id}
          />
        ))}
      </div>
      <TradesTable />
    </main>
  );
}
