-- D-027: Gemini embedding at 768 dimensions. The Venue table is still empty, so the column is
-- recreated instead of cast, and the HNSW index is rebuilt on the new column.
DROP INDEX IF EXISTS venue_embedding_hnsw;
ALTER TABLE "Venue" DROP COLUMN "embedding";
ALTER TABLE "Venue" ADD COLUMN "embedding" vector(768);
CREATE INDEX venue_embedding_hnsw ON "Venue" USING hnsw (embedding vector_cosine_ops);

-- D-026: guest-first saved trip plans.
CREATE TABLE "TripPlan" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "guestSessionId" TEXT,
    "title" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "request" JSONB NOT NULL,
    "metrics" JSONB NOT NULL,
    "stopNames" JSONB NOT NULL,
    "changeLog" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripPlan_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TripPlan_userId_createdAt_idx" ON "TripPlan"("userId", "createdAt");
CREATE INDEX "TripPlan_guestSessionId_createdAt_idx" ON "TripPlan"("guestSessionId", "createdAt");
