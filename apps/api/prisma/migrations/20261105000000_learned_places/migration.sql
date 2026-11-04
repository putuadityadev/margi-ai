-- Places learned from travellers' searches (kind OTHER), reviewed by curators.

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('APPROVED', 'PENDING');

-- AlterEnum
ALTER TYPE "VenueKind" ADD VALUE 'OTHER';

-- AlterEnum
ALTER TYPE "VenueCategory" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Venue" ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "learnedFrom" TEXT,
ADD COLUMN     "reviewStatus" "ReviewStatus" NOT NULL DEFAULT 'APPROVED';

-- CreateIndex
CREATE UNIQUE INDEX "Venue_externalRef_key" ON "Venue"("externalRef");

-- CreateIndex
CREATE INDEX "Venue_reviewStatus_idx" ON "Venue"("reviewStatus");
