-- AlterTable
ALTER TABLE "guilds" ALTER COLUMN "counting_window_ms" DROP NOT NULL,
ALTER COLUMN "counting_window_ms" DROP DEFAULT;
