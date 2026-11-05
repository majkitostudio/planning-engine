CREATE TYPE "PlanningEmploymentType" AS ENUM ('full_time', 'part_time');

ALTER TABLE "PlanningEmployee"
ADD COLUMN "employmentType" "PlanningEmploymentType" NOT NULL DEFAULT 'full_time';
