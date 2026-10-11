-- AlterTable
ALTER TABLE "reels" ADD COLUMN     "playback_url" TEXT,
ADD COLUMN     "poster_url" TEXT,
ADD COLUMN     "video_provider_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "reels_video_provider_id_key" ON "reels"("video_provider_id");
