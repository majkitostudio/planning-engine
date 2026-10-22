# Plánovací Engine

Technický repozitář: `planning-engine`

## Účel projektu

Plánovací Engine je záměr **chytrého plánovače měsíčních rozpisů směn** pro
**zaměstnance call centra společnosti AAAAuto**, určeného pro **managera
telemarketingového oddělení** (rozsah **více než 100 zaměstnanců**).
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
- **PostgreSQL** + **Prisma**

Stack-specifické soubory: `package.json`, `tsconfig.json`, `next.config.mjs`,
`prisma/`, `lib/`, `app/`.

## Struktura

| Cesta | Popis | Stav |
| --- | --- | --- |
| `app/` | Next.js App Router (výchozí obrazovka) | `IMPLEMENTED` (scaffold) |
| `docs/DOMAIN_SPECIFICATION.md` | Návrh doménové specifikace | `PROPOSAL` |
| `prisma/` | Prisma konfigurace a schéma (bez doménových modelů) | `IMPLEMENTED` (technický základ) |
| `lib/db.ts` | Singleton PrismaClient (technická vrstva) | `IMPLEMENTED` |
| `lib/planning/` | Čistá plánovací logika (kontrakty a běh pravidel, bez domény) | `IMPLEMENTED` (kostra) |
| `eslint.config.mjs` | ESLint (Next.js + TypeScript pravidla) | `IMPLEMENTED` |
| `.github/workflows/ci.yml` | CI: lint, typecheck, testy, build, validace Prisma | `IMPLEMENTED` |
| `tests/` | Testy (Vitest) | `IMPLEMENTED` (smoke) |
| `docs/` | Přehled dokumentace | `IMPLEMENTED` (scaffold) |
| `AGENTS.md` | Projektové instrukce pro agenty | `IMPLEMENTED` (scaffold) |

## Vývoj

```bash
npm install        # nainstaluje závislosti a vygeneruje Prisma klienta
npm run dev
```

Další příkazy: `npm run lint`, `npm run lint:fix`, `npm run build`, `npm run start`,
`npm run typecheck`, `npm run test`, `npm run test:watch`, `npm run db:generate`,
`npm run db:validate`, `npm run db:migrate`, `npm run db:studio`.

Databázové příkazy (`db:migrate`, `db:studio`) vyžadují běžící PostgreSQL a nastavenou
proměnnou `DATABASE_URL` (viz `.env.example`).

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
