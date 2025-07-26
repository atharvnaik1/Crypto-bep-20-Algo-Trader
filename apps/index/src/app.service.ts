import { DbService, Prisma, Strategy, Token, Wallet } from '@app/db';
import { ExecuterService } from '@app/executer/executer.service';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ethers } from 'ethers';
import { BigNumber } from 'bignumber.js';

@Injectable()
export class AppService {
  constructor(
    private readonly db: DbService,
    private readonly executer: ExecuterService,
  ) {}

  wallet: Wallet;
  strategy: Strategy;

  getHealth(): {
    status: string;
  } {
    return { status: 'ok' };
  }

  async getInfo() {
    return this.db.client.strategy.findFirst({
      where: { name: 'Index Fund' },
    });
  }

  async onApplicationBootstrap() {
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY is required');
    }
    const wallet = new ethers.Wallet(privateKey);

    const savedWallet = await this.db.client.wallet.findFirst({
      where: { address: wallet.address },
    });

    if (!savedWallet) {
      throw new Error('Wallet not found');
    }

    this.wallet = savedWallet;
    const strategy = await this.db.client.strategy.findFirst({
      where: {
        walletAddress: wallet.address,
        name: 'Index Fund',
      },
    });
    if (!strategy) {
      throw new Error('Strategy not found');
    }
    this.strategy = strategy;
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async takePerformanceSnapshot() {
    console.log('Taking performance snapshot');
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY is required');
    }
    const tokens = await this.db.client.token.findMany();
    const prices = await this.getTokenPriceAndMarketCap(tokens);
    if (prices instanceof Error) {
      return;
    }

    const balanceObjects: Prisma.BalanceSnapshotCreateManySnapshotInput[] = [];
    let walletTotalValue = 0;
    for (const token of tokens) {
      const balance = await this.getWalletBalance(token);
      const price = prices.find(
        (price) => price.coingeckoId == token.coingeckoId,
      );
      if (!price) {
        console.error(`Price for ${token.symbol} not found`);
        continue;
      }
      // const tokenValue =
      //   parseFloat(
      //     ethers.formatUnits(balance.toString(), token.decimals).toString(),
      //   ) * parseFloat(price.price);

      const tokenValue = new BigNumber(balance.toString())
        .dividedBy(new BigNumber(10).pow(token.decimals))
        .multipliedBy(new BigNumber(price.price))
        .toNumber();
      console.log(
        `total value for token ${token.symbol} = ${tokenValue} because price: ${price.price} and balance = ${balance.toString()}`,
      );
      walletTotalValue += tokenValue;
      const balanceSnapshot: Prisma.BalanceSnapshotCreateManySnapshotInput = {
        tokenAddress: token.address,
        tokenChainId: token.chainId,
        balance: balance.toString(),
        value: tokenValue,
      };
      balanceObjects.push(balanceSnapshot);
    }
    const snapshotInput: Prisma.SnapshotCreateInput = {
      strategy: {
        connect: {
          id: this.strategy.id,
        },
      },
      wallet: {
        connect: {
          address: this.wallet.address,
        },
      },
      balances: {
        createMany: {
          data: balanceObjects,
        },
      },
      totalValue: walletTotalValue,
    };
    const snapshot = await this.db.client.snapshot.create({
      data: snapshotInput,
    });
    console.log(snapshot);
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async check() {
    console.log(`Checking index on ${new Date().toISOString()} for strategy `);
    // Call the logic function
    this.logic();
  }

