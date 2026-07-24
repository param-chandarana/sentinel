-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE 'TIMEOUT';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PermissionCommand" ADD VALUE 'MANAGEINFRACTIONS';
ALTER TYPE "PermissionCommand" ADD VALUE 'TIMEOUT';
