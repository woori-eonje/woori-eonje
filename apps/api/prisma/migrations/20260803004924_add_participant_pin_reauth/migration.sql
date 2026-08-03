/*
  Warnings:

  - A unique constraint covering the columns `[meeting_id,normalized_guest_name]` on the table `participants` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "participants" ADD COLUMN     "normalized_guest_name" TEXT,
ADD COLUMN     "pin_failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pin_hash" TEXT,
ADD COLUMN     "pin_locked_until" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "participants_meeting_id_normalized_guest_name_key" ON "participants"("meeting_id", "normalized_guest_name");
