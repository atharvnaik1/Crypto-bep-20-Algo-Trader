"use client";

import { Token } from "@app/db";
import { DonutChart, EventProps } from "@tremor/react";
import { JSXElementConstructor, useState } from "react";
import { BarList, Card } from "@tremor/react";
import Image from "next/image";

export default function BalanceChart({
  balance,
  tokens,
}: {
  balance: {
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
  };
  tokens: Token[];
}) {
  const [value, setValue] = useState<EventProps>(null);
  const valueFormatter = (number: number) =>
    `$ ${Intl.NumberFormat("us").format(number).toString()}`;

  const sortedData = balance.balances.sort((a, b) => b.value - a.value);
  const data: {
    icon: JSXElementConstructor<any>;
    value: number;
    name: string;
  }[] = sortedData.map((b) => {
    const token = tokens.find((t) => t.address === b.tokenAddress);
    if (!token) {
      return {
        icon: () => <div>?</div>,
        value: b.value,
        name: b.tokenAddress,
      };
    }
    return {
      icon: () => (
        <Image
          src={token.logoURI}
          alt={token.symbol}
          width={20}
          height={20}
          className="mx-2"
        />
      ),
      value: b.value,
      name: token.symbol,
    };
  });

  if (!data || data.length === 0 || data == null) {
    return <div>No data</div>;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4">
      <Card className="flex flex-col items-center justify-center mx-auto max-w-lg">
        <DonutChart
          className="mx-auto"
          data={data}
          category="value"
          index="name"
          valueFormatter={valueFormatter}
          onValueChange={(v) => setValue(v)}
        />
      </Card>
      <Card className="mx-auto">
        <BarList data={data} className="mt-2" valueFormatter={valueFormatter} />
      </Card>
    </div>
  );
}
