-- Rename counting columns to remove _id suffix
DO $$
BEGIN
	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'guilds'
		  AND column_name = 'counting_channel_id'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'guilds'
		  AND column_name = 'counting_channel'
	) THEN
		ALTER TABLE "guilds" RENAME COLUMN "counting_channel_id" TO "counting_channel";
	END IF;

	IF EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'guilds'
		  AND column_name = 'counting_blacklist_role_id'
	) AND NOT EXISTS (
		SELECT 1
		FROM information_schema.columns
		WHERE table_schema = 'public'
		  AND table_name = 'guilds'
		  AND column_name = 'counting_blacklist_role'
	) THEN
		ALTER TABLE "guilds" RENAME COLUMN "counting_blacklist_role_id" TO "counting_blacklist_role";
	END IF;
END $$;
