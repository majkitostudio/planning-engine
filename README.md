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
bez potvrzení se návrh neaplikuje jako potvrzený plán.

## Stav projektu

Toto je **rozpracovaný technický základ s demo UI**. Nejedná se o hotovou ani
produkční aplikaci.

- Plánovací jádro, doménový kontrakt, deterministická validace, AI kontrakt,
  Gemini adaptér, orchestrátor **a napojení demo UI (Fáze 2)** jsou `IMPLEMENTED` a pokryté testy.
- Reálné volání Gemini je `VERIFIED` integračním testem s lokální konfigurací;
  kvalita plánovacího výstupu pro produkční provoz zůstává `NOT VERIFIED`.
- **UI je napojené na orchestrátor:** `POST /api/planning/run` spouští běh,
  `POST /api/planning/confirm` potvrzuje návrh; oba kroky vyžadují přihlášení.
- Lokální MVP login gate je `IMPLEMENTED` přes Auth.js credentials provider;
  účet je pouze v `.env.local` a není napojený na CRM. Microsoft Entra ID je
  v kódu ponechané jako `PLANNED` budoucí autentizační brána.
- Potvrzení manažera a auditní zápis jsou `IMPLEMENTED`; aplikace používá
  explicitní `PLANNING_PERSISTENCE=prisma`. `memory` je pouze testovací režim.
- Prisma obsahuje provozní modely identity, snapshotu běhu a auditu. Migrace a zápis
  potvrzení byly ověřeny v izolované lokální Docker PostgreSQL; produkční DB zůstává
  `NOT VERIFIED`.
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
| `lib/ai/` | Serverový Gemini adaptér | `IMPLEMENTED`; reálné volání `VERIFIED`, produkční kvalita `NOT VERIFIED` |
| `lib/auth/`, `auth.ts`, `proxy.ts` | Lokální MVP login gate, role a budoucí Entra adaptér | `IMPLEMENTED` / `PLANNED` |
| `lib/db.ts` | Singleton PrismaClient (technická vrstva) | `IMPLEMENTED` |
| `prisma/` | Prisma konfigurace, provozní modely a migrace | `IMPLEMENTED`; lokální migrace `VERIFIED`, produkční DB `NOT VERIFIED` |
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

Pro aplikační běh nastav `PLANNING_PROVIDER`, `PLANNING_PERSISTENCE=prisma`,
`DATABASE_URL` a lokální login proměnné (viz `.env.example`). Databázové příkazy
(`db:migrate`, `db:studio`) vyžadují běžící PostgreSQL a před jejich spuštěním je
nutné potvrdit cílovou lokální databázi.

## Dokumentace

- Rozcestník a legenda popisků: [`docs/README.md`](docs/README.md)
- Návrh doménové specifikace: [`docs/DOMAIN_SPECIFICATION.md`](docs/DOMAIN_SPECIFICATION.md)
- Minimální datový kontrakt: [`docs/PLANNING_CONTRACT.md`](docs/PLANNING_CONTRACT.md)
- Rozhodovací list pro managera: [`docs/DOMAIN_DECISIONS.md`](docs/DOMAIN_DECISIONS.md)
- Roadmapa a stav: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Instrukce pro agenty: [`AGENTS.md`](AGENTS.md)

## Bezpečnost a hranice

- Žádná produkční databáze ani reálná zaměstnanecká data.
- Přihlášení používá lokální MVP credentials gate bez CRM/Graph integrace;
  není to produkční autentizace. Entra ID je pouze budoucí `PLANNED` varianta.
- Demo scénáře používají syntetická data; kvalita plánovacího výstupu pro produkci
  zůstává `NOT VERIFIED`.
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
