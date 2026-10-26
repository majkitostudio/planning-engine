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
- **Mimo zodpovědnost:** databáze, HTTP, Next.js, potvrzení manažera a
  ukládání. Reálné volání modelu zajišťuje adaptér v `lib/ai/`.

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

## Stav

`IMPLEMENTED` a ověřené testy: generické jádro, doménový kontrakt,
`validatePlan()`, AI kontrakt a orchestrátor. `IMPLEMENTED`, ale `NOT VERIFIED`:
reálné volání Gemini (integrační test se bez klíče přeskakuje).

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

1. Výklad „pracovního dne“ pro šest dnů v řadě (OQ21).
2. Zda musí být dva dny volna po víkendu po sobě jdoucí.
3. Způsob zápočtu přestávek (OQ24) — validace používá hrubé časy začátku
   a konce.
4. Zda lze potvrdit částečně neúplný návrh (OQ23).
5. Role, maximální hodiny, zamykání a váhy preferencí (OQ9–OQ14).

## Co dál

1. Napojit UI na `runPlanning()` přes serverovou akci nebo route; klíč zůstává
   jen na serveru.
2. Zobrazit návrh, validaci a potvrzený stav odděleně; `ready_for_review`
   nesmí vypadat jako „hotovo“.
3. Přidat potvrzení manažera a teprve potom ukládání.
4. Doplnit end-to-end test s fake providerem, bez reálné sítě.
