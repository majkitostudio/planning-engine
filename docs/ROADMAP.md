# Roadmapa — Plánovací Engine

> Stav zkontrolovaný 26. 10. 2026 proti kódu. Význam popisků vysvětluje
> [`docs/README.md`](README.md#stavové-popisky).

## 1. Stav jednou větou

Plánovací jádro, doménová validace, AI kontrakt, orchestrátor **a napojení demo UI** jsou hotové a pokryté testy. Reálné volání Gemini není ověřené, potvrzení manažera běží v in-memory registru (nepřetrvává restartem), ukládání plánu do DB neexistuje.

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
| Simulovaný provider & Fáze 2 API | 3 fixture scénáře, `POST /api/planning/run`, `POST /api/planning/confirm` | `lib/planning/simulated/`, `app/api/planning/`; 18 testů |
| UI napojení | `PlanningResult` komponenta, výběr scénáře, badge `SIMULATED`, blokace potvrzení | `components/plan/plan-workspace.tsx`, `planning-result.tsx` |
| Gemini adaptér | serverové volání, strukturovaný JSON, konfigurace v prostředí | `lib/ai/gemini-planning-provider.ts`; 7 unit testů |
| Prisma základ | PostgreSQL datasource a klient bez doménových modelů | `prisma/schema.prisma` |
| CI | lint, typecheck, testy, build a validace Prisma | `.github/workflows/ci.yml` |

Aktuální ověření pracovního stromu (26. 10. 2026):

- `npm run test` — 137 prošlo, 1 přeskočen (integrační Gemini test bez klíče).
- `npm run typecheck` — prošlo.
- `npm run build` — prošlo.
- `npm run db:validate` — schéma je validní.
- `npm run lint` — prošlo bez warningů.

## 3. Implementováno, ale potřebuje ověření nebo potvrzení

| Oblast | Co chybí | Dopad |
| --- | --- | --- |
| Reálné volání Gemini | integrační test se přeskakuje bez `GEMINI_API_KEY` a `RUN_GEMINI_INTEGRATION=1` | adaptér je `IMPLEMENTED`, ale pro reálný provoz `NOT VERIFIED` |
| Výklad OQ21 | „pracovní den“ = kalendářní den s alespoň jednou směnou je `ASSUMPTION` | validace může být přísnější nebo volnější, než manažer čeká |
| Výklad OQ24 | přestávky se nezapočítávají, používají se hrubé časy začátku a konce | soulad s pracovněprávním výkladem není doložený |
| OQ23 | částečně neúplný návrh lze zobrazit, ale potvrzení je blokované | pravidlo je záměrně konservativní do rozhodnutí |
| Význam stavů | `ready_for_review` znamená „validace nic nenašla“, ne schválení | UI to zobrazuje jako „Připraveno ke kontrole“ s tlačítkem potvrzení |
| Plnění `explanations` a `alternatives` | typ je hotový, kvalita výstupu modelu není ověřená | manažer nemusí dostat použitelné vysvětlení |

## 4. Hotové (Fáze 2 – napojení UI na orchestrátor)

Pořadí odpovídá provedené práci.

1. ✅ **Napojit UI na orchestrátor.** Route handlery `POST /api/planning/run` a `/confirm` volají `runPlanning()` přes `run-service.ts`; API klíč zůstává jen na serveru.
2. ✅ **Zobrazit výsledek po vrstvách.** `PlanningResult` komponenta odděluje návrh, výsledek validace a potvrzený stav; zobrazuje změny, pokrytí, nálezy a předpoklady.
3. ✅ **Přidat potvrzení manažera.** `ConfirmedPlan` vzniká až výslovnou akcí v `confirm-service.ts`; `ready_for_review` se netváří jako schváleno; částečný návrh blokován (OQ23).
4. ✅ **Provider režim.** `PLANNING_PROVIDER=simulated|gemini`; bez hodnoty → `ai_not_configured`. Žádný tichý fallback.
5. ✅ **Simulované fixtures.** Tři scénáře (`complete`, `partial`, `unverified`) pro pevný týden; provider selže u jiného týdne/neznámého zaměstnance.
6. ✅ **In-memory registr.** `PlanningRunRegistry` drží výsledky v paměti procesu (`SIMULATED`, `NOT PERSISTED`).
6. ✅ **Testy a CI.** 18 nových testů pro simulované scénáře, provider, server-config, confirmation, view-model, run-service, confirm-service. Vše zeleně.

**Blokátory pro další práci:** žádný technický. Doménová potvrzení (OQ21, OQ24, OQ23) musí předcházet tvrzení, že validace je doménově spolehlivá; reálný Gemini test předchází tvrzení, že AI plánování funguje.

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

- **`patch_orchestrator.mjs` a `patch_orchestrator2.mjs`** jsou untracked
  jednorázové skripty; neměly by se commitovat.
- **Potvrzení manažera** běží v in-memory registru (`SIMULATED`, `NOT PERSISTED`);
  restart serveru ztratí potvrzení. Ukládání do DB je `PLANNED`.
- **Reálné volání Gemini** je `NOT VERIFIED`, dokud neproběhne integrační test
  s klíčem.
- **Doménové pravidla** OQ21, OQ24, OQ23 jsou `ASSUMPTION` / `OPEN QUESTION`;
  validace používá výklad z `DOMAIN_DECISIONS.md`, ale není doménově schválená.

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
- **26. 10. 2026:** lint je zelený; dokumentace a demo UI srovnány se
  skutečným stavem kódu.
- **26. 10. 2026:** **Fáze 2 dokončena** — route handlery `/api/planning/run` a
  `/confirm`, simulovaný provider se třemi scénáři, `PlanningResult` komponenta,
  in-memory registr potvrzení, 18 nových testů, build zelený.

## 9. Odkazy

- [Přehled dokumentace](README.md)
- [Minimální datový kontrakt](PLANNING_CONTRACT.md)
- [Návrh doménové specifikace](DOMAIN_SPECIFICATION.md)
- [Rozhodovací list pro managera](DOMAIN_DECISIONS.md)
- [Architektonická rozhodnutí (ADR)](adr/README.md)
- [Plánovací jádro](../lib/planning/README.md)
- [Projektové instrukce](../AGENTS.md)
