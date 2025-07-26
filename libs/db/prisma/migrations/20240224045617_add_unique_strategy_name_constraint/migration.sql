/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `strategies` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "strategies_name_key" ON "strategies"("name");
