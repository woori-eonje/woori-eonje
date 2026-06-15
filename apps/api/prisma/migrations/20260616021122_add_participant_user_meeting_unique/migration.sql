-- CreateIndex
CREATE UNIQUE INDEX "participants_user_id_meeting_id_key" ON "participants"("user_id", "meeting_id");
