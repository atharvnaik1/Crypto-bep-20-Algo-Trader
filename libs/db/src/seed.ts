import { Prisma } from "@prisma/client";

export const strategies: Prisma.StrategyCreateInput[] = [
  {
    name: "Five by Five",
    description:
      "A simple trading strategy that buys on 5% dips and sells on 5% peaks.",
    walletAddress: "0xF2D229A62FAEDcA31ba033b1A2bFdbc43998F425",
    wallet: {
      connectOrCreate: {
        where: { address: "0xF2D229A62FAEDcA31ba033b1A2bFdbc43998F425" },
        create: {
          address: "0xF2D229A62FAEDcA31ba033b1A2bFdbc43998F425",
          name: "Five by Five Wallet",
        },
      },
    },
  },
  {
    name: "Index Fund",
    description:
      "A passive investment strategy that buys a diversified portfolio of assets.",
    walletAddress: "0xF2D229A62FAEDcA31ba033b1A2bFdbc43998F425",
    wallet: {
      connectOrCreate: {
        where: { address: "0xF2D229A62FAEDcA31ba033b1A2bFdbc43998F425" },
        create: {
          address: "0xF2D229A62FAEDcA31ba033b1A2bFdbc43998F425",
          name: "Index Fund Wallet",
        },
      },
    },  
  },
];

// amount	115792089237316195423570985008687907853269984665640564039457584007913129639935
// spender 0x1111111254eeb25477b68fb85ed929f73a960582
export const tokens: Prisma.TokenCreateInput[] = [
  {
    logoURI: "https://cryptologos.cc/logos/binance-usd-busd-logo.png?v=029",
    name: "Binance USD",
    symbol: "BUSD",
    chainId: 56,
    address: "0xe9e7cea3dedca5984780bafc599bd69add087d56",
    decimals: 18,
    coingeckoId: "binance-usd",
  },
  {
    name: "Wrapped BNB",
    logoURI: "https://cryptologos.cc/logos/bnb-bnb-logo.png?v=029",
    symbol: "WBNB",
    coingeckoId: "wbnb",
    address: "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c",
    decimals: 18,
    chainId: 56,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/cardano.png?v=030",
    name: "Cardano",
    chainId: 56,
    symbol: "ADA",
    coingeckoId: "binance-peg-cardano",
    address: "0x3ee2200efb3400fabb9aacf31297cbdd1d435d47",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/xrp.png?v=030",
    name: "Ripple",
    chainId: 56,
    coingeckoId: "binance-peg-xrp",
    symbol: "XRP",
    address: "0x1D2F0da169ceB9fC7B3144628dB156f3F6c60dBE",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/polygon.png?v=030",
    name: "Polygon",
    chainId: 56,
    coingeckoId: "matic-network",
    symbol: "MATIC",
    address: "0xcc42724c6683b7e57334c4e856f4c9965ed682bd",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/ethereum.png?v=030",
    name: "Wrapped Ether",
    chainId: 56,
    coingeckoId: "weth",
    symbol: "WETH",
    address: "0x2170Ed0880ac9A755fd29B2688956BD959F933F8",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/wrapped-bitcoin.png?v=030",
    name: "Wrapped Bitcoin",
    chainId: 56,
    coingeckoId: "binance-bitcoin",
    symbol: "BTCB",
    address: "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/avalanche.png?v=030",
    name: "Avalanche",
    chainId: 56,
    coingeckoId: "binance-peg-avalanche",
    symbol: "AVAX",
    address: "0x1ce0c2827e2ef14d5c4f29a091d735a204794041",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/chainlink.png?v=030",
    name: "Chainlink",
    chainId: 56,
    coingeckoId: "chainlink",
    symbol: "LINK",
    address: "0xF8A0BF9cF54Bb92F17374d9e9A321E6a111a51bD",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/polkadot-new.png?v=030",
    name: "Polkadot",
    chainId: 56,
    coingeckoId: "binance-peg-polkadot",
    symbol: "DOT",
    address: "0x7083609fce4d1d8dc0c979aab8c869ea2c873402",
    decimals: 18,
  },
  {
    logoURI: "https://cryptologos.cc/logos/thumbs/uniswap.png?v=030",
    name: "Uniswap",
    chainId: 56,
    coingeckoId: "uniswap",
    symbol: "UNI",
    address: "0xBf5140A22578168FD562DCcF235E5D43A02ce9B1",
    decimals: 18,
  },
];
