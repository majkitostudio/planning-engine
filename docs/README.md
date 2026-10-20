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
| `lib/planning/README.md` | Základ pro budoucí plánovací logiku | `PLANNED` (prázdný) |
| `../.gitignore` | Ignorované soubory (Node/Next) | `IMPLEMENTED` (scaffold) |
| `docs/README.md` | Tento přehled | `IMPLEMENTED` (scaffold) |

## Zamýšlený účel

Základ budoucího plánovacího nebo směnovacího enginu (Next.js + TypeScript).
Doménová pravidla, datový model, optimalizační cíle a technologický stack
jsou zatím neuzavřeny — stack je vybraný, doména ne.

## Stav rozhodnutí

| Oblast | Stav |
| --- | --- |
| Technologický stack | `VERIFIED` — Next.js + TypeScript |
| Lokální scaffold | `IMPLEMENTED` |
| Plánovací pravidla | `OPEN QUESTION` — neimplementovány |
| Datový model | `OPEN QUESTION` — neurčen |
| Uživatelské role | `OPEN QUESTION` — neurčeny |
| Vzdálený repozitář GitHub | `PLANNED` — vytvoření čeká na potvrzení |
| Produkční připravenost | `NOT VERIFIED` — není produkční |

## Otevřené otázky pro další fázi

1. Jaká jsou doménová pravidla plánování/směn?
2. Jaký je datový model a rozdělení uživatelských rolí?
3. Jaké optimalizační cíle a omezení se mají respektovat?
4. Má se vytvořit a napojit vzdálený repozitář GitHub?
