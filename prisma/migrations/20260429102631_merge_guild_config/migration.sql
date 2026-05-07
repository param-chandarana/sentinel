/*
  Warnings:

  - You are about to drop the `guild_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "guild_configs";

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "prefix" TEXT NOT NULL DEFAULT '?',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "mod_log_channel" TEXT,
    "ban_log_channel" TEXT,
    "join_log_channel" TEXT,
    "leave_log_channel" TEXT,
    "mute_role" TEXT,
    "counting_channel" TEXT,
    "counting_blacklist_role" TEXT,
    "counting_window_ms" INTEGER NOT NULL DEFAULT 600000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_roles" (
    "guild_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,

    CONSTRAINT "permission_roles_pkey" PRIMARY KEY ("guild_id","category","role_id")
);

-- CreateTable
CREATE TABLE "infractions" (
    "id" SERIAL NOT NULL,
    "case_number" INTEGER NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "moderator_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "duration_seconds" INTEGER,
    "expires_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "role_deleted" BOOLEAN NOT NULL DEFAULT false,
    "dm_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "infractions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_messages" (
    "guild_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "template" TEXT NOT NULL,

    CONSTRAINT "custom_messages_pkey" PRIMARY KEY ("guild_id","action_type")
);

-- CreateTable
CREATE TABLE "invite_cache" (
    "guild_id" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "inviter_id" TEXT,

    CONSTRAINT "invite_cache_pkey" PRIMARY KEY ("guild_id","invite_code")
);

-- CreateTable
CREATE TABLE "dm_queue" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "infraction_id" INTEGER,
    "message_content" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_attempt" TIMESTAMP(3),
    "next_retry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dm_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "infractions_guild_id_case_number_key" ON "infractions"("guild_id", "case_number");

-- AddForeignKey
ALTER TABLE "permission_roles" ADD CONSTRAINT "permission_roles_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "infractions" ADD CONSTRAINT "infractions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_messages" ADD CONSTRAINT "custom_messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invite_cache" ADD CONSTRAINT "invite_cache_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dm_queue" ADD CONSTRAINT "dm_queue_infraction_id_fkey" FOREIGN KEY ("infraction_id") REFERENCES "infractions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