  async getTokenPriceAndMarketCap(tokens: Token[]): Promise<
    | {
        price: string;
        coingeckoId: string;
        marketCap: string;
      }[]
    | Error
  > {
    try {
      const mainIds: string[] = [];
      tokens.forEach((token: Token) => {
        if (this.tokensMainid[token.coingeckoId]) {
          mainIds.push(this.tokensMainid[token.coingeckoId]);
        } else {
          return Error(
            `Token with coingeckoId ${token.coingeckoId} not mapped`,
          );
        }
      });
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${mainIds.join(
          ',',
        )}&vs_currencies=usd&include_market_cap=true`,
      );
      const json = await response.json();
      const prices = [];
      for (const token of tokens) {
        prices.push({
          coingeckoId: token.coingeckoId,
          price: json[this.tokensMainid[token.coingeckoId]].usd,
          marketCap: json[this.tokensMainid[token.coingeckoId]].usd_market_cap,
        });
      }
      return prices;
    } catch (e) {
      console.error(`Error while fetching price: ${e.message}`);
      return Error(e.message);
    }
  }

  async calculateTargetBalanceInUsd({
    targetBalanceProportion,
    portfolioValue,
  }: {
    targetBalanceProportion: number;
    portfolioValue: number;
  }) {
    const targetBalance = portfolioValue * targetBalanceProportion;
    return targetBalance;
  }

  // Adjust the token's balance by buying or selling to move towards the target balance
  async adjustTokenBalance({
    token,
    currentBalance,
    targetBalance,
    tokenPrice,
  }: {
    token: Token;
    currentBalance: number;
    targetBalance: number;
    tokenPrice: number;
  }) {
    if (token.symbol === 'BUSD') {
      return;
    }
    const currentBalanceValue = currentBalance * tokenPrice; // Convert token amount to its value
    console.log(
      `targetBalance: ${targetBalance} currentBalance: ${currentBalanceValue}`,
    );
    console.log(`token decimals :${token.decimals}`);
    if (currentBalanceValue < targetBalance) {
      const amountOfBusdToSpend = targetBalance - currentBalanceValue; // Calculate amount of BUSD to spend
      // if amount of BUSD to spend is less than 1 then stop the function
      if (amountOfBusdToSpend < 1) {
        return;
      }
      console.error(`amountOfBusdToSpend: ${amountOfBusdToSpend}`);
      const fromAmount = new BigNumber(amountOfBusdToSpend)
        .multipliedBy(new BigNumber(10).pow(18))
        .toFixed(0);

      await this.createOrder({
        token: token,
        side: 'buy',
        // amount of BUSD to spend
        fromAmount,
      });
    } else if (currentBalanceValue > targetBalance) {
      // Sell token to reach the target balance
      const amountToSell = currentBalanceValue - targetBalance; // Calculate amount to sell in token units
      // if amount to sell in usd is less than 1 then stop the function
      const amountToSellInUsd = amountToSell;
      if (amountToSellInUsd < 1) {
        return;
      }
      console.log(
        `Selling ${amountToSell} ${token.symbol}  with fromAmount ${ethers
          .parseUnits(amountToSell.toFixed(6), token.decimals)
          .toString()}`,
      );
      await this.createOrder({
        token: token,
        side: 'sell',
        // amount of token to sell
        fromAmount: new BigNumber(amountToSell)
          .multipliedBy(new BigNumber(10).pow(token.decimals))
          .toFixed(0),
      });
    }
  }

  async logic() {
    const tokens = await this.db.client.token.findMany({});
    const tokenData = await this.getTokenPriceAndMarketCap(tokens); // Adjusted to include market cap
    if (tokenData instanceof Error) {
      return;
    }

    // Calculate total index value (sum of square roots of market caps)
    const totalIndexValue = tokenData.reduce(
      (acc, { marketCap }) => acc + Math.cbrt(parseFloat(marketCap)),
      0,
    );
    console.log(`Total index value: ${totalIndexValue}`);
    const { totalValue, tokenBalances } = await this.getTvl({
      tokens,
      prices: tokenData,
    });
    console.log(`Total value: ${totalValue}`);
    console.log(`Token balances: ${tokenBalances}`);
    for (const { coingeckoId, price, marketCap } of tokenData) {
      const token = tokens.find((token) => token.coingeckoId == coingeckoId);
      if (!token) {
        console.error(`Token with coingeckoId ${coingeckoId} not found`);
        continue;
      }

      // Calculate target balance for this token
      const targetBalanceProportion =
        Math.cbrt(parseFloat(marketCap)) / totalIndexValue;

      const targetBalance = await this.calculateTargetBalanceInUsd({
        targetBalanceProportion,
        portfolioValue: totalValue,
      });
      console.log(`Target balance for ${token.symbol}: ${targetBalance}`);
      const currentTokenBalance = tokenBalances.find(
        (balance) => balance.coingeckoId == coingeckoId,
      )?.balance;
      console.log(
        `Current balance for ${token.symbol}: ${currentTokenBalance}`,
      );
      // if itis undefined then stop running the entire logic function if it is 0 then it will continue
      if (typeof currentTokenBalance === 'undefined') {
        // stop running the entire logic function if the token balance is not found
        console.error(`Token balance for ${token.symbol} not found`);
        return;
      }
      const currentBalance = parseFloat(
        ethers.formatUnits(currentTokenBalance, token.decimals),
      );
      // Check current balance and decide on buy/sell
      await this.adjustTokenBalance({
        token: token,
        currentBalance,
        targetBalance,
        tokenPrice: parseFloat(price),
      });
    }
  }

  async getTvl({
    tokens,
    prices,
  }: {
    tokens: Token[];
    prices: {
      price: string;
      coingeckoId: string;
    }[];
  }): Promise<{
    totalValue: number;
    tokenBalances: {
      coingeckoId: string;
      balance: string;
      value: number;
    }[];
  }> {
    const balanceObjects: {
      coingeckoId: string;
      balance: string;
      value: number;
    }[] = [];
    let walletTotalValue = 0;
    for (const token of tokens) {
      const balance = await this.getWalletBalance(token);
      const price = prices.find(
        (price) => price.coingeckoId == token.coingeckoId,
      );
      if (!price) {
        console.error(`Price for ${token.symbol} not found`);
        continue;
      }
      // const tokenValue =
      //   parseFloat(ethers.formatUnits(balance, token.decimals).toString()) *
      //   parseFloat(price.price);
      const tokenValue = new BigNumber(balance.toString())
        .dividedBy(new BigNumber(10).pow(token.decimals))
        .multipliedBy(new BigNumber(price.price))
        .toNumber();
      console.log(
        `total value for token ${token.symbol} = ${tokenValue} because price: ${price.price} and balance = ${balance.toString()}`,
      );
      walletTotalValue += tokenValue;
      balanceObjects.push({
        coingeckoId: token.coingeckoId,
        balance: balance,
        value: tokenValue,
      });
    }
    return {
      totalValue: walletTotalValue,
      tokenBalances: balanceObjects,
    };
  }

  async getDifferenceInCurrentAndTargetBalance({
    targetBalanceProportion,
    currentBalance,
    totalCurrentBalance,
  }: {
    targetBalanceProportion: number;
    currentBalance: string;
    totalCurrentBalance: number;
  }): Promise<number> {
    const targetBalance = totalCurrentBalance * targetBalanceProportion;
    return targetBalance - parseFloat(currentBalance);
  }

  async getWalletBalance(token: Token): Promise<string> {
    const provider = new ethers.JsonRpcProvider(
      process.env[`RPC_${token.chainId}`],
    );

    const walletAddress = this.wallet.address;
    const contract = new ethers.Contract(
      token.address,
      ['function balanceOf(address) view returns (uint)'],
      provider,
    );
    const balance = await contract.balanceOf(walletAddress);

    return balance;
  }

  async createOrder({
    token,
    side,
    fromAmount,
  }: {
    token: Token;
    fromAmount: string;
    side: 'buy' | 'sell';
  }) {
    console.log(`Creating ${side} order for ${token.symbol}`);
    const baseToken = await this.db.client.token.findFirst({
      where: { symbol: 'BUSD' },
    });
    if (!baseToken) {
      console.error('BUSD not found');
      return;
    }
    if (token.symbol === 'BUSD') {
      return;
    }
    let fromToken: Token | null = null;
    let toToken: Token | null = null;
    if (side === 'buy') {
      // check if base token has enough balance
      const balance = await this.getWalletBalance(baseToken);
      if (parseFloat(balance) < parseFloat(fromAmount)) {
        console.error('Insufficient balance to buy with BUSD');
        return;
      }
      fromToken = baseToken;
      toToken = token;
    }
    if (side === 'sell') {
      fromToken = token;
      toToken = baseToken;
    }
    if (!fromToken || !toToken) {
      console.error('Token not found');
      return;
    }

    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY is required');
    }
    const wallet = new ethers.Wallet(privateKey);
    const provider = new ethers.JsonRpcProvider(
      process.env[`RPC_${token.chainId}`],
    );
    const wallet_with_provider = wallet.connect(provider);

    // if buy then 10% of available base token
    // if sell then 20% of available token
    console.log(`fromAmount: ${fromAmount}`);
    console.log(`wallet_with_provider: ${wallet_with_provider.address}`);
    const txReceipt = await this.executer.executeTrade({
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: fromAmount,
      wallet: wallet_with_provider,
      strategyId: this.strategy.id,
    });
    console.log(txReceipt);
  }

  /**
   * This is a mapping of token symbols to their coingecko ids
   * Using tokens main deplyment chain id as key so the market cap is calculated based on the main deployment
   */
  tokensMainid: {
    [key: string]: string;
  } = {
    uniswap: 'uniswap',
    'binance-peg-polkadot': 'polkadot',
    chainlink: 'chainlink',
    'binance-peg-avalanche': 'avalanche-2',
    'binance-bitcoin': 'bitcoin',
    weth: 'ethereum',
    'matic-network': 'matic-network',
    'binance-peg-xrp': 'ripple',
    'binance-peg-cardano': 'cardano',
    wbnb: 'binancecoin',
    'binance-usd': 'binance-usd',
  };
}
