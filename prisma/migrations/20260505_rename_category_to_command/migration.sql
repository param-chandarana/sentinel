-- Create the PermissionCommand enum type
CREATE TYPE "PermissionCommand" AS ENUM ('BAN', 'KICK', 'MUTE', 'WARN');

-- Rename the category column to command and change its type
ALTER TABLE "permission_roles" 
  RENAME COLUMN "category" TO "command";

-- Alter the column to use the new enum type
ALTER TABLE "permission_roles" 
  ALTER COLUMN "command" TYPE "PermissionCommand" USING "command"::"PermissionCommand";

-- Add NOT NULL constraint
ALTER TABLE "permission_roles" 
  ALTER COLUMN "command" SET NOT NULL;
