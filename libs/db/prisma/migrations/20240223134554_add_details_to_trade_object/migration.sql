/*
  Warnings:

  - Added the required column `fromAmount` to the `trades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `metadata` to the `trades` table without a default value. This is not possible if the table is not empty.
  - Added the required column `txHash` to the `trades` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "trades" ADD COLUMN     "fromAmount" TEXT NOT NULL,
ADD COLUMN     "metadata" JSONB NOT NULL,
ADD COLUMN     "toAmount" TEXT,
ADD COLUMN     "txHash" TEXT NOT NULL;
