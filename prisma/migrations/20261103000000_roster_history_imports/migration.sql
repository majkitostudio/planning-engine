CREATE TYPE "RosterHistorySource" AS ENUM ('copied_roster', 'manual');

CREATE TYPE "RosterHistoryEntryStatus" AS ENUM ('shift', 'off');

CREATE TABLE "RosterHistoryImport" (
    "id" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "periodStart" TEXT NOT NULL,
    "periodEnd" TEXT NOT NULL,
    "source" "RosterHistorySource" NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RosterHistoryImport_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RosterHistoryImport_period_check" CHECK ("periodStart" <= "periodEnd"),
    CONSTRAINT "RosterHistoryImport_version_check" CHECK ("version" > 0)
);

CREATE TABLE "RosterHistoryImportEmployee" (
    "importId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "RosterHistoryImportEmployee_pkey" PRIMARY KEY ("importId", "employeeId")
);

CREATE TABLE "RosterHistoryEntry" (
    "importId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "RosterHistoryEntryStatus" NOT NULL,
    "startTime" TEXT,
    "endTime" TEXT,

    CONSTRAINT "RosterHistoryEntry_pkey" PRIMARY KEY ("importId", "employeeId", "date"),
    CONSTRAINT "RosterHistoryEntry_time_check" CHECK (
        ("status" = 'shift' AND "startTime" IS NOT NULL AND "endTime" IS NOT NULL AND "startTime" < "endTime")
        OR ("status" = 'off' AND "startTime" IS NULL AND "endTime" IS NULL)
    )
);

CREATE UNIQUE INDEX "RosterHistoryImport_fingerprint_key" ON "RosterHistoryImport"("fingerprint");
CREATE UNIQUE INDEX "RosterHistoryImport_scopeKey_version_key" ON "RosterHistoryImport"("scopeKey", "version");
CREATE INDEX "RosterHistoryImport_periodStart_periodEnd_idx" ON "RosterHistoryImport"("periodStart", "periodEnd");
CREATE INDEX "RosterHistoryImport_createdById_createdAt_idx" ON "RosterHistoryImport"("createdById", "createdAt");
CREATE INDEX "RosterHistoryImportEmployee_employeeId_idx" ON "RosterHistoryImportEmployee"("employeeId");
CREATE INDEX "RosterHistoryEntry_employeeId_date_idx" ON "RosterHistoryEntry"("employeeId", "date");

ALTER TABLE "RosterHistoryImport"
ADD CONSTRAINT "RosterHistoryImport_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RosterHistoryImportEmployee"
ADD CONSTRAINT "RosterHistoryImportEmployee_importId_fkey"
FOREIGN KEY ("importId") REFERENCES "RosterHistoryImport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RosterHistoryImportEmployee"
ADD CONSTRAINT "RosterHistoryImportEmployee_employeeId_fkey"
FOREIGN KEY ("employeeId") REFERENCES "PlanningEmployee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RosterHistoryEntry"
ADD CONSTRAINT "RosterHistoryEntry_importId_employeeId_fkey"
FOREIGN KEY ("importId", "employeeId") REFERENCES "RosterHistoryImportEmployee"("importId", "employeeId") ON DELETE RESTRICT ON UPDATE CASCADE;
