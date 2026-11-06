import { describe, expect, it } from "vitest";

import { CloudflarePlanningProvider } from "./cloudflare-planning-provider";
import { datesInMonth } from "../planning/domain/month";
import { isWeekendDate } from "../planning/domain/time";
import type { MonthlyPlanningInput } from "../planning/domain/month-input";
import type { MonthlyBoundaryData } from "../planning/domain/month-validation";
import { validateMonthlyDraft } from "../planning/monthly-planning";

const SHOULD_RUN =
  Boolean(process.env.CLOUDFLARE_ACCOUNT_ID) &&
  Boolean(process.env.CLOUDFLARE_API_TOKEN) &&
  process.env.RUN_CLOUDFLARE_INTEGRATION === "1";

const MONTH = "2026-11";
const EMPLOYEES = Array.from({ length: 8 }, (_, index) => ({
  id: `synthetic-${index + 1}`,
  displayName: `Syntetický zaměstnanec ${index + 1}`,
  employmentType: "full_time" as const,
}));

/**
 * Smyšlený měsíc pro ověření reálného volání. Neobsahuje skutečné osoby.
 * Obsazení je záměrně malé, aby se návrh vešel do bezplatné kvóty.
 */
function syntheticMonth(): MonthlyPlanningInput {
  const dates = datesInMonth(MONTH);
  return {
    month: MONTH,
    employees: EMPLOYEES,
    absences: [
      {
        id: "absence-synthetic-1",
        employeeId: "synthetic-1",
        from: "2026-11-10",
        to: "2026-11-12",
        type: "vacation",
        status: "approved",
      },
    ],
    availability: [],
    staffingRequirements: dates.flatMap((date) =>
      isWeekendDate(date)
        ? [
            { date, shiftKind: "morning" as const, requiredEmployees: 2 },
            { date, shiftKind: "afternoon" as const, requiredEmployees: 1 },
          ]
        : [
            { date, shiftKind: "morning" as const, requiredEmployees: 4 },
            { date, shiftKind: "afternoon" as const, requiredEmployees: 3 },
          ],
    ),
    instructions: "Syntetické zadání: upřednostni rovnoměrné rozložení směn.",
    shiftRotationPreference: true,
  };
}

const BOUNDARY: MonthlyBoundaryData = {
  before: { complete: false, assignments: [] },
  after: { complete: false, assignments: [] },
};

describe.skipIf(!SHOULD_RUN)("Cloudflare Workers AI integration", () => {
  it(
    "skutečně zavolá Cloudflare AI a vrátí strukturovaný měsíční návrh",
    async () => {
      const input = syntheticMonth();
      const provider = new CloudflarePlanningProvider();

      const draft = await provider.generateMonthlyPlan(input, BOUNDARY);

      expect(draft.month).toBe(MONTH);
      expect(draft.assignments.length).toBeGreaterThan(0);
      const dates = new Set(datesInMonth(MONTH));
      const employeeIds = new Set(EMPLOYEES.map((employee) => employee.id));
      for (const assignment of draft.assignments) {
        expect(dates.has(assignment.date)).toBe(true);
        expect(employeeIds.has(assignment.employeeId)).toBe(true);
      }

      const validation = validateMonthlyDraft(input, draft, BOUNDARY, provider.name);
      expect(["valid", "invalid", "not_verified"]).toContain(validation.status);
      expect(validation.canConfirm).toBe(validation.status === "valid");
    },
    240_000,
  );
});
