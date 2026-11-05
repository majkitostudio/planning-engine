import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RulesPage from "../app/(app)/pravidla/page";

describe("stránka Pravidla", () => {
  it("zobrazuje potvrzená pravidla a neprezentuje otevřené rozpory jako jistotu", () => {
    const html = renderToStaticMarkup(RulesPage());

    expect(html).toContain("Potvrzená pravidla");
    expect(html).toContain("Po šesti po sobě jdoucích pracovních dnech");
    expect(html).toContain("Nepotvrzený návrh lze uložit k posouzení");
    expect(html).toContain("Výklad týdne jako pondělí–neděle je zatím pracovní předpoklad");
    expect(html).not.toContain("Rozsah úvazků není sjednocen");
    expect(html).toContain("Poloviční úvazek: ve všední den ranní 7:45–15:00");
    expect(html).toContain("o víkendu smí pracovat v plné délce víkendové směny");
    expect(html).toContain("Režim OR-Tools nevyhodnocuje doplňující textové pokyny");
    expect(html).not.toContain("se návrh neukládá ani neaplikuje");
  });
});
