# Plánovací Engine

Technický repozitář: `planning-engine`

## Účel projektu

Plánovací Engine je záměr **chytrého plánovače směn pro zaměstnance call centra**,
určeného pro **managera telemarketingového oddělení**.
Konkrétní doménová pravidla, omezení, optimalizační cíle, datový model a další
role ještě **nejsou schváleny** (návrh v `docs/DOMAIN_SPECIFICATION.md`).

## Stav projektu

Toto je **počáteční technický scaffold**. Nejedná se o hotovou ani produkční aplikaci.

- Plánovací pravidla a doménová logika zatím nejsou schválené ani implementované.
- Projekt neobsahuje skutečná osobní ani zaměstnanecká data.
- Projekt není připraven k produkčnímu provozu.

## Technologický stack

- **Next.js** (App Router) + **TypeScript**
- **React**

Stack-specifické soubory: `package.json`, `tsconfig.json`, `next.config.mjs`,
`app/`, `lib/`.

## Struktura

| Cesta | Popis | Stav |
| --- | --- | --- |
| `app/` | Next.js App Router (výchozí obrazovka) | `IMPLEMENTED` (scaffold) |
| `docs/DOMAIN_SPECIFICATION.md` | Návrh doménové specifikace | `PROPOSAL` |
| `lib/planning/` | Základ pro budoucí plánovací logiku (zatím prázdný) | `PLANNED` |
| `docs/` | Přehled dokumentace | `IMPLEMENTED` (scaffold) |
| `AGENTS.md` | Projektové instrukce pro agenty | `IMPLEMENTED` (scaffold) |

## Vývoj

```bash
npm install
npm run dev
```

Další příkazy: `npm run build`, `npm run start`, `npm run typecheck`.

## Dokumentace

- Přehled: [`docs/README.md`](docs/README.md)
- Návrh doménové specifikace: [`docs/DOMAIN_SPECIFICATION.md`](docs/DOMAIN_SPECIFICATION.md)
- Instrukce pro agenty: [`AGENTS.md`](AGENTS.md)

## Bezpečnost a hranice

- Žádná produkční databáze, žádná autentizace/integrace, žádná reálná data.
- Přístup k externím službám (např. GitHub) vyžaduje samostatné potvrzení.

## Stav informací

| Označení | Význam |
| --- | --- |
| `VERIFIED` | Ověřeno v projektu nebo příkazem |
| `IMPLEMENTED` | Implementováno |
| `PLANNED` | Plánováno, neimplementováno |
| `ASSUMPTION` | Pracovní předpoklad |
| `OPEN QUESTION` | Otevřená otázka |
| `NOT VERIFIED` | Nebylo ověřeno |
| `SIMULATED` | Pouze demonstrační/testovací chování |
| `BLOCKED` | Nelze bezpečně pokračovat bez rozhodnutí |
