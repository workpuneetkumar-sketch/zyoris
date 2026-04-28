CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'CLOSED');
CREATE TYPE "LeadActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'NOTE_ADDED', 'ASSIGNED', 'UPDATED');

CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "company" TEXT,
  "city" TEXT,
  "source" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "assignedToId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadTag" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadNote" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "note" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadActivity" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "type" "LeadActivityType" NOT NULL,
  "message" TEXT NOT NULL,
  "createdById" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadStatusHistory" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "fromStatus" "LeadStatus",
  "toStatus" "LeadStatus" NOT NULL,
  "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadAssignment" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "assignedToId" TEXT NOT NULL,
  "assignedById" TEXT,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedFilter" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "filterJson" JSONB NOT NULL,
  "isShared" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SavedFilter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LeadTag_leadId_label_key" ON "LeadTag"("leadId", "label");

CREATE INDEX "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");
CREATE INDEX "Lead_organizationId_assignedToId_idx" ON "Lead"("organizationId", "assignedToId");
CREATE INDEX "Lead_organizationId_createdAt_idx" ON "Lead"("organizationId", "createdAt");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_phone_idx" ON "Lead"("phone");

CREATE INDEX "LeadTag_label_idx" ON "LeadTag"("label");
CREATE INDEX "LeadNote_leadId_createdAt_idx" ON "LeadNote"("leadId", "createdAt");
CREATE INDEX "LeadActivity_leadId_createdAt_idx" ON "LeadActivity"("leadId", "createdAt");
CREATE INDEX "LeadActivity_type_idx" ON "LeadActivity"("type");
CREATE INDEX "LeadStatusHistory_leadId_changedAt_idx" ON "LeadStatusHistory"("leadId", "changedAt");
CREATE INDEX "LeadAssignment_leadId_assignedAt_idx" ON "LeadAssignment"("leadId", "assignedAt");
CREATE INDEX "LeadAssignment_assignedToId_idx" ON "LeadAssignment"("assignedToId");
CREATE INDEX "SavedFilter_organizationId_userId_idx" ON "SavedFilter"("organizationId", "userId");

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD CONSTRAINT "Lead_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadTag"
  ADD CONSTRAINT "LeadTag_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadNote"
  ADD CONSTRAINT "LeadNote_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadNote"
  ADD CONSTRAINT "LeadNote_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
  ADD CONSTRAINT "LeadActivity_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadActivity"
  ADD CONSTRAINT "LeadActivity_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadStatusHistory"
  ADD CONSTRAINT "LeadStatusHistory_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadAssignment"
  ADD CONSTRAINT "LeadAssignment_leadId_fkey"
  FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadAssignment"
  ADD CONSTRAINT "LeadAssignment_assignedToId_fkey"
  FOREIGN KEY ("assignedToId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "LeadAssignment"
  ADD CONSTRAINT "LeadAssignment_assignedById_fkey"
  FOREIGN KEY ("assignedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SavedFilter"
  ADD CONSTRAINT "SavedFilter_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedFilter"
  ADD CONSTRAINT "SavedFilter_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;