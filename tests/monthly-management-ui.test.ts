import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { MonthlyRunsList } from "@/components/plan/monthly-runs-manager";

it("manažer vidí stav jednotlivých rozpisů a může vybrat jejich odstranění", () => {
  const runs = [{ id: "p1", month: "2026-11", confirmed: false, createdAt: "2026-11-01T10:00:00.000Z" }, { id: "p2", month: "2026-11", confirmed: true, createdAt: "2026-11-02T10:00:00.000Z" }];
  const html = renderToStaticMarkup(createElement(MonthlyRunsList, { runs, canManage: true, busy: false, onRemove: () => {} }));
  expect(html).toContain("Návrh");
  expect(html).toContain("Potvrzený");
  expect(html.match(/>Odstranit</g)).toHaveLength(2);
  const viewer = renderToStaticMarkup(createElement(MonthlyRunsList, { runs, canManage: false, busy: false, onRemove: () => {} }));
  expect(viewer).not.toContain(">Odstranit<");
});
