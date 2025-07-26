import { DbService } from '@app/db/db.service';
import { ExecuterService } from '@app/executer/executer.service';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ethers } from 'ethers';
import { Prisma, Strategy, Token, Wallet } from '@app/db';
@Injectable()
export class AppService {
  constructor(
    private readonly db: DbService,
    private readonly executer: ExecuterService,
  ) {}

  wallet: Wallet;
  strategy: Strategy;

  config = {
    buyThreshold: -5,
    sellThreshold: 5,
    buyPercentage: 0.1,
    sellPercentage: 0.25,
  };

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
        name: 'Five by Five', // or whatever the exact name is in your DB
      },
    });
    if (!strategy) {
      throw new Error('Strategy not found');
    }
    this.strategy = strategy;
    await this.takePerformanceSnapshot();
  }

  @Cron(CronExpression.EVERY_HOUR)
  check() {
    console.log(
      `Checking five-by-five on ${new Date().toISOString()} for strategy `,
    );
    // Call the logic function
    this.logic();
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async takePerformanceSnapshot() {
    console.log('Taking performance snapshot');
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error('WALLET_PRIVATE_KEY is required');
    }
    const wallet = new ethers.Wallet(privateKey);
    const walletAddress = wallet.address;
    const tokens = await this.db.client.token.findMany();
    const prices = await this.getTokenPrice(tokens);
    if (prices instanceof Error) {
      return;
    }

    const balanceObjects: Prisma.BalanceSnapshotCreateManySnapshotInput[] = [];
    let walletTotalValue = 0;
    for (const token of tokens) {
      const balance = await this.getWalletBalance(token, walletAddress);
      console.log(`Wallet balance for ${token.symbol} (${token.address}): ${balance}`);
      const price = prices.find(
        (price) => price.coingeckoId == token.coingeckoId,
      );
      if (!price) {
        console.error(`Price for ${token.symbol} not found`);
        continue;
      }
      const tokenValue =
        parseFloat(ethers.formatUnits(balance, token.decimals).toString()) *
        parseFloat(price.price);
      console.log(
        `total value for token ${token.symbol} = ${tokenValue} because price: ${price.price} and balance = ${ethers.formatUnits(balance, token.decimals)}`,
      );
      walletTotalValue += tokenValue;
      const balanceSnapshot: Prisma.BalanceSnapshotCreateManySnapshotInput = {
        tokenAddress: token.address,
        tokenChainId: token.chainId,
        balance: balance,
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
          address: walletAddress,
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

  getHealth(): {
    status: string;
  } {
    return { status: 'ok' };
  }

  async getInfo() {
    return this.db.client.strategy.findFirst({
      where: { name: 'Five by Five' },
    });
  }

  /**
   * This function is the logic of the strategy.
   */
  async logic() {
    const tokens = await this.db.client.token.findMany();

    const prices = await this.getTokenPrice(tokens);
    if (prices instanceof Error) {
      return;
    }
    for (const tokenPrice of prices) {
      const token = tokens.find(
        (token) => token.coingeckoId == tokenPrice.coingeckoId,
      );
      if (!token) {
        console.error(
          `Token with coingeckoId ${tokenPrice.coingeckoId} not found`,
        );
        continue;
      }
      console.log(
        `Token: ${token.symbol} Price: ${tokenPrice.price} Change: ${tokenPrice.change}`,
      );
      // if price is increased by sellThreshold then sell
      if (parseFloat(tokenPrice.change) > this.config.sellThreshold) {
        // if there is and order in last 24 hours then do nothing
        const orders = await this.db.client.trade.findMany({
          where: {
            fromTokenAddress: token.address,
            createdAt: {
              gte: new Date(
                Math.floor(new Date().getTime() - 24 * 60 * 60 * 1000),
              ),
            },
          },
        });
        if (orders.length > 0) {
          continue;
        } else {
          // await this.createOrder(token, 'sell');
          await this.createOrder({
            token: token,
            side: 'sell',
          });
        }

        // if price is decreased by buyThreshold then buy
      } else if (parseFloat(tokenPrice.change) < this.config.buyThreshold) {
        // if there is and order in last 24 hours then do nothing
        const orders = await this.db.client.trade.findMany({
          where: {
            toTokenAddress: token.address,
            createdAt: {
              gte: new Date(
                Math.floor(new Date().getTime() - 24 * 60 * 60 * 1000),
              ),
            },
          },
        });
        if (orders.length > 0) {
          continue;
        } else {
          await this.createOrder({
            token: token,
            side: 'buy',
          });
        }
      }
    }
  }

  async createOrder({ token, side }: { token: Token; side: 'buy' | 'sell' }) {
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

    const balance = await this.getWalletBalance(fromToken, wallet.address);

    // if buy then 10% of available base token
    // if sell then 20% of available token
    const fromAmount =
      side == 'buy'
        ? (parseFloat(balance) * this.config.buyPercentage)
            .toFixed(0)
            .toString()
        : (parseFloat(balance) * this.config.sellPercentage)
            .toFixed(0)
            .toString();

    const txReceipt = await this.executer.executeTrade({
      fromToken: fromToken,
      toToken: toToken,
      fromAmount: fromAmount,
      wallet: wallet_with_provider,
      strategyId: this.strategy.id,
    });
    console.log(txReceipt);
  }

  async getTokenPrice(
    tokens: Token[],
  ): Promise<{ price: string; change: string; coingeckoId: string }[] | Error> {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${tokens
          .map((token) => token.coingeckoId)
          .join(',')}&vs_currencies=usd&include_24hr_change=true`,
      );
      const json = await response.json();
      const prices = [];
      for (const token of tokens) {
        prices.push({
          coingeckoId: token.coingeckoId,
          price: json[token.coingeckoId].usd,
          change: json[token.coingeckoId]['usd_24h_change'],
        });
      }
      return prices;
    } catch (e) {
      console.error(`Error while fetching price: ${e.message}`);
      return Error(e.message);
    }
  }

  async getWalletBalance(token: Token, walletAddress: string) {
    const provider = new ethers.JsonRpcProvider(
      process.env[`RPC_${token.chainId}`],
    );
    const tokenContract = new ethers.Contract(
      token.address,
      [
        'function balanceOf(address owner) view returns (uint256)',
        'function decimals() view returns (uint8)',
      ],
      provider,
    );
    const balance = await tokenContract.balanceOf(walletAddress);
    return balance.toString();
  }
}
