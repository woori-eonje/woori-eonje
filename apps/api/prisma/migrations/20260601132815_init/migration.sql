-- CreateEnum
CREATE TYPE "MeetingCategory" AS ENUM ('FRIEND', 'STUDY', 'BUSINESS');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'COLLECTING', 'READY_TO_CONFIRM', 'CONFIRMED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ParticipantType" AS ENUM ('MEMBER', 'GUEST');

-- CreateEnum
CREATE TYPE "AvailabilityStatus" AS ENUM ('AVAILABLE', 'MAYBE', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "MeetingCategory" NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "available_start_time" TEXT NOT NULL,
    "available_end_time" TEXT NOT NULL,
    "duration_hours" INTEGER NOT NULL,
    "response_deadline" TIMESTAMP(3) NOT NULL,
    "invite_token" TEXT NOT NULL,
    "invite_token_expires_at" TIMESTAMP(3),
    "confirmed_start_at" TIMESTAMP(3),
    "confirmed_end_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "user_id" INTEGER,
    "guest_name" TEXT NOT NULL,
    "participant_type" "ParticipantType" NOT NULL,
    "edit_token" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_slots" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "slot_start_at" TIMESTAMP(3) NOT NULL,
    "slot_end_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participant_availability" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "participant_id" INTEGER NOT NULL,
    "slot_id" INTEGER NOT NULL,
    "availability_status" "AvailabilityStatus" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participant_availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendation_results" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "available_count" INTEGER NOT NULL,
    "maybe_count" INTEGER NOT NULL,
    "unavailable_count" INTEGER NOT NULL,
    "required_available_count" INTEGER NOT NULL,
    "required_maybe_count" INTEGER NOT NULL,
    "required_unavailable_count" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recommendation_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_state_logs" (
    "id" SERIAL NOT NULL,
    "meeting_id" INTEGER NOT NULL,
    "previous_status" "MeetingStatus",
    "next_status" "MeetingStatus" NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_state_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_invite_token_key" ON "meetings"("invite_token");

-- CreateIndex
CREATE INDEX "meetings_owner_id_idx" ON "meetings"("owner_id");

-- CreateIndex
CREATE INDEX "meetings_status_response_deadline_idx" ON "meetings"("status", "response_deadline");

-- CreateIndex
CREATE UNIQUE INDEX "participants_edit_token_key" ON "participants"("edit_token");

-- CreateIndex
CREATE INDEX "participants_meeting_id_idx" ON "participants"("meeting_id");

-- CreateIndex
CREATE INDEX "availability_slots_meeting_id_slot_start_at_idx" ON "availability_slots"("meeting_id", "slot_start_at");

-- CreateIndex
CREATE UNIQUE INDEX "availability_slots_meeting_id_slot_start_at_key" ON "availability_slots"("meeting_id", "slot_start_at");

-- CreateIndex
CREATE INDEX "participant_availability_meeting_id_idx" ON "participant_availability"("meeting_id");

-- CreateIndex
CREATE UNIQUE INDEX "participant_availability_participant_id_slot_id_key" ON "participant_availability"("participant_id", "slot_id");

-- CreateIndex
CREATE INDEX "recommendation_results_meeting_id_rank_idx" ON "recommendation_results"("meeting_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "recommendation_results_meeting_id_rank_key" ON "recommendation_results"("meeting_id", "rank");

-- CreateIndex
CREATE INDEX "meeting_state_logs_meeting_id_idx" ON "meeting_state_logs"("meeting_id");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_availability" ADD CONSTRAINT "participant_availability_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_availability" ADD CONSTRAINT "participant_availability_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participant_availability" ADD CONSTRAINT "participant_availability_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "availability_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendation_results" ADD CONSTRAINT "recommendation_results_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_state_logs" ADD CONSTRAINT "meeting_state_logs_meeting_id_fkey" FOREIGN KEY ("meeting_id") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
