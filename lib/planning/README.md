# Plánovací logika — čistá vrstva (`lib/planning/`)

Tento adresář obsahuje **plánovací logiku oddělenou od Next.js i databáze**.
Vrstva je testovatelná samostatně (Vitest), bez běžící databáze a bez reálné
sítě. Volání AI je schované za rozhraním; konkrétní poskytovatel je v `lib/ai/`.

## Odpovědnosti vrstvy

- **Vstup:** týden, zaměstnanci, definice směn, potřebné obsazení, absence,
  požadavky, existující směny, pravidla a historie.
- **Výstup:** `PlanningRunResult` s návrhem, změnami, pokrytím, výsledkem
  nezávislé validace a stavem `not_verified` / `needs_changes` /
  `ready_for_review`. `confirmed` je vždy `false`.
- **Mimo zodpovědnost čistého jádra:** databázové připojení a autentizace.
  HTTP API, potvrzení a perzistenční adaptér jsou serverové vrstvy nad jádrem.

## Co je v adresáři

| Soubor | Obsah |
| --- | --- |
| `types.ts` | Generické kontrakty: zdroj návrhu, návrh plánu, pravidlo, výsledek kontroly. |
| `control.ts` | `runControl()` — spustí sadu pravidel nad návrhem a vrátí výsledek. |
| `control.test.ts` | Unit testy generického jádra. |
| `ai-provider.ts` | `PlanningModelProvider`, `AiProviderError`, `isPlanDraft()` — provider-neutral AI kontrakt. |
| `orchestrator.ts` | `runPlanning()` — vstup → AI → validace → změny a pokrytí. |
| `orchestrator.test.ts` | Testy orchestrace s fake providerem. |
| `index.ts` | Veřejné API jádra: generické typy, doména, AI kontrakt a orchestrátor. |
| `domain/types.ts` | Doménový kontrakt prvního týdne a typy výsledku. |
| `domain/confirmed.ts` | Potvrzené časy směn, pravidla a pomocné funkce. |
| `domain/time.ts` | Datum, místní časy, časová zóna a intervaly směn. |
| `domain/validation.ts` | `validatePlan()` — deterministická validace týdenního návrhu. |
| `domain/index.ts` | Veřejné API doménového kontraktu a validace. |
| `domain/confirmed.test.ts` | Testy potvrzených časů a pravidel. |
| `domain/validation.test.ts` | Testy validace na syntetických datech. |
| `domain/input-validation.test.ts` | Testy kontroly vstupu před AI. |
| `domain/plan-draft-validation.test.ts` | Testy strukturální a sémantické kontroly `PlanDraft`. |
| `domain/duplicate-assignments.test.ts` | Testy deduplikace pokrytí a změn. |
| `simulated/scenarios.ts` | Tři fixture scénáře pro pevný týden 5.–11. 10. 2026 (`complete`, `partial`, `unverified`). |
| `simulated/scenarios.test.ts` | Testy fixture scénářů. |
| `simulated/provider.ts` | `SimulatedPlanningProvider` — vrací fixture, odmítá jiný týden/neznámého zaměstnance. |
| `simulated/provider.test.ts` | Testy simulovaného providera. |
| `provider-factory.ts` | `createPlanningProvider()` — explicitní výběr `simulated` nebo `gemini`, žádný fallback. |
| `server-config.ts` | `getPlanningRuntime()` — čte `PLANNING_PROVIDER`, vrací režim a scénarios. |
| `runtime-types.ts` | `PlanningProviderMode` — `simulated` | `gemini`. |
| `run-registry.ts` | `PlanningRunRegistry` — in-memory registr běhů (`SIMULATED`, `NOT PERSISTED`). |
| `confirmation.ts` | `evaluateConfirmation()`, `createConfirmedPlan()` — pravidla blokování potvrzení (OQ23). |
| `persistence.ts` | Snapshot běhu, potvrzení a auditní zápis; in-memory test double a Prisma adaptér. |
| `persistence-runtime.ts` | Explicitní výběr `prisma` pro aplikaci nebo `memory` pro testy; žádný fallback. |
| `view-model.ts` | `toPlanningRunView()` — mapuje `PlanningRunResult` na serializovatelný UI model. |
| `run-service.ts` | `executePlanningRun()` — testovatelná logika běhu plánování (bez Next.js). |
| `run-service.test.ts` | Testy spuštění běhu pro všechny tři scénáře. |
| `confirm-service.ts` | `confirmRun()` — testovatelná logika potvrzení manažera. |
| `confirm-service.test.ts` | Testy potvrzení pro všechny stavy. |
| `api-types.ts` | Sdílené typy odpovědí HTTP API (`PlanningRunApiResponse`, `PlanningConfirmApiResponse`). |

## Tok

```text
PlanningInput
  → kontrola vstupu (orchestrátor)
  → AI poskytovatel (v produkci Gemini, v testech fake)
  → kontrola PlanDraft (struktura + vazba na vstup)
  → validatePlan() s doménovými pravidly
  → změny a pokrytí
  → PlanningRunResult k posouzení manažerem
```

