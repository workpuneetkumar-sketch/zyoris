-- Step 1: Drop the old role column first (this will also drop the dependency on the enum)
ALTER TABLE "User" DROP COLUMN "role";

-- Step 2: Drop the old enum
DROP TYPE IF EXISTS "Role";

-- Step 3: Create the Role table
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- Create unique index
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- Insert default roles with specific IDs for easier reference
INSERT INTO "Role" ("id", "name", "description", "createdAt", "updatedAt") VALUES
    ('role_admin', 'ADMIN', 'Administrator role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_ceo', 'CEO', 'Chief Executive Officer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_cfo', 'CFO', 'Chief Financial Officer', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_sales_head', 'SALES_HEAD', 'Sales Head', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('role_operations_head', 'OPERATIONS_HEAD', 'Operations Head', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Step 4: Add roleId column as nullable first
ALTER TABLE "User" ADD COLUMN "roleId" TEXT;

-- Step 5: Set default roleId for existing users (ADMIN)
UPDATE "User" SET "roleId" = 'role_admin' WHERE "roleId" IS NULL;

-- Step 6: Make roleId NOT NULL
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;

-- Step 7: Add foreign key constraint
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
