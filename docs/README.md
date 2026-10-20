# Dokumentace — Plánovací Engine

Technický repozitář: `planning-engine`

Toto je počáteční přehled dokumentace projektu Plánovací Engine.

## Struktura

| Soubor | Obsah | Stav |
| --- | --- | --- |
| `../README.md` | Úvod, účel, stack, stav projektu | `IMPLEMENTED` (scaffold) |
| `../AGENTS.md` | Projektové instrukce pro agenty | `IMPLEMENTED` (scaffold) |
| `../package.json` | Next.js + TypeScript závislosti a skripty | `IMPLEMENTED` (scaffold) |
| `../app/` | Next.js App Router (výchozí obrazovka) | `IMPLEMENTED` (scaffold) |
| `docs/DOMAIN_SPECIFICATION.md` | Návrh doménové specifikace (call centrum) | `PROPOSAL` |
| `lib/planning/README.md` | Základ pro budoucí plánovací logiku | `PLANNED` (prázdný) |
| `../.gitignore` | Ignorované soubory (Node/Next) | `IMPLEMENTED` (scaffold) |
| `docs/README.md` | Tento přehled | `IMPLEMENTED` (scaffold) |

## Zamýšlený účel

Chytrý plánovač směn pro **zaměstnance call centra**, určený pro **managera
telemarketingového oddělení** (Next.js + TypeScript).

Kontext domény je potvrzen (`VERIFIED`), ale doménová pravidla, datový model a
optimalizační cíle zatím nejsou uzavřeny. Návrh najdeš v
[`docs/DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md).

## Stav rozhodnutí

| Oblast | Stav |
| --- | --- |
| Technologický stack | `VERIFIED` — Next.js + TypeScript |
| Kontext domény | `VERIFIED` — plánovač směn call centra pro managera telemarketingu |
| Lokální scaffold | `IMPLEMENTED` |
| Doménová specifikace | `PROPOSAL` — `docs/DOMAIN_SPECIFICATION.md` |
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
