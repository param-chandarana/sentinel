-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "guild_configs" (
    "guild_id" TEXT NOT NULL,
    "blacklist_role_id" TEXT,
    "counting_channel" TEXT,
    "window_ms" INTEGER NOT NULL DEFAULT 600000,
    "prefix" TEXT NOT NULL DEFAULT '?',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_configs_pkey" PRIMARY KEY ("guild_id")
);

