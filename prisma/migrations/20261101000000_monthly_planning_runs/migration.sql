CREATE TABLE "MonthlyPlanningRun" (
  "id" TEXT NOT NULL,
  "month" TEXT NOT NULL,
  "providerName" TEXT NOT NULL,
  "mode" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "draft" JSONB NOT NULL,
  "confirmedAt" TIMESTAMP(3),
  "confirmedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MonthlyPlanningRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MonthlyPlanningRun_month_idx" ON "MonthlyPlanningRun"("month");
CREATE INDEX "MonthlyPlanningRun_confirmedById_idx" ON "MonthlyPlanningRun"("confirmedById");
ALTER TABLE "MonthlyPlanningRun" ADD CONSTRAINT "MonthlyPlanningRun_confirmedById_fkey"
  FOREIGN KEY ("confirmedById") REFERENCES "AppUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
