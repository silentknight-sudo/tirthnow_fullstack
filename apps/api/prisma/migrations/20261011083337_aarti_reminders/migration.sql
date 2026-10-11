-- CreateTable
CREATE TABLE "aarti_reminders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "aarti_schedule_id" UUID NOT NULL,
    "minutes_before" SMALLINT NOT NULL DEFAULT 30,
    "last_occurrence_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "aarti_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "aarti_reminders_aarti_schedule_id_idx" ON "aarti_reminders"("aarti_schedule_id");

-- CreateIndex
CREATE UNIQUE INDEX "aarti_reminders_user_id_aarti_schedule_id_key" ON "aarti_reminders"("user_id", "aarti_schedule_id");

-- AddForeignKey
ALTER TABLE "aarti_reminders" ADD CONSTRAINT "aarti_reminders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "aarti_reminders" ADD CONSTRAINT "aarti_reminders_aarti_schedule_id_fkey" FOREIGN KEY ("aarti_schedule_id") REFERENCES "aarti_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
