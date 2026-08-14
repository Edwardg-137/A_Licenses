-- AlterTable
ALTER TABLE "Application" ADD COLUMN "formValidation" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "ApplicationDocument" ADD COLUMN "contentCheck" JSONB NOT NULL DEFAULT '{}';
