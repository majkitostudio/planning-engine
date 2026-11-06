import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import RulesPage from "../app/(app)/pravidla/page";

describe("stránka Pravidla", () => {
  it("zobrazuje potvrzená pravidla a otevřené otázky podle aktuálních rozhodnutí", () => {
    const html = renderToStaticMarkup(RulesPage());

    expect(html).toContain("Potvrzená pravidla");
    expect(html).toContain("Po šesti po sobě jdoucích pracovních dnech");
    expect(html).toContain("Nepotvrzený návrh lze uložit k posouzení");
    expect(html).toContain("Týden se počítá pondělí–neděle");
    expect(html).toContain("Poloviční úvazky jsou v kódu připravené, ale mimo pilot");
    expect(html).toContain("Cloudflare Workers AI");
    expect(html).toContain("skutečná jména i volný text");
    expect(html).not.toContain("Rozsah úvazků není sjednocen");
    expect(html).not.toContain("se návrh neukládá ani neaplikuje");
  });
});
