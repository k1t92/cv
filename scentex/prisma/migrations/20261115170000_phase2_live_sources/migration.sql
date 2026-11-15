-- ProductStats is derived data: clear it so the new (productId, mode) key can be added; it is recomputed by the engine.
DELETE FROM "ProductStats";
-- CreateEnum
CREATE TYPE "DataMode" AS ENUM ('DEMO', 'LIVE');

-- CreateEnum
CREATE TYPE "FeedFormat" AS ENUM ('CSV', 'XML', 'JSON', 'JSONL');

-- DropIndex
DROP INDEX "ProductStats_lowestMinor_idx";

-- AlterTable
ALTER TABLE "ProductStats" DROP CONSTRAINT "ProductStats_pkey",
ADD COLUMN     "mode" "DataMode" NOT NULL,
ADD CONSTRAINT "ProductStats_pkey" PRIMARY KEY ("productId", "mode");

-- AlterTable
ALTER TABLE "Retailer" ADD COLUMN     "authHeaderEnv" TEXT,
ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "feedFormat" "FeedFormat",
ADD COLUMN     "feedOptions" JSONB,
ADD COLUMN     "feedPreset" TEXT,
ADD COLUMN     "feedUrl" TEXT,
ADD COLUMN     "intervalMinutes" INTEGER NOT NULL DEFAULT 1440,
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastOfferCount" INTEGER,
ADD COLUMN     "lastStatus" "JobStatus";

-- AlterTable
ALTER TABLE "ScraperJob" ADD COLUMN     "offersMissing" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" "Currency" NOT NULL,
    "quote" "Currency" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExchangeRate_base_quote_effectiveDate_idx" ON "ExchangeRate"("base", "quote", "effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_base_quote_effectiveDate_source_key" ON "ExchangeRate"("base", "quote", "effectiveDate", "source");

-- CreateIndex
CREATE INDEX "ProductStats_mode_lowestMinor_idx" ON "ProductStats"("mode", "lowestMinor");

