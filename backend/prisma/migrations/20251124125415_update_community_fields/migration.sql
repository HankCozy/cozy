-- AlterTable: Rename columns and add accountOwner
ALTER TABLE "Community" RENAME COLUMN "name" TO "organization";
ALTER TABLE "Community" RENAME COLUMN "description" TO "division";
ALTER TABLE "Community" ADD COLUMN "accountOwner" TEXT;
