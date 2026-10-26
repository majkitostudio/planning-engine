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
| [`../lib/planning/README.md`](../lib/planning/README.md) | Co skutečně obsahuje plánovací jádro | `IMPLEMENTED` |
| [`../prisma/schema.prisma`](../prisma/schema.prisma) | Databázový základ bez doménových modelů | `IMPLEMENTED` (technický základ) |

## Aktuální stav

| Oblast | Stav | Poznámka |
| --- | --- | --- |
| Next.js aplikace a routy | `IMPLEMENTED` | App Router, TypeScript, React |
| Demo UI | `IMPLEMENTED` / `DEMO` | Syntetická data z `lib/demo-data.ts` |
| Generické plánovací jádro | `IMPLEMENTED` | `lib/planning/types.ts`, `control.ts` |
| Doménový kontrakt | `IMPLEMENTED` | `lib/planning/domain/`; kontrakt je `PROPOSAL` k ověření |
| Deterministická validace | `IMPLEMENTED` | `validatePlan()`; testy procházejí |
| AI kontrakt | `IMPLEMENTED` | `lib/planning/ai-provider.ts` |
| Gemini adaptér | `IMPLEMENTED` | `lib/ai/gemini-planning-provider.ts`; reálné volání `NOT VERIFIED` |
| Orchestrace | `IMPLEMENTED` | `runPlanning()` spojuje návrh, validaci a změny |
| Napojení UI na orchestrátor | `PLANNED` | Tlačítko výpočtu je zatím demo |
| Potvrzení manažera | `PLANNED` | `confirmed` je vždy `false` |
| Ukládání plánu | `PLANNED` | Bez doménových modelů v Prisma |
| Testy | `IMPLEMENTED` | 90 prochází, 1 integrační se přeskakuje |
| Kvalitní brána (CI) | `IMPLEMENTED` | Aktuální strom neprochází lintem; viz `ROADMAP.md` |
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
odpovědi a varianty sbírá [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md). První
týdenní řez není blokovaný, ale tyto otázky zůstávají:

1. Co je „pracovní den“ pro šest dnů v řadě (OQ21)?
2. Jak se započítávají přestávky (OQ24)?
3. Může manažer potvrdit částečně neúplný návrh (OQ23)?
4. Která další pravidla a limity platí (OQ9–OQ11)?
5. Jak se zpracovávají preference a požadavky (OQ12–OQ14, OQ22)?
6. Je plán statický, nebo průběžně upravovaný (OQ2)?
