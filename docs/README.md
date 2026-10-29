# Dokumentace — Plánovací Engine

Technický repozitář: `planning-engine`

Rozcestník dokumentace. Každý dokument má jednu hlavní odpovědnost a podrobnosti
jiných dokumentů neopakuje.

## Kde co hledat

| Dokument | Odpovídá na | Stav |
| --- | --- | --- |
| [`../README.md`](../README.md) | Co projekt je, jaký je stav a jak ho spustit | `IMPLEMENTED` |
| [`../AGENTS.md`](../AGENTS.md) | Pravidla práce coding agenta a meze autonomie | `IMPLEMENTED` |
| [`ROADMAP.md`](ROADMAP.md) | Co je hotové, co chybí a co dělat dál | `IMPLEMENTED` (pracovní plán) |
| [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) | Tok vstup → AI → validace → manažer a tvary rozhraní | `PROPOSAL` (kontrakt) / `IMPLEMENTED` (kód) |
| [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) | Doménový model a pravidla s mírou potvrzení | `PARTIALLY VERIFIED PROPOSAL` |
| [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) | Otevřené otázky a odpovědi managera | `PARTIALLY ANSWERED` |
| [`adr/`](adr/README.md) | Proč jsou technická rozhodnutí taková | `IMPLEMENTED` |
| [`superpowers/specs/2026-10-29-operativni-nahrady-design.md`](superpowers/specs/2026-10-29-operativni-nahrady-design.md) | Schválený záměr další fáze operativních náhrad | `VERIFIED` / `PROPOSAL` |
| [`superpowers/plans/2026-10-29-operativni-nahrady.md`](superpowers/plans/2026-10-29-operativni-nahrady.md) | Implementační pořadí operativních náhrad | `PLANNED` |
| [`../lib/planning/README.md`](../lib/planning/README.md) | Co skutečně obsahuje plánovací jádro | `IMPLEMENTED` |
| [`../prisma/schema.prisma`](../prisma/schema.prisma) | Provozní modely identity, běhu a auditu; doménové modely stále chybí | `IMPLEMENTED` (lokální migrace `VERIFIED`, produkční DB `NOT VERIFIED`) |

## Aktuální stav

| Oblast | Stav | Poznámka |
| --- | --- | --- |
| Next.js aplikace a routy | `IMPLEMENTED` | App Router, TypeScript, React |
| Demo UI | `IMPLEMENTED` / `DEMO` | Syntetická data z `lib/demo-data.ts` |
| Generické plánovací jádro | `IMPLEMENTED` | `lib/planning/types.ts`, `control.ts` |
| Doménový kontrakt | `IMPLEMENTED` | `lib/planning/domain/`; kontrakt je `PROPOSAL` k ověření |
| Deterministická validace | `IMPLEMENTED` | `validatePlan()`; testy procházejí |
| AI kontrakt | `IMPLEMENTED` | `lib/planning/ai-provider.ts` |
| Gemini adaptér | `IMPLEMENTED` / `VERIFIED` | `lib/ai/gemini-planning-provider.ts`; integrační volání prošlo, produkční kvalita výstupu `NOT VERIFIED` |
| Orchestrace | `IMPLEMENTED` | `runPlanning()` spojuje návrh, validaci a změny |
| Napojení UI na orchestrátor | `IMPLEMENTED` / `DEMO` | `POST /api/planning/run`, `PlanningResult`; vstupy jsou simulované fixtures |
| Přihlášení a role | `IMPLEMENTED` / `VERIFIED` (lokální smoke) | Lokální Auth.js credentials gate pro MVP byl ověřen přes browser; produkční úroveň a Entra ID zůstávají `NOT VERIFIED`/`PLANNED` |
| Potvrzení manažera | `IMPLEMENTED` | `POST /api/planning/confirm`, manager-only, blokace částečných/neověřených návrhů |
| Ukládání běhů a potvrzení | `IMPLEMENTED` / `VERIFIED` (lokální Docker smoke) | Prisma snapshot a `ConfirmedPlan`; migrace a zápis potvrzení byly ověřeny v izolované lokální PostgreSQL |
| Audit potvrzení | `IMPLEMENTED` / `VERIFIED` (lokální Docker smoke) | Zápis `planning.confirmed` byl ověřen; čtecí pohled je `IMPLEMENTED` pro managera a ukazuje pouze tato potvrzení |
| Operativní náhrada směny | `PLANNED` | Schválený další řez: výpadek konkrétní směny → tři AI varianty → výběr → validace → potvrzení; kód zatím neexistuje |
| Testy | `IMPLEMENTED` / `VERIFIED` | Jádro, služby a route handlery mají testy; plný UI/E2E test není součástí dema |
| Kvalitní brána (CI) | `IMPLEMENTED` | Lint, typecheck, testy, build a Prisma validace procházejí |
| Produkční připravenost | `NOT VERIFIED` | Není produkční aplikace |

