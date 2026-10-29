-- CreateTable
CREATE TABLE "StaffingRequirementSetting" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "shiftKind" TEXT NOT NULL,
    "requiredEmployees" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffingRequirementSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffingRequirementSetting_dayOfWeek_shiftKind_key" ON "StaffingRequirementSetting"("dayOfWeek", "shiftKind");

-- CreateIndex
CREATE INDEX "StaffingRequirementSetting_dayOfWeek_idx" ON "StaffingRequirementSetting"("dayOfWeek");
