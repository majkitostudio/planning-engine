import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MonthlyRosterTable } from "@/components/plan/monthly-roster-table";
import type { MonthlyView } from "@/components/plan/monthly-planning-panel";

describe("tabulka měsíčního rozpisu", () => {
  it("zobrazuje převzatou směnu s přesným časem i výslovné volno", () => {
    const view = {
      id: "p", mode: "ortools", input: { month: "2026-10", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], planningRange: { startDate: "2026-10-01", endDate: "2026-10-20" }, rosterHistory: { imports: [], days: [
        { employeeId: "e1", date: "2026-10-26", status: "shift", startTime: "08:05", endTime: "16:45" },
        { employeeId: "e1", date: "2026-10-27", status: "off" },
      ] } }, draft: { assignments: [] }, validation: { canConfirm: false },
    } as unknown as MonthlyView;
    const html = renderToStaticMarkup(createElement(MonthlyRosterTable, { view, weekDates: [new Date(2026, 9, 26), new Date(2026, 9, 27)] }));
    expect(html).toContain("08:05");
    expect(html).toContain("16:45");
    expect(html).toContain("Převzatá směna");
    expect(html).toContain("Převzaté volno");
  });
});
