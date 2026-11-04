import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlanWorkspace } from "@/components/plan/plan-workspace";
import { EmployeesManager } from "@/components/employees-manager";
import DashboardPage from "@/app/(app)/page";
import { StaffingSettingsForm } from "@/components/settings/staffing-settings-form";
import { staffingSettingsPersistenceNotice } from "@/lib/settings-view";

describe("obrazovka plánování", () => {
  it("nabízí měsíční plán bez ukázkových filtrů a seznamů", () => {
    const html = renderToStaticMarkup(createElement(PlanWorkspace, { runtime: { configured: true, mode: "ortools" }, canManage: true, initialStaffing: null, staffingProfileStatus: "unavailable" }));
    expect(html).toContain("Návrh rozpisu");
    expect(html).toContain("Měsíční rozpis zatím není k dispozici");
    expect(html).not.toContain("Filtry a doplňující ukázkové přehledy");
    expect(html).not.toContain("Syntetický ukázkový seznam");
  });

  it("zobrazuje přehled bez interních stavů poskytovatelů", () => {
    const html = renderToStaticMarkup(createElement(DashboardPage));
    expect(html).toContain("Podle zadaných zaměstnanců, nepřítomností, dostupnosti a obsazení.");
    expect(html).not.toContain("simulovaně nebo přes AI");
    expect(html).not.toContain("SIMULATED");
    expect(html).not.toContain("produkční provoz");
  });

  it("používá čitelné ovládání správy zaměstnanců a nastavení obsazení", () => {
    const employees = renderToStaticMarkup(createElement(EmployeesManager, { canManage: true }));
    expect(employees).toContain("Přidat zaměstnance");
    expect(employees).toContain("btn--primary");
    const settings = renderToStaticMarkup(createElement(StaffingSettingsForm, {
      initialSettings: [], canEdit: true, persistenceConfigured: true, profileStatus: "missing", savedSettingsCount: 0, notice: null,
    }));
    expect(settings).toContain("Upravte potřebný počet lidí pro jednotlivé směny.");
    expect(settings).toContain("Týdenní profil není uložen.");
    expect(settings).not.toContain("lokální výpočty");
    expect(settings).not.toContain("MANAGER");
    expect(staffingSettingsPersistenceNotice(false)).toBe("Ukládání není v tomto prostředí dostupné; hodnoty se nyní neuloží.");
    expect(staffingSettingsPersistenceNotice(false)).not.toMatch(/PLANNING_PERSISTENCE|DATABASE_URL/);
  });
});
