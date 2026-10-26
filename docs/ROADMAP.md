# Roadmapa — Plánovací Engine

> Stav zkontrolovaný 26. 10. 2026 proti kódu. Význam popisků vysvětluje
> [`docs/README.md`](README.md#stavové-popisky).

## 1. Stav jednou větou

Plánovací jádro, doménová validace, AI kontrakt a orchestrátor jsou hotové a
pokryté testy. Reálné volání Gemini není ověřené, UI na orchestrátor napojené
není, potvrzení manažera ani ukládání plánu neexistuje.

## 2. Implementováno a doložitelně ověřeno

| Oblast | Co existuje | Doklad |
| --- | --- | --- |
| Next.js aplikace | App Router, routy, produkční build | `app/`, `npm run build` |
| Demo UI | dashboard a pracovní plocha se syntetickými daty | `components/`, `lib/demo-data.ts` |
| Generické jádro | kontrakty, `runControl()`, tři stavy kontroly | `lib/planning/types.ts`, `control.ts`; 16 testů |
| Doménový kontrakt | typy prvního týdne, potvrzené časy a pravidla | `lib/planning/domain/`, `PLANNING_CONTRACT.md` |
| Deterministická validace | `validatePlan()`: vstup, pokrytí, překryvy, absence, odpočinek, víkend | `domain/validation.ts`; 54 testů v `domain/` |
| AI kontrakt | `PlanningModelProvider`, `AiProviderError`, `isPlanDraft()` | `lib/planning/ai-provider.ts` |
| Orchestrace | `runPlanning()`: vstup → AI → validace → změny a pokrytí | `lib/planning/orchestrator.ts`; 12 testů |
| Gemini adaptér | serverové volání, strukturovaný JSON, konfigurace v prostředí | `lib/ai/gemini-planning-provider.ts`; 7 unit testů |
| Prisma základ | PostgreSQL datasource a klient bez doménových modelů | `prisma/schema.prisma` |
| CI | lint, typecheck, testy, build a validace Prisma | `.github/workflows/ci.yml` |

Aktuální ověření pracovního stromu (26. 10. 2026):

- `npm run test` — 90 prošlo, 1 přeskočen (integrační Gemini test bez klíče).
- `npm run typecheck` — prošlo.
- `npm run build` — prošlo.
- `npm run db:validate` — schéma je validní.
- `npm run lint` — **neprošlo**: 5 warningů (nepoužité importy v
  `ai-provider.ts`, `orchestrator.ts` a testech). Vada kódu, viz §7.

## 3. Implementováno, ale potřebuje ověření nebo potvrzení

| Oblast | Co chybí | Dopad |
| --- | --- | --- |
| Reálné volání Gemini | integrační test se přeskakuje bez `GEMINI_API_KEY` a `RUN_GEMINI_INTEGRATION=1` | adaptér je `IMPLEMENTED`, ale pro reálný provoz `NOT VERIFIED` |
| Výklad OQ21 | „pracovní den“ = kalendářní den s alespoň jednou směnou je `ASSUMPTION` | validace může být přísnější nebo volnější, než manažer čeká |
| Výklad OQ24 | přestávky se nezapočítávají, používají se hrubé časy začátku a konce | soulad s pracovněprávním výkladem není doložený |
| OQ23 | částečně neúplný návrh lze zobrazit, ale potvrzení není rozhodnuté | chybí pravidlo, co smí manažer potvrdit |
| Význam stavů | `ready_for_review` znamená „validace nic nenašla“, ne schválení | UI to musí zobrazit jinak než „hotovo“ |
| Plnění `explanations` a `alternatives` | typ je hotový, kvalita výstupu modelu není ověřená | manažer nemusí dostat použitelné vysvětlení |

## 4. Nejbližší práce pro užitečné MVP

Pořadí je návrh podle závislostí, ne závazný plán.

1. **Napojit UI na orchestrátor.** Serverová akce nebo route zavolá
   `runPlanning()` s `GeminiPlanningProvider`; API klíč zůstává jen na serveru.
2. **Zobrazit výsledek po vrstvách.** Oddělit návrh, výsledek validace a
   potvrzený stav; zobrazit změny, pokrytí, nálezy a předpoklady.
3. **Přidat potvrzení manažera.** `ConfirmedPlan` vzniká až výslovnou akcí;
   `ready_for_review` se nesmí tvářit jako schváleno.
4. **Rozhodnout ukládání.** Buď potvrzení v paměti pro první řez, nebo
   minimální Prisma modely. Modely navrhnout až podle potvrzeného kontraktu.
5. **Doplnit end-to-end test.** UI → server → fake provider → validace →
   potvrzení, bez reálné sítě.
6. **Dořešit OQ21, OQ24 a OQ23.** Teprve potom lze vydávat výsledek validace
   za doménově spolehlivý.

Blokátory: žádný netvrdí, že nelze pokračovat. Doménová potvrzení ale musí
předcházet tvrzení, že validace je správná; reálný Gemini test zase předchází
tvrzení, že AI plánování funguje.

## 5. Pozdější rozšíření

- Více týdnů nebo měsíční rozsah.
- Částečné úvazky, pokud je manažer potvrdí.
- Role a dovednosti jako povinná data.
- Váhy preferencí a optimalizační cíle.
- Import/export a integrace (Countdown CRM je jen budoucí směr).
- Autentizace, role a audit.
- Ukládání historie a zamykání přiřazení.

## 6. Otevřené otázky

- Výklad „pracovního dne“ pro pravidlo šesti dnů v řadě (OQ21).
- Zda musí být dva dny volna po víkendu po sobě jdoucí.
- Způsob zápočtu přestávek (OQ24).
- Zda lze potvrdit částečně neúplný návrh (OQ23).
- Role, maximální hodiny, zamykání přiřazení (OQ9–OQ11).
- Zpracování požadavků a preferencí (OQ12–OQ14, OQ22).
- Statický vs. průběžně upravovaný plán (OQ2).
- Způsob zadávání vstupů a tvar výstupu (OQ6–OQ8).
- Role, schvalovací tok a audit (OQ18–OQ20).
- Vizuální detaily demo UI (barva odpolední směny, avatary, ikona
  „Nesplněné požadavky“) — `OPEN QUESTION`; zdrojem pravdy je
  `app/globals.css`.

Podrobnosti a místo pro odpovědi: [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md).

## 7. Známé vady a dluhy

Tyto body jsou mimo dokumentační rozsah a nejsou opravené:

- **Lint neprochází.** Pět warningů `@typescript-eslint/no-unused-vars`
  (nepoužité importy a pomocné funkce): `lib/planning/ai-provider.ts`
  (nepoužitý `IsoDate`), `lib/planning/orchestrator.ts` (nepoužitý `addDays`)
  a tři v testech. Dokud to platí, CI brána je červená.
- **`package.json` popisuje „měsíční rozpisy“**, ale první řez je týdenní.
- **`lib/planning/ai-provider.ts` je untracked**, přestože je součástí jádra.
- **`patch_orchestrator.mjs` a `patch_orchestrator2.mjs`** jsou untracked
  jednorázové skripty; neměly by se commitovat.

## 8. Historie

- **22.–23. 10. 2026:** generické jádro a ADR 0001–0004, doménový kontrakt,
  první deterministická validace.
- **24. 10. 2026:** potvrzená rozhodnutí (AI jako hlavní logika, časy směn,
  odpočinek, víkend); Gemini adaptér a orchestrátor.
- **22. 10. 2026:** vizuální revize demo UI commitnuta (`de6d4f0`); zdrojem
  pravdy je `app/globals.css`, ne starší vizuální zadání.
- **Následně:** code review — hluboká validace vstupu před AI, deduplikace
  pokrytí a změn, dvouvrstvá kontrola `PlanDraft` a doplněné testy.
- **26. 10. 2026:** sjednocení dokumentace na pět dokumentů a ADR; zrušeny
  duplicitní souhrny a historické tasky.

## 9. Odkazy

- [Přehled dokumentace](README.md)
- [Minimální datový kontrakt](PLANNING_CONTRACT.md)
- [Návrh doménové specifikace](DOMAIN_SPECIFICATION.md)
- [Rozhodovací list pro managera](DOMAIN_DECISIONS.md)
- [Architektonická rozhodnutí (ADR)](adr/README.md)
- [Plánovací jádro](../lib/planning/README.md)
- [Projektové instrukce](../AGENTS.md)
