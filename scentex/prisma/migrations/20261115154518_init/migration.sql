-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('PLN', 'EUR');

-- CreateEnum
CREATE TYPE "Concentration" AS ENUM ('EDC', 'EDT', 'EDP', 'PARFUM', 'EXTRAIT', 'OTHER');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('DEMO', 'API', 'AFFILIATE_FEED', 'XML_CSV_FEED', 'STRUCTURED_DATA', 'SCRAPE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('AUTO_EAN', 'AUTO_ATTRIBUTES', 'MANUAL', 'PENDING_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED');

-- CreateEnum
CREATE TYPE "DealKind" AS ENUM ('CLAIMED_DISCOUNT', 'REAL_DROP', 'LOW_30D', 'ALL_TIME_LOW');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('TARGET_PRICE', 'ANY_DISCOUNT', 'NEW_LOW', 'BACK_IN_STOCK');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'TELEGRAM');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "telegramChatId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "concentration" "Concentration" NOT NULL,
    "volumeMl" INTEGER NOT NULL,
    "ean" TEXT,
    "description" TEXT,
    "category" TEXT,
    "releaseYear" INTEGER,
    "imageUrl" TEXT,
    "featuredRank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "currency" "Currency" NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "sourceKind" "SourceKind" NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerProduct" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "productId" TEXT,
    "externalId" TEXT NOT NULL,
    "rawTitle" TEXT NOT NULL,
    "rawBrand" TEXT,
    "ean" TEXT,
    "url" TEXT NOT NULL,
    "imageUrl" TEXT,
    "matchStatus" "MatchStatus" NOT NULL,
    "matchConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "originalPriceMinor" INTEGER,
    "shippingMinor" INTEGER,
    "availability" "Availability" NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL,
    "lastChangedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" BIGSERIAL NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "originalPriceMinor" INTEGER,
    "availability" "Availability" NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceChange" (
    "id" BIGSERIAL NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "productId" TEXT,
    "currency" "Currency" NOT NULL,
    "oldPriceMinor" INTEGER NOT NULL,
    "newPriceMinor" INTEGER NOT NULL,
    "deltaMinor" INTEGER NOT NULL,
    "pctChange" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductStats" (
    "productId" TEXT NOT NULL,
    "offersCount" INTEGER NOT NULL,
    "inStockCount" INTEGER NOT NULL,
    "lowestMinor" INTEGER,
    "avgMinor" INTEGER,
    "highestMinor" INTEGER,
    "cheapestRetailerId" TEXT,
    "change24hPct" DOUBLE PRECISION,
    "change7dPct" DOUBLE PRECISION,
    "change30dPct" DOUBLE PRECISION,
    "low30dMinor" INTEGER,
    "lowAllTimeMinor" INTEGER,
    "isLow30d" BOOLEAN NOT NULL DEFAULT false,
    "isAllTimeLow" BOOLEAN NOT NULL DEFAULT false,
    "maxClaimedDiscount" DOUBLE PRECISION,
    "lastCheckedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductStats_pkey" PRIMARY KEY ("productId")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "kind" "DealKind" NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "targetMinor" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'PLN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "AlertType" NOT NULL,
    "targetMinor" INTEGER,
    "currency" "Currency" NOT NULL DEFAULT 'PLN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastFiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "alertId" TEXT,
    "channel" "NotificationChannel" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperJob" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "offersSeen" INTEGER NOT NULL DEFAULT 0,
    "offersChanged" INTEGER NOT NULL DEFAULT 0,
    "offersRejected" INTEGER NOT NULL DEFAULT 0,
    "unmatched" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,

    CONSTRAINT "ScraperJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_ean_key" ON "Product"("ean");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Product_brandId_name_concentration_volumeMl_key" ON "Product"("brandId", "name", "concentration", "volumeMl");

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_slug_key" ON "Retailer"("slug");

-- CreateIndex
CREATE INDEX "RetailerProduct_productId_idx" ON "RetailerProduct"("productId");

-- CreateIndex
CREATE INDEX "RetailerProduct_matchStatus_idx" ON "RetailerProduct"("matchStatus");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerProduct_retailerId_externalId_key" ON "RetailerProduct"("retailerId", "externalId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_retailerProductId_checkedAt_idx" ON "PriceSnapshot"("retailerProductId", "checkedAt");

-- CreateIndex
CREATE INDEX "PriceSnapshot_checkedAt_idx" ON "PriceSnapshot"("checkedAt");

-- CreateIndex
CREATE INDEX "PriceChange_productId_detectedAt_idx" ON "PriceChange"("productId", "detectedAt");

-- CreateIndex
CREATE INDEX "PriceChange_detectedAt_idx" ON "PriceChange"("detectedAt");

-- CreateIndex
CREATE INDEX "ProductStats_lowestMinor_idx" ON "ProductStats"("lowestMinor");

-- CreateIndex
CREATE INDEX "ProductStats_change24hPct_idx" ON "ProductStats"("change24hPct");

-- CreateIndex
CREATE INDEX "ProductStats_change7dPct_idx" ON "ProductStats"("change7dPct");

-- CreateIndex
CREATE INDEX "ProductStats_change30dPct_idx" ON "ProductStats"("change30dPct");

-- CreateIndex
CREATE INDEX "Deal_kind_endedAt_idx" ON "Deal"("kind", "endedAt");

-- CreateIndex
CREATE INDEX "Deal_productId_idx" ON "Deal"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchlistItem_userId_productId_key" ON "WatchlistItem"("userId", "productId");

-- CreateIndex
CREATE INDEX "PriceAlert_productId_active_idx" ON "PriceAlert"("productId", "active");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "ScraperJob_retailerId_startedAt_idx" ON "ScraperJob"("retailerId", "startedAt");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceChange" ADD CONSTRAINT "PriceChange_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStats" ADD CONSTRAINT "ProductStats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductStats" ADD CONSTRAINT "ProductStats_cheapestRetailerId_fkey" FOREIGN KEY ("cheapestRetailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "PriceAlert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScraperJob" ADD CONSTRAINT "ScraperJob_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
