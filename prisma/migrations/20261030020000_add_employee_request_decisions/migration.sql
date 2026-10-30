-- CreateEnum
CREATE TYPE "EmployeeRequestDecisionStatus" AS ENUM ('approved', 'rejected');

-- CreateTable
CREATE TABLE "EmployeeRequestDecision" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "status" "EmployeeRequestDecisionStatus" NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedById" TEXT NOT NULL,

    CONSTRAINT "EmployeeRequestDecision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeRequestDecision_requestId_key" ON "EmployeeRequestDecision"("requestId");

-- CreateIndex
CREATE INDEX "EmployeeRequestDecision_decidedById_decidedAt_idx" ON "EmployeeRequestDecision"("decidedById", "decidedAt");

-- AddForeignKey
ALTER TABLE "EmployeeRequestDecision" ADD CONSTRAINT "EmployeeRequestDecision_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "AppUser"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
