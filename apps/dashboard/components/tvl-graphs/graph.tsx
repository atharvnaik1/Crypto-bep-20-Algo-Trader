"use client";

import { LineChart } from "@tremor/react";

export default function TVLGraphClientComponent({
  data,
  strategyNames,
}: {
  data: {
    [key: string]: string | number;
  }[];
  strategyNames: string[];
}) {
  const dataFormatter = (number: number) =>
    `$${Intl.NumberFormat("us").format(number).toString()}`;

  return (
    <LineChart
      className="h-80"
      data={data}
      index="date"
      valueFormatter={dataFormatter}
      categories={strategyNames}
      yAxisWidth={60}
      minValue={1}
      showXAxis={true}
      onValueChange={(v) => console.log(v)}
    />
  );
}
