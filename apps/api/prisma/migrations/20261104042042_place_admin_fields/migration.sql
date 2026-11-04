-- DropIndex
DROP INDEX "venue_embedding_hnsw";

-- AlterTable
ALTER TABLE "TripPlan" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "crowdBaseBusyness" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "crowdPeakBusyness" INTEGER NOT NULL DEFAULT 40,
ADD COLUMN     "crowdPeakHour" INTEGER NOT NULL DEFAULT 11,
ADD COLUMN     "embeddingJson" JSONB,
ADD COLUMN     "imageLicenseUrl" TEXT,
ADD COLUMN     "imageSourceUrl" TEXT,
ADD COLUMN     "source" TEXT,
ADD COLUMN     "sourceUrl" TEXT,
ADD COLUMN     "vibeTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
