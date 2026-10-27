# Plánovací Engine

Technický repozitář: `planning-engine`

## Účel projektu

Plánovací Engine je záměr **chytrého plánovače směn** pro **zaměstnance call
centra společnosti AAAAuto**, určeného pro **managera telemarketingového
oddělení** (dlouhodobý rozsah **více než 100 zaměstnanců**). První funkční verze
se zaměřuje na **jeden týden** a zaměstnance na **plný úvazek**.

**AI je hlavní plánovací logika**: sestavuje konkrétní návrh směn, vyhodnocuje
požadavky, absence, dostupnost a obsazení a navrhuje řešení problémů.
Deterministická validace návrh nezávisle kontroluje. Manažer návrh potvrzuje;
bez potvrzení se nic neukládá.

## Stav projektu

Toto je **rozpracovaný technický základ s demo UI**. Nejedná se o hotovou ani
produkční aplikaci.

- Plánovací jádro, doménový kontrakt, deterministická validace, AI kontrakt,
  Gemini adaptér, orchestrátor **a napojení demo UI (Fáze 2)** jsou `IMPLEMENTED` a pokryté testy.
- Reálné volání Gemini je `NOT VERIFIED` (integrační test se bez klíče
  přeskakuje).
- **UI je napojené na orchestrátor:** `POST /api/planning/run` spouští běh,
  `POST /api/planning/confirm` potvrzuje návrh; potvrzení běží v in-memory registru.
- Potvrzení manažera funguje (in-memory, `SIMULATED`, `NOT PERSISTED`); `ConfirmedPlan` vzniká až výslovnou akcí.
- Ukládání do DB je `PLANNED`; v Prisma nejsou doménové modely.
- Potvrzené jsou časy směn, pravidlo 35 h odpočinku po šesti dnech a dva dny
  volna po práci o víkendu.
- Projekt neobsahuje skutečná osobní ani zaměstnanecká data a není připraven
  k produkčnímu provozu. Aktuální pracovní strom prochází lintem, typecheckem,
  testy i buildem (viz [`docs/ROADMAP.md`](docs/ROADMAP.md)).

## Technologický stack

- **Next.js** (App Router) + **TypeScript**
- **React**
- **PostgreSQL** + **Prisma**

Stack-specifické soubory: `package.json`, `tsconfig.json`, `next.config.mjs`,
`prisma/`, `lib/`, `app/`.

## Struktura

| Cesta | Popis | Stav |
| --- | --- | --- |
| `app/` | Next.js App Router a obrazovky | `IMPLEMENTED` |
| `components/` | Demo UI dashboardu a pracovní plochy | `IMPLEMENTED` (`DEMO`) |
| `lib/planning/` | Plánovací jádro, doménový kontrakt, AI kontrakt a orchestrátor | `IMPLEMENTED` |
| `lib/planning/domain/` | Doménové typy, potvrzené časy a deterministická validace | `IMPLEMENTED` |
| `lib/ai/` | Serverový Gemini adaptér | `IMPLEMENTED`; reálné volání `NOT VERIFIED` |
| `lib/db.ts` | Singleton PrismaClient (technická vrstva) | `IMPLEMENTED` |
| `prisma/` | Prisma konfigurace a schéma (bez doménových modelů) | `IMPLEMENTED` (technický základ) |
| `lib/**/*.test.ts` | Testy (Vitest) vedle testovaného kódu | `IMPLEMENTED` |
| `docs/` | Dokumentace a ADR | `IMPLEMENTED` |
| `AGENTS.md` | Projektové instrukce pro agenty | `IMPLEMENTED` |
| `eslint.config.mjs` | ESLint (Next.js + TypeScript pravidla) | `IMPLEMENTED` |
| `.github/workflows/ci.yml` | CI: lint, typecheck, testy, build, validace Prisma | `IMPLEMENTED` |

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

- Rozcestník a legenda popisků: [`docs/README.md`](docs/README.md)
- Návrh doménové specifikace: [`docs/DOMAIN_SPECIFICATION.md`](docs/DOMAIN_SPECIFICATION.md)
- Minimální datový kontrakt: [`docs/PLANNING_CONTRACT.md`](docs/PLANNING_CONTRACT.md)
- Rozhodovací list pro managera: [`docs/DOMAIN_DECISIONS.md`](docs/DOMAIN_DECISIONS.md)
- Roadmapa a stav: [`docs/ROADMAP.md`](docs/ROADMAP.md)
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
