-- CreateTable
CREATE TABLE "temple_aarti_alerts" (
    "user_id" UUID NOT NULL,
    "temple_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temple_aarti_alerts_pkey" PRIMARY KEY ("user_id","temple_id")
);

-- CreateIndex
CREATE INDEX "temple_aarti_alerts_temple_id_idx" ON "temple_aarti_alerts"("temple_id");

-- AddForeignKey
ALTER TABLE "temple_aarti_alerts" ADD CONSTRAINT "temple_aarti_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temple_aarti_alerts" ADD CONSTRAINT "temple_aarti_alerts_temple_id_fkey" FOREIGN KEY ("temple_id") REFERENCES "temples"("id") ON DELETE CASCADE ON UPDATE CASCADE;