## Stavové popisky

| Popisek | Význam |
| --- | --- |
| `IMPLEMENTED` | Kód nebo typ existuje. Neznamená, že chování je ověřené. |
| `VERIFIED` | Konkrétní chování je doložené testem, příkazem nebo potvrzeným rozhodnutím. |
| `ASSUMPTION` | Pracovní předpoklad, který nikdo nepotvrdil. |
| `OPEN QUESTION` | Čeká na rozhodnutí nebo chybějící informaci. |
| `PLANNED` | Implementace zatím neexistuje. |

Pomocné popisky: `NOT VERIFIED` (neověřeno), `DEMO`/`SIMULATED` (jen
demonstrační chování), `PARTIALLY ...` (částečně), `SUPERSEDED` (nahrazeno),
`BLOCKED` (nelze pokračovat bez rozhodnutí).

`IMPLEMENTED` a `VERIFIED` se neslučují: implementovaná funkce může být
neověřená a naopak.

## Otevřené otázky

Plný seznam OQ1–OQ24 je v [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md);
odpovědi a varianty sbírá [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md). OQ21,
OQ23 a OQ24 jsou pro první řez uzavřené. Pro operativní náhrady jsou nejdůležitější:

1. Která další pravidla a limity platí (OQ9–OQ11), zejména maximum hodin/směn?
2. Jak se rozlišuje provozní výpadek, schválená absence a přání (OQ22)?
3. Jak se mají vážit a porovnávat varianty náhrady (OQ12–OQ14, OQ17)?
4. Jak podrobný má být audit operativní změny (OQ20)?

## Aktuální target po kontrolním checkpointu

Následující kroky zachycují aktuální target a jeho ověření; položky označené
✅ jsou dokončené v uvedeném rozsahu.

1. ✅ **Sjednotit zdroj pravdy o stavu.** Opravit zastaralé texty v dashboardu,
   které stále tvrdí, že napojení UI a kontrola výsledku chybí. Po změně znovu
   ověřit, že `README.md`, `docs/README.md`, `docs/ROADMAP.md` a obrazovka
   používají stejné stavové popisky.
2. ✅ **Zpevnit demo tok testy.** Route-handler testy pokrývají nekonfigurovaný
   provider, úspěšný simulovaný běh, neúplný návrh, neověřený scénář a
   potvrzení včetně chybových větví.
3. ✅ **Odstranit nejasnost kolem simulovaného týdne.** Demo UI u jiného týdne
   předem zobrazuje stav `DEMO` a výpočet na API neodesílá.
4. ✅ **Uzavřít doménová rozhodnutí před rozšířením.** OQ21, OQ23 a OQ24
   jsou potvrzené pro první řez; jejich omezení zůstávají popsána v doménové
   dokumentaci.
5. ✅ **Připravit technickou hranici MVP.** Reálné volání Gemini je ověřené,
   lokální login gate chrání aplikaci a běh/potvrzení/audit mají perzistenční
   vrstvu. Lokální Docker smoke je `VERIFIED`; produkční autentizace a připojení
   k produkční PostgreSQL zůstávají `NOT VERIFIED`.
6. ✅ **Přidat samostatné provozní uložení.** Snapshoty běhů, potvrzené plány
   a auditní události mají Prisma adaptér; migrace a živé lokální DB připojení
   jsou `VERIFIED` v izolovaném Docker prostředí. Produkční DB zůstává
   `NOT VERIFIED`.

7. ✅ **Připravit návrh operativních náhrad.** Schválený design vymezuje jeden
   syntetický týdenní řez: výpadek na celé směně, tři varianty, výběr,
   deterministická validace a potvrzení bez automatické aplikace.

8. **Uzavřít rozhodovací brány pro operativní řez.** Před rozšířením typů je
   potřeba potvrdit zejména OQ10, OQ22 a rozsah auditu OQ20. Dokud nejsou
   dodány hodnoty limitů, systém je nesmí vydávat za ověřené.

9. **Implementovat první vertikální řez operativní náhrady.** Pořadí a
   akceptační kontroly jsou v [implementačním plánu](superpowers/plans/2026-10-29-operativni-nahrady.md).

Produkční autentizace, produkční PostgreSQL, Entra, Outlook, CRM a přenos do
rosteru zůstávají `DEFERRED` a nejsou součástí tohoto targetu.
