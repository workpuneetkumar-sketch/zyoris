CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMembership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Deal" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Revenue" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "MarketingSpend" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "Inventory" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "ChatSession" ADD COLUMN "organizationId" TEXT;

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

CREATE INDEX "OrganizationMembership_organizationId_roleId_idx" ON "OrganizationMembership"("organizationId", "roleId");
CREATE INDEX "OrganizationMembership_userId_idx" ON "OrganizationMembership"("userId");
CREATE INDEX "RefreshToken_userId_organizationId_idx" ON "RefreshToken"("userId", "organizationId");
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");
CREATE INDEX "Deal_organizationId_stage_idx" ON "Deal"("organizationId", "stage");
CREATE INDEX "Deal_organizationId_createdAt_idx" ON "Deal"("organizationId", "createdAt");
CREATE INDEX "Revenue_organizationId_date_idx" ON "Revenue"("organizationId", "date");
CREATE INDEX "Expense_organizationId_date_idx" ON "Expense"("organizationId", "date");
CREATE INDEX "MarketingSpend_organizationId_date_idx" ON "MarketingSpend"("organizationId", "date");
CREATE INDEX "Inventory_organizationId_createdAt_idx" ON "Inventory"("organizationId", "createdAt");
CREATE INDEX "ChatSession_organizationId_updatedAt_idx" ON "ChatSession"("organizationId", "updatedAt");

ALTER TABLE "User"
    ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
    ADD CONSTRAINT "AuditLog_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationMembership"
    ADD CONSTRAINT "OrganizationMembership_roleId_fkey"
    FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RefreshToken"
    ADD CONSTRAINT "RefreshToken_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Deal"
    ADD CONSTRAINT "Deal_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Revenue"
    ADD CONSTRAINT "Revenue_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Expense"
    ADD CONSTRAINT "Expense_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MarketingSpend"
    ADD CONSTRAINT "MarketingSpend_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Inventory"
    ADD CONSTRAINT "Inventory_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ChatSession"
    ADD CONSTRAINT "ChatSession_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "Role" ("id", "name", "description", "createdAt", "updatedAt")
SELECT 'role_manager', 'MANAGER', 'Manager role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'MANAGER');

INSERT INTO "Role" ("id", "name", "description", "createdAt", "updatedAt")
SELECT 'role_sales_user', 'SALES_USER', 'Sales user role', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "name" = 'SALES_USER');