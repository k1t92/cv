-- CreateEnum
CREATE TYPE "AccessStatus" AS ENUM ('PUBLIC_ACCESS_SUPPORTED', 'PARTIALLY_SUPPORTED', 'REQUIRES_PARTNERSHIP', 'RESTRICTED', 'NOT_VERIFIED');

-- CreateEnum
CREATE TYPE "PageStatus" AS ENUM ('PENDING', 'OK', 'NOT_FRAGRANCE', 'NO_PRODUCT', 'NO_PRICE', 'AMBIGUOUS_PRICE', 'UNSUPPORTED_CURRENCY', 'GONE', 'DISALLOWED', 'ERROR');

-- AlterTable
ALTER TABLE "Retailer" ADD COLUMN     "accessStatus" "AccessStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "blockedReason" TEXT,
ADD COLUMN     "crawlConfig" JSONB,
ADD COLUMN     "robotsFetchedAt" TIMESTAMP(3),
ADD COLUMN     "robotsTxt" TEXT;

-- CreateTable
CREATE TABLE "CrawlPage" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isSitemap" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "sitemapLastmod" TIMESTAMP(3),
    "etag" TEXT,
    "lastModified" TEXT,
    "status" "PageStatus" NOT NULL DEFAULT 'PENDING',
    "httpStatus" INTEGER,
    "detail" TEXT,
    "lastOffers" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFetchedAt" TIMESTAMP(3),
    "nextCheckAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failures" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CrawlPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrawlPage_retailerId_isSitemap_nextCheckAt_idx" ON "CrawlPage"("retailerId", "isSitemap", "nextCheckAt");

-- CreateIndex
CREATE INDEX "CrawlPage_retailerId_status_idx" ON "CrawlPage"("retailerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CrawlPage_retailerId_url_key" ON "CrawlPage"("retailerId", "url");

-- AddForeignKey
ALTER TABLE "CrawlPage" ADD CONSTRAINT "CrawlPage_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