Poslední krok je záměrně **mimo jádro**: `runPlanning()` nic neukládá a
nenastavuje `confirmed: true`. `ready_for_review` znamená „validace nic
nenašla“, ne schválení.

## Co orchestrátor ověřuje

1. **Vstup před voláním AI** — `weekStart` je pondělí, `timeZone` je platná
   IANA zóna, zaměstnanci mají `id` a `full_time`, tvary všech polí odpovídají
   kontraktu. Neplatný vstup končí jako `invalid_input`.
2. **Strukturu `PlanDraft`** — `isPlanDraft()` kontroluje kalendářní data,
   témata vysvětlení, úplnost alternativ a typy polí. Povolené hodnoty
   `shiftKind` nekontroluje; neznámou směnu řeší až `validatePlan()`.
3. **Vazbu výstupu na vstup** — orchestrátor odmítne jen neshodu `weekStart`
   (`ai_invalid_output`). Neznámý zaměstnanec, den mimo týden nebo neznámá
   směna jdou do `validatePlan()` a vrátí `needs_changes` s nálezy
   v `validation.problems`.

Chybějící AI je `ai_not_configured`, ne prázdný plán. Selhání poskytovatele
je `PlanningFailure`, ne tichý `not_verified`.

## Fáze 2 — API a UI napojení

- **Route handlery:** `app/api/planning/run/route.ts` (POST), `app/api/planning/confirm/route.ts` (POST).
- **Serverová stránka:** `app/(app)/planovani/page.tsx` — `force-dynamic`, `runtime: nodejs`, předává `PlanningRuntime` klientovi.
- **Klientská komponenta:** `components/plan/plan-workspace.tsx` — spouští běh, zobrazuje výsledek, potvrzuje.
- **Výsledková komponenta:** `components/plan/planning-result.tsx` — tři vrstvy (návrh, validace, potvrzení), změny, pokrytí, vysvětlení, blokátory potvrzení.
- **Provider režim:** `PLANNING_PROVIDER=simulated|gemini`; bez hodnoty → `ai_not_configured`.
- **Simulované fixtures:** tři scénáře pro týden 5.–11. 10. 2026; provider selže u jiného týdne.
- **Perzistence:** route handler po běhu ukládá snapshot do Prisma a při potvrzení zapisuje `ConfirmedPlan` a auditní událost. `memory` je pouze testovací režim.
- **Potvrzení:** endpoint vyžaduje přihlášení a roli `manager`; povoleno jen při `ready_for_review` + `complete`; `partial` blokováno (`VERIFIED`, OQ23).

## Stav

`IMPLEMENTED` a ověřené testy: generické jádro, doménový kontrakt,
`validatePlan()`, AI kontrakt, orchestrátor, **Fáze 2 API a UI** a integrační
volání Gemini jsou `IMPLEMENTED` a ověřené. `NOT VERIFIED` zůstává kvalita
plánovacího výstupu pro produkční provoz.

- Generické jádro zná tři stavy kontroly: `no_problems_found`,
  `problems_found` a `not_verified`. `not_verified` se nesmí číst jako úspěch,
  bezpečnost ani schválení.
- Doménový kontrakt prvního týdne je `PROPOSAL` k ověření, ne úplná doménová
  specifikace. Potvrzené časy a pravidla jsou zafixované
  v `domain/confirmed.ts`.
- `validatePlan()` kontroluje pokrytí, překryvy (i přes půlnoc), schválené
  absence, odpočinek po šesti dnech a dva dny volna po víkendu. Návrh
  neopravuje ani nemění.
- Výsledek rozlišuje `valid`, `invalid` a `not_verified`. Chybějící historie,
  chybějící požadavek nebo nejasný výklad vedou k `not_verified`, ne k tichému
  úspěchu.

## Rozhodnutí (ADR)

- [ADR 0001 — Doménově nezávislé plánovací jádro](../../docs/adr/0001-domenove-nezavisle-jadro.md)
- [ADR 0002 — Tři stavy kontroly](../../docs/adr/0002-tri-stavy-kontroly.md)
- [ADR 0003 — Zdroj návrhu není schválení](../../docs/adr/0003-zdroj-navrhu-neni-schvaleni.md)
- [ADR 0004 — Chyba pravidla se nepolyká](../../docs/adr/0004-chyba-pravidla-se-nepolyka.md)
- [ADR 0005 — AI navrhuje, validace ověřuje, manažer potvrzuje](../../docs/adr/0005-ai-navrhuje-validace-overuje.md)

Index a pravidla zápisu: [`docs/adr/README.md`](../../docs/adr/README.md).

## Otevřené otázky

Tyto otázky nebrání prvnímu řezu, ale nesmí se z nich stát tichý předpoklad:

1. Zda musí být dva dny volna po víkendu po sobě jdoucí.
2. Role, maximální hodiny, zamykání a váhy preferencí (OQ9–OQ14).
