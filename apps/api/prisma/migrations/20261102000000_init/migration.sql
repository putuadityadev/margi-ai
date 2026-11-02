-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension (pgvector, Clarification C-01 / TDD §5)
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "EmailTokenType" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateEnum
CREATE TYPE "PhrStatus" AS ENUM ('DONOR', 'RECIPIENT');

-- CreateEnum
CREATE TYPE "VenueKind" AS ENUM ('DTW', 'MSME');

-- CreateEnum
CREATE TYPE "VenueCategory" AS ENUM ('TEMPLE', 'NATURE', 'WATERFALL', 'RICE_TERRACE', 'BEACH', 'FOREST', 'VILLAGE', 'VIEWPOINT', 'LAKE', 'STREET_CORRIDOR', 'CULINARY', 'COFFEE', 'CRAFT');

-- CreateEnum
CREATE TYPE "ForecastSource" AS ENUM ('CURATED', 'BESTTIME');

-- CreateEnum
CREATE TYPE "AnalysisStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TelemetryTier" AS ENUM ('LIVE', 'FORECAST', 'SIMULATION');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "role" "Role" NOT NULL DEFAULT 'USER',
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthAccount" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "familyId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "EmailTokenType" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Regency" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "phrStatus" "PhrStatus" NOT NULL,

    CONSTRAINT "Regency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Corridor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusMeters" INTEGER NOT NULL,
    "typicalDelayMinutes" INTEGER NOT NULL DEFAULT 0,
    "penaltyWindows" JSONB NOT NULL,

    CONSTRAINT "Corridor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "VenueKind" NOT NULL,
    "category" "VenueCategory" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameId" TEXT NOT NULL,
    "descriptionEn" TEXT NOT NULL,
    "descriptionId" TEXT NOT NULL,
    "regencyId" TEXT NOT NULL,
    "corridorId" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "isHotspot" BOOLEAN NOT NULL DEFAULT false,
    "isBufferZone" BOOLEAN NOT NULL DEFAULT false,
    "openingHours" JSONB NOT NULL,
    "typicalPeakQueueMinutes" INTEGER NOT NULL DEFAULT 0,
    "avgDwellMinutes" INTEGER NOT NULL DEFAULT 60,
    "priceLevel" INTEGER,
    "imageUrl" TEXT NOT NULL,
    "imageCredit" TEXT,
    "etiquetteTags" TEXT[],
    "besttimeVenueId" TEXT,
    "vibeProfile" JSONB,
    "vibeText" TEXT,
    "embedding" vector(1536),
    "embeddingModel" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HourlyForecast" (
    "venueId" UUID NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "hour" INTEGER NOT NULL,
    "busyness" INTEGER NOT NULL,
    "source" "ForecastSource" NOT NULL DEFAULT 'CURATED',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HourlyForecast_pkey" PRIMARY KEY ("venueId","dayOfWeek","hour")
);

-- CreateTable
CREATE TABLE "EtiquetteRule" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "textEn" TEXT NOT NULL,
    "textId" TEXT NOT NULL,

    CONSTRAINT "EtiquetteRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Preset" (
    "id" TEXT NOT NULL,
    "originVenueId" UUID NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "subtitleEn" TEXT NOT NULL,
    "subtitleId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imageSha256" TEXT NOT NULL,
    "defaultDay" INTEGER NOT NULL,
    "defaultHour" INTEGER NOT NULL,
    "simPeakDay" INTEGER NOT NULL,
    "simPeakHour" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analysis" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "guestSessionId" TEXT,
    "status" "AnalysisStatus" NOT NULL DEFAULT 'QUEUED',
    "locale" TEXT NOT NULL,
    "presetId" TEXT,
    "originVenueId" UUID NOT NULL,
    "arrivalAt" TIMESTAMP(3) NOT NULL,
    "simulate" BOOLEAN NOT NULL DEFAULT false,
    "imageKey" TEXT,
    "imageSha256" TEXT,
    "vibeProfile" JSONB,
    "result" JSONB,
    "trace" JSONB,
    "primaryTier" "TelemetryTier",
    "modelsUsed" JSONB,
    "durationMs" INTEGER,
    "errorCode" TEXT,
    "isReplay" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedTrip" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "analysisId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "venueId" UUID NOT NULL,
    "msmeVenueIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductEvent" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "analysisId" UUID,
    "venueId" UUID,
    "props" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");

-- CreateIndex
CREATE INDEX "Venue_kind_isActive_idx" ON "Venue"("kind", "isActive");

-- CreateIndex
CREATE INDEX "Venue_regencyId_idx" ON "Venue"("regencyId");

-- CreateIndex (pgvector HNSW cosine index, TDD §5)
CREATE INDEX venue_embedding_hnsw ON "Venue" USING hnsw (embedding vector_cosine_ops);

-- CreateIndex
CREATE INDEX "EtiquetteRule_tag_idx" ON "EtiquetteRule"("tag");

-- CreateIndex
CREATE INDEX "Analysis_userId_createdAt_idx" ON "Analysis"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Analysis_presetId_status_createdAt_idx" ON "Analysis"("presetId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SavedTrip_userId_createdAt_idx" ON "SavedTrip"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_name_createdAt_idx" ON "ProductEvent"("name", "createdAt");

-- AddForeignKey
ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_regencyId_fkey" FOREIGN KEY ("regencyId") REFERENCES "Regency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venue" ADD CONSTRAINT "Venue_corridorId_fkey" FOREIGN KEY ("corridorId") REFERENCES "Corridor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HourlyForecast" ADD CONSTRAINT "HourlyForecast_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Preset" ADD CONSTRAINT "Preset_originVenueId_fkey" FOREIGN KEY ("originVenueId") REFERENCES "Venue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analysis" ADD CONSTRAINT "Analysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrip" ADD CONSTRAINT "SavedTrip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTrip" ADD CONSTRAINT "SavedTrip_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "Analysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

