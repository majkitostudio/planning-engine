# Dokumentace — Plánovací Engine

Technický repozitář: `planning-engine`

Toto je počáteční přehled dokumentace projektu Plánovací Engine.

## Struktura

| Soubor | Obsah | Stav |
| --- | --- | --- |
| `../README.md` | Úvod, účel, stack, stav projektu | `IMPLEMENTED` (scaffold) |
| `../AGENTS.md` | Projektové instrukce pro agenty | `IMPLEMENTED` (scaffold) |
| `../package.json` | Závislosti a skripty | `IMPLEMENTED` |
| `../app/` | Next.js App Router (výchozí obrazovka) | `IMPLEMENTED` (scaffold) |
| `docs/DOMAIN_SPECIFICATION.md` | Návrh doménové specifikace (call centrum) | `PROPOSAL` |
| `docs/DOMAIN_DECISIONS.md` | Rozhodovací list pro managera (otázky, varianty, sběr odpovědí) | `OPEN QUESTION` (čeká na odpovědi) |
| `docs/ROADMAP.md` | Praktická roadmapa a To-Do pro OpenCode | `IMPLEMENTED` (pracovní plán) |
| `docs/OPEN_CODE_PLANNING_CORE_TASK.md` | První task: pravidlově nezávislá kostra plánovacího jádra | `PLANNED` |
| `docs/OPEN_CODE_VISUAL_TASK.md` | Starší zadání vizuální revize (překonáno realizovaným vizuálem) | `SUPERSEDED` |
| `../app/globals.css` | Vizuální systém (chladná paleta, komponenty) | `IMPLEMENTED` (demo vizuál) |
| `../prisma/` | Prisma konfigurace a schéma (bez doménových modelů) | `IMPLEMENTED` (technický základ) |
| `../lib/db.ts` | Singleton PrismaClient (technická vrstva) | `IMPLEMENTED` |
| `../vitest.config.mts` | Konfigurace testů (Vitest) | `IMPLEMENTED` |
| `../tests/` | Testy (Vitest) | `IMPLEMENTED` (smoke test) |
| `../lib/planning/README.md` | Čistá plánovací vrstva — kontrakty a běh pravidel | `IMPLEMENTED` (kostra) |
| `../eslint.config.mjs` | ESLint konfigurace (Next.js + TypeScript) | `IMPLEMENTED` |
| `../.github/workflows/ci.yml` | CI: lint, typecheck, testy, build, validace Prisma | `IMPLEMENTED` |
| `../.gitignore` | Ignorované soubory (Node/Next/Prisma) | `IMPLEMENTED` |
| `docs/README.md` | Tento přehled | `IMPLEMENTED` |

## Zamýšlený účel

Chytrý plánovač **měsíčních rozpisů směn** pro **zaměstnance call centra společnosti
AAAAuto**, určený pro **managera telemarketingového oddělení** (rozsah **více než
100 zaměstnanců**).

Technologický stack: **Next.js, React, TypeScript, PostgreSQL, Prisma**.

Kontext domény i technologický směr jsou potvrzeny (`VERIFIED`), ale doménová
pravidla, datový model a optimalizační cíle zatím nejsou uzavřeny. Návrh najdeš v
[`docs/DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md).
Praktický postup po prioritách je v [`docs/ROADMAP.md`](ROADMAP.md). První
implementační zadání pro OpenCode je v
[`docs/OPEN_CODE_PLANNING_CORE_TASK.md`](OPEN_CODE_PLANNING_CORE_TASK.md).

## Stav rozhodnutí

| Oblast | Stav |
| --- | --- |
| Technologický stack | `VERIFIED` — Next.js + React + TypeScript + PostgreSQL + Prisma |
| Kontext domény | `VERIFIED` — měsíční rozpisy směn call centra AAAAuto pro managera telemarketingu (100+ zaměstnanců) |
| Lokální scaffold | `IMPLEMENTED` |
| Testovací základ (Vitest) | `IMPLEMENTED` |
| Databázová vrstva (Prisma) | `IMPLEMENTED` — technický základ, bez doménových modelů |
| Doménová specifikace | `PROPOSAL` — `docs/DOMAIN_SPECIFICATION.md` |
| Rozhodovací list pro managera | `OPEN QUESTION` — `docs/DOMAIN_DECISIONS.md`, čeká na odpovědi |
| Roadmapa / To-Do | `IMPLEMENTED` — `docs/ROADMAP.md`; obecné plánovací jádro lze připravit před doménovými rozhodnutími |
| Plánovací jádro (kostra) | `IMPLEMENTED` — `lib/planning/`: kontrakty a běh pravidel, bez doménových typů |
| Kvalitní brána (CI) | `IMPLEMENTED` — ESLint + GitHub Actions (lint, typecheck, testy, build, validace Prisma) |
| Plánovací pravidla | `OPEN QUESTION` — neimplementovány |
| Datový model | `OPEN QUESTION` — neurčen |
| Uživatelské role | `OPEN QUESTION` — primární role (manager) potvrzena |
| Vzdálený repozitář GitHub | `IMPLEMENTED` — `majkitostudio/planning-engine` (private) |
| Produkční připravenost | `NOT VERIFIED` — není produkční |

## Otevřené otázky pro další fázi

Plný seznam otázek (OQ1–OQ20) je v
[`docs/DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md). Mezi nejblokujícíjší patří:

1. Co se plánuje — **vyřešeno**: směny zaměstnanců call centra.
2. Je plán statický, nebo průběžně upravovaný?
3. Která pravidla jsou skutečně tvrdá (H1–H7) a jaké limity mají?
4. Které entity a atributy jsou povinné (role, kapacita směny, dovednosti, kampaň)?

Pro praktické vyplnění s managerem slouží
[`docs/DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) — varianty odpovědí, dopad na
kód a místo na odpověď. Do vyplnění zůstávají doménové typy a pravidla `BLOCKED`.
