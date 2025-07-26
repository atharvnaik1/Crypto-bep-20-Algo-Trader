export type Strategy = {
  url: string;
};

export const strategies: Strategy[] = [
  {
    url: process.env.FIVE_BY_FIVE_URL || "http://localhost:4000",
  },
  {
    url: process.env.INDEX_FUND_URL || "http://localhost:4001",
  }
];
