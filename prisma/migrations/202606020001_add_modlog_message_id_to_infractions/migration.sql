ALTER TABLE "infractions"
ADD COLUMN IF NOT EXISTS "modlog_message_id" TEXT;
