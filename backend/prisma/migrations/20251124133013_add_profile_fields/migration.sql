-- AlterTable: Add profile fields to User
ALTER TABLE "User" ADD COLUMN "profileSummary" TEXT;
ALTER TABLE "User" ADD COLUMN "profilePublished" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "profileAnswers" JSONB;
