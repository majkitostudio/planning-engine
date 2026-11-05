# Plánovací Engine

Technický repozitář: `planning-engine`

## Účel projektu

Plánovací Engine je záměr **chytrého plánovače směn** pro **zaměstnance call
centra společnosti AAAAuto**, určeného pro **managera telemarketingového
oddělení** (dlouhodobý rozsah **více než 100 zaměstnanců**). Hlavní MVP se
zaměřuje na **celý kalendářní měsíc** a zaměstnance na **plný úvazek**; týdenní
tabulka je pohled do měsíčního návrhu.

**Současná implementace měsíční přiřazení sestavuje lokálním OR-Tools.**
Schváleným záměrem je AI jako hlavní plánovací logika; rozdíl oproti současné
implementaci zůstává otevřený. Nezávislá deterministická validace kontroluje
návrh; chybějící návaznosti zůstávají neověřené. Režim OR-Tools textové pokyny
nevyhodnocuje. Manažer návrh potvrzuje; bez
potvrzení se návrh neaplikuje jako potvrzený plán.

## Stav projektu

Toto je **rozpracovaný technický základ s demo UI**. Nejedná se o hotovou ani
produkční aplikaci.

- Měsíční plánování používá lokální OR-Tools, podporuje návazné podklady a
  doplánování souvislé části měsíce. Manažerská obrazovka již nenabízí ruční
  úpravu návrhu. Syntetická ověření a jejich meze jsou v
  [`docs/ROADMAP.md`](docs/ROADMAP.md); nenahrazují závěrečné testování MVP.
- Plánovací jádro, doménový kontrakt, deterministická validace, AI kontrakt,
  Gemini adaptér, orchestrátor **a napojení demo UI (Fáze 2)** jsou `IMPLEMENTED` a pokryté testy.
- Reálné volání Gemini je `VERIFIED` integračním testem s lokální konfigurací;
  kvalita plánovacího výstupu pro produkční provoz zůstává `NOT VERIFIED`.
- Hlavní UI používá měsíční API pro návrh, novou kontrolu a potvrzení. Starší
  týdenní API zůstává v kódu bez samostatného týdenního UI.
- UI/UX: implementovány 4 vlny polish (přechody, hover/active, focus ringy,
  scrollbary, skeletony, empty-state, mobilní sticky sloupec, responzivní grid,
  prefers-reduced-motion).
- Solver timeout je konfigurovatelný (`PLANNING_SOLVER_TIMEOUT_MS`, výchozí
  120 s, strop 300 s).
- Částečné úvazky (partial contracts) jsou plánované (Milník 7); pilot zatím
  podporuje pouze plné úvazky.
- Stránka Analyzy je zatím placeholder s odkazem na Audit (read-only přehled je
  Milník 2).
- Auth.js podporuje lokální přihlášení a databázové účty; není napojený na CRM.
  Microsoft Entra ID zůstává plánovanou budoucí autentizační bránou.
- Potvrzení manažera a auditní zápis jsou `IMPLEMENTED`; aplikace používá
  explicitní `PLANNING_PERSISTENCE=prisma`. `memory` je pouze testovací režim.
- **Operativní náhrady směn jsou `IMPLEMENTED` / `SIMULATED`.** Syntetický řez
  řeší výpadek na jedné celé směně, tři varianty, deterministický dopad, výběr
  managerem, potvrzení nové verze týdne a minimální audit. Gemini, provozní
  limity a produkční workflow zůstávají `NOT VERIFIED`.
- Prisma obsahuje provozní modely identity, snapshotu běhu a auditu. Migrace a zápis
  potvrzení byly ověřeny v izolované lokální Docker PostgreSQL; produkční DB zůstává
  `NOT VERIFIED`.
- Potvrzené jsou časy směn, pravidlo 35 h odpočinku po šesti dnech a dva dny
  volna po práci o víkendu.
- Repozitář neobsahuje skutečné zaměstnanecké záznamy. Lokální prostředí
  nakonfigurované uživatelem může obsahovat skutečné záznamy; pro syntetický
  integrační průchod se použila oddělená izolovaná databáze. Produkční
  autentizace, databáze a integrace nejsou ověřené ani připravené k nasazení;
  aktuální stav je popsán v [`docs/ROADMAP.md`](docs/ROADMAP.md).

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

Pro aplikační běh nastav `PLANNING_PROVIDER`, případně samostatný
`PLANNING_MONTHLY_PROVIDER=ortools` a `PLANNING_PYTHON_EXECUTABLE` na Python
s lokálně instalovanými závislostmi ze `scripts/requirements-monthly-solver.txt`,
`PLANNING_PERSISTENCE=prisma`,
`DATABASE_URL` a lokální login proměnné (viz `.env.example`). Databázové příkazy
(`db:migrate`, `db:studio`) vyžadují běžící PostgreSQL a před jejich spuštěním je
nutné potvrdit cílovou lokální databázi.

## Dokumentace

- Rozcestník a legenda popisků: [`docs/README.md`](docs/README.md)
- Návrh doménové specifikace: [`docs/DOMAIN_SPECIFICATION.md`](docs/DOMAIN_SPECIFICATION.md)
- Minimální datový kontrakt: [`docs/PLANNING_CONTRACT.md`](docs/PLANNING_CONTRACT.md)
- Rozhodovací list pro managera: [`docs/DOMAIN_DECISIONS.md`](docs/DOMAIN_DECISIONS.md)
- Roadmapa a stav: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Schválený design a rozsah jsou shrnuty v [`docs/DOMAIN_DECISIONS.md`](docs/DOMAIN_DECISIONS.md), [`docs/DOMAIN_SPECIFICATION.md`](docs/DOMAIN_SPECIFICATION.md) a [`docs/ROADMAP.md`](docs/ROADMAP.md). Historické implementační plány byly odstraněny.
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
