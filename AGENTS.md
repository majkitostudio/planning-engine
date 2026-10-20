# AGENTS.md — Plánovací Engine

Tento soubor obsahuje projektové instrukce pro agenty pracující na projektu
**Plánovací Engine** (technicky `planning-engine`).

## Samostatnost projektu

- Projekt je samostatný. Nepřenášej do něj strukturu, názvy, databázová pravidla,
  obchodní logiku, kód ani dokumentaci z jiných projektů.
- Pokud najdeš cizí nebo nesouvisející soubory, nepřepisuj je. Upozorni uživatele.

## Zákaz domýšlení doménové logiky

- Nevymýšlej plánovací pravidla, směnová pravidla ani optimalizační funkce.
- Nevytvářej skutečná zaměstnanecká nebo osobní data.
- Plán, návrh či simulaci nevydávej za hotovou funkcionalitu.
- Rozlišuj: požadavek / předpoklad / návrh / ověřený fakt.

## Povinnost ověřování

- Po každé smysluplné změně spusť dostupný lint, typecheck, test či build.
- Pokud příkaz v projektu neexistuje, uveď to.
- Pokud testy selžou, neoznačuj úkol za dokončený.
- Nikdy netvrď, že něco funguje, pokud to neověříš.

## Bezpečnostní hranice

- Nevypisuj tajné klíče, tokeny, hesla ani obsah `.env`.
- Nevkládej tajné údaje do repozitáře.
- Nepoužívej produkční databázi ani produkční služby bez explicitního potvrzení.
- Nepředstírej, že simulované zabezpečení či aplikace je skutečné / produkční.
- Při práci mimo pracovní adresář vysvětli důvod a vyžádej potvrzení.

## GitHub a externí operace

- Operace na GitHubu považuj za externí změny.
- Před vytvořením nebo změnou vzdáleného repozitáře ověř `git`, `gh`, `gh auth status`,
  aktivní účet, oprávnění a existenci cílového repozitáře.
- Zobraz přesný cíl, viditelnost a plánované operace a vyžádej potvrzení.
- Nepoužívej `git reset --hard`, `git checkout --`, force push ani hromadné mazání
  bez výslovného pokynu.
- Nikdy nevypisuj token (`gh auth token` apod.).

## Technologický stack

- Next.js (App Router) + TypeScript + React.
- Příkazy: `npm run dev`, `npm run build`, `npm run start`, `npm run typecheck`.

## Aktuální stav projektu

- **Plánovací Engine je počáteční technický scaffold (Next.js + TypeScript).**
- Plánovací pravidla a doménová logika: neimplementovány (`lib/planning/` je zatím
  prázdný základ).
- Doménová specifikace: návrh v `docs/DOMAIN_SPECIFICATION.md` (`PROPOSAL`) — kontext
  domény (plánovač směn call centra pro managera telemarketingu) je `VERIFIED`,
  pravidla a entity zatím ne.
- Stav informací označuj popisky (`VERIFIED`, `PLANNED`, `ASSUMPTION`,
  `OPEN QUESTION`, `NOT VERIFIED`, `SIMULATED`, `BLOCKED`).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
