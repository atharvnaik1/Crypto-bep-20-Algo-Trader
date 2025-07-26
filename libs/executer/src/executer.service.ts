import { DbService, Prisma } from "@app/db";
import { Injectable } from "@nestjs/common";
import { ethers, type TransactionReceipt, type Wallet } from "ethers";
import { Token } from "@app/db";

@Injectable()
export class ExecuterService {
  constructor(private readonly db: DbService) {}

  async executeTrade({
    strategyId,
    fromToken,
    toToken,
    fromAmount,
    wallet,
  }: {
    strategyId: string;
    fromToken: Token;
    toToken: Token;
    fromAmount: string;
    wallet: Wallet;
  }): Promise<TransactionReceipt | Error> {
    try {
      console.log(
        `Executing trade from ${fromToken.symbol} to ${toToken.symbol} for ${fromAmount} by ${wallet.address}`
      );

      //   check if fromToken and toToken are on the same chain
      if (fromToken.chainId !== toToken.chainId) {
        return new Error("Tokens are on different chains");
      }
      const quoteFrom1inch:
        | {
            from: string;
            to: string;
            data: string;
            value: string;
            gas: string;
            gasPrice: string;
          }
        | Error = await this.getSwapPraams({
        address: wallet.address,
        fromTokenAddress: fromToken.address,
        toTokenAddress: toToken.address,
        amount: fromAmount,
        chainId: fromToken.chainId,
      });

      if (quoteFrom1inch instanceof Error) {
        console.error(quoteFrom1inch);
        return quoteFrom1inch;
      }

      if (wallet instanceof Error) {
        console.error(wallet);
        return wallet;
      }
      const tx = await wallet.sendTransaction({
        from: quoteFrom1inch.from,
        to: quoteFrom1inch.to,
        data: quoteFrom1inch.data,
        value: quoteFrom1inch.value,
        gasLimit: quoteFrom1inch.gas,
        gasPrice: quoteFrom1inch.gasPrice,
      });
      console.log(`Transaction hash: ${tx.hash}`);
      const receipt = await tx.wait();
      if (receipt == null) {
        throw new Error("Transaction failed");
      }

      const tradeInput: Prisma.TradeCreateInput = {
        fromToken: {
          connect: {
            address_chainId: {
              address: fromToken.address,
              chainId: fromToken.chainId,
            },
          },
        },
        fromAmount: fromAmount,
        txHash: receipt.hash,
        metadata: JSON.stringify(receipt),
        toToken: {
          connect: {
            address_chainId: {
              address: toToken.address,
              chainId: toToken.chainId,
            },
          },
        },
        wallet: {
          connect: {
            address: wallet.address,
          },
        },
        strategy: {
          connect: {
            id: strategyId,
          },
        },
      };
      const newTrade = await this.db.client.trade.create({ data: tradeInput });

      return receipt;
    } catch (error) {
      console.error(error);
      return error;
    }
  }

  async getSwapPraams({
    address,
    fromTokenAddress,
    toTokenAddress,
    amount,
    chainId,
  }: {
    address: string;
    fromTokenAddress: string;
    toTokenAddress: string;
    amount: string;
    chainId: number;
  }): Promise<
    | {
        from: string;
        to: string;
        data: string;
        value: string;
        gas: string;
        gasPrice: string;
      }
    | Error
  > {
    try {
      const oneinchAPIKey = process.env.ONE_INCH_API_KEY;
      if (!oneinchAPIKey) {
        throw new Error("ONE_INCH_API_KEY is required");
      }
      const slippage = 1;
      console.log(
        `chainId: ${chainId} fromTokenAddress: ${fromTokenAddress} toTokenAddress: ${toTokenAddress} amount: ${amount} address: ${address}`
      );

      // const url = `https://api.1inch.dev/swap/v5.2/${chainId}/swap?src=${fromTokenAddress}&dst=${toTokenAddress}&amount=${amount}&from=${address}&slippage=${slippage}`;
      const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap?src=${fromTokenAddress}&dst=${toTokenAddress}&amount=${amount}&from=${address}&slippage=${slippage}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${oneinchAPIKey}`,
        },
      });

      if (response.statusText !== "OK") {
        const text = await response.text();
        console.error(text);
        throw new Error(`1inch API error: ${response.statusText}`);
      }
      const json = await response.json();
      const { tx } = json;
      const { from, to, data, value, gas, gasPrice } = tx;
      return {
        from,
        to,
        data,
        value,
        gas,
        gasPrice,
      };
    } catch (error) {
      console.error(error);
      return error;
    }
  }
}
