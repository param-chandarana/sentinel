/*
  Warnings:

  - The primary key for the `appeal_links` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Changed the type of `action_type` on the `appeal_links` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('BAN', 'KICK', 'MUTE', 'WARN');

-- AlterTable
ALTER TABLE "appeal_links" DROP CONSTRAINT "appeal_links_pkey",
DROP COLUMN "action_type",
ADD COLUMN     "action_type" "ActionType" NOT NULL,
ADD CONSTRAINT "appeal_links_pkey" PRIMARY KEY ("guild_id", "action_type");
