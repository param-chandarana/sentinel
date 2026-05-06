-- Rename custom_messages table to appeal_links and adjust constraints
BEGIN;

ALTER TABLE "custom_messages" RENAME TO "appeal_links";

-- Rename primary key constraint
ALTER TABLE "appeal_links" RENAME CONSTRAINT "custom_messages_pkey" TO "appeal_links_pkey";

-- Rename foreign key constraint on guild_id
ALTER TABLE "appeal_links" RENAME CONSTRAINT "custom_messages_guild_id_fkey" TO "appeal_links_guild_id_fkey";

COMMIT;
