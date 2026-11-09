import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MonthlyRosterTable } from "@/components/plan/monthly-roster-table";
import type { MonthlyView } from "@/components/plan/monthly-planning-panel";

describe("tabulka měsíčního rozpisu", () => {
  it("zobrazuje všechny dny měsíce a přesné údaje převzaté směny i volna", () => {
    const view = {
      id: "p", mode: "ortools", input: { month: "2026-10", employees: [{ id: "e1", displayName: "Test", employmentType: "full_time" }], planningRange: { startDate: "2026-10-01", endDate: "2026-10-20" }, rosterHistory: { imports: [], days: [
        { employeeId: "e1", date: "2026-10-26", status: "shift", startTime: "08:05", endTime: "16:45" },
        { employeeId: "e1", date: "2026-10-27", status: "off" },
      ] } }, draft: { assignments: [] }, validation: { canConfirm: false },
    } as unknown as MonthlyView;
    const html = renderToStaticMarkup(createElement(MonthlyRosterTable, { view }));
    expect((html.match(/<th[^>]*aria-label=/g) ?? [])).toHaveLength(31);
    expect(html).toContain("2026-10-31");
    expect(html).toContain("08:05");
    expect(html).toContain("16:45");
    expect(html).toContain("Převzatá směna");
    expect(html).toContain("Převzaté volno");
    expect(html).toContain("Neznámé / nedokončené");
  });

  it("zobrazuje směny s časy v nápovědě a neoznačí prázdnou neověřenou buňku jako volno", () => {
    const view = {
      id: "p", mode: "ortools",
      input: { month: "2026-11", employees: [{ id: "e1", displayName: "Test", employmentType: "part_time" }] },
      draft: { assignments: [
        { employeeId: "e1", date: "2026-11-02", shiftKind: "morning" },
        { employeeId: "e1", date: "2026-11-07", shiftKind: "morning" },
      ] },
      validation: { canConfirm: false },
    } as unknown as MonthlyView;
    const html = renderToStaticMarkup(createElement(MonthlyRosterTable, { view }));

    expect(html).toContain("Ranní 07:45–15:00");
    expect(html).toContain("Ranní 07:45–16:30");
    expect(html).toContain("aria-label=\"Neznámé nebo nedokončené\"");
    expect(html).not.toContain("aria-label=\"Volno\"");
  });

  it("označí volnem pouze prázdné buňky úplného návrhu s validní kontrolou", () => {
    const view = {
      id: "p", mode: "cloudflare",
      input: { month: "2026-11", employees: [{ id: "e1", displayName: "Syntetický zaměstnanec", employmentType: "full_time" }] },
      draft: { assignments: [{ employeeId: "e1", date: "2026-11-02", shiftKind: "morning" }] },
      validation: { status: "valid", canConfirm: true },
    } as unknown as MonthlyView;
    const html = renderToStaticMarkup(createElement(MonthlyRosterTable, { view }));

    expect(html).toContain("aria-label=\"Volno\"");
    expect(html).toContain("Ranní 07:45–16:30");
  });
});
