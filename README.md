# Plánovací Engine

Technický repozitář: `planning-engine`

## Účel projektu

Plánovací Engine je **nekomerční ukázkový projekt pro jednoho manažera**
(`VERIFIED`, 6. 11. 2026). Jde o záměr **chytrého plánovače směn** pro
zaměstnance call centra, určeného pro managera telemarketingového oddělení
(dlouhodobý rozsah **více než 100 zaměstnanců**). Hlavní MVP se zaměřuje na
**celý kalendářní měsíc** a zaměstnance na **plný úvazek**; týdenní tabulka je
pohled do měsíčního návrhu. Poloviční úvazky jsou v kódu implementované, ale
podle rozhodnutí z 6. 11. 2026 zůstávají **mimo pilot**.

**Cílové nasazení je Vercel Hobby (zdarma, nekomerční) se stávající Neon Free
databází.** Online plánování má zajistit Cloudflare Workers AI; lokální
OR-Tools zůstává pro offline běh. Nezávislá deterministická validace kontroluje
návrh; chybějící návaznosti zůstávají neověřené. Manažer návrh potvrzuje; bez
potvrzení se návrh neaplikuje jako potvrzený plán.

## Stav projektu

Toto je **rozpracovaný technický základ s demo UI**. Nejedná se o hotovou ani
produkční aplikaci.

- Měsíční plánování lokálně používá OR-Tools, podporuje návazné podklady a
  doplánování souvislé části měsíce. Manažerská obrazovka již nenabízí ruční
  úpravu návrhu. Syntetická ověření a jejich meze jsou v
  [`docs/ROADMAP.md`](docs/ROADMAP.md); nenahrazují závěrečné testování MVP.
- Plánovací jádro, doménový kontrakt, deterministická validace, AI kontrakt,
  adaptér pro Cloudflare Workers AI, orchestrátor **a napojení demo UI (Fáze 2)**
  jsou `IMPLEMENTED` a pokryté testy.
- Cloudflare Workers AI je zvolený měsíční AI poskytovatel (`VERIFIED` rozhodnutí
  z 6. 11. 2026). Adaptér je `IMPLEMENTED`; reálné volání a kvalita výstupu
  zůstávají `NOT VERIFIED`, dokud neproběhne ověření s přístupovým tokenem.
- Starší Gemini adaptér zůstává v kódu; jeho reálné volání je `VERIFIED`
  integračním testem. Bezplatná úroveň Gemini není použitelná pro aplikaci
  dostupnou v EHP a placená varianta odporuje rozpočtu projektu.
- Hlavní UI používá měsíční API pro návrh, novou kontrolu a potvrzení. Starší
  týdenní API zůstává v kódu bez samostatného týdenního UI.
- UI/UX: implementovány 4 vlny polish (přechody, hover/active, focus ringy,
  scrollbary, skeletony, empty-state, mobilní sticky sloupec, responzivní grid,
  prefers-reduced-motion).
- Solver timeout je konfigurovatelný (`PLANNING_SOLVER_TIMEOUT_MS`, výchozí
  120 s, strop 300 s).
- Měsíční kód umí plný i poloviční úvazek; **pilot je pouze pro plné úvazky**
  (`VERIFIED`, 6. 11. 2026). Poloviční úvazky se v pilotním scénáři nezadávají.
- Stránka Analyzy je read-only přehled potvrzených a odstraněných rozpisů;
  rozsáhlejší metriky pokrytí a vytížení zůstávají mimo současný rozsah.
- Auth.js podporuje lokální přihlášení a databázové účty; není napojený na CRM.
  Microsoft Entra ID zůstává plánovanou budoucí autentizační bránou.
- Potvrzení manažera a auditní zápis jsou `IMPLEMENTED`; aplikace používá
  explicitní `PLANNING_PERSISTENCE=prisma`. `memory` je pouze testovací režim.
- **Operativní náhrady směn jsou `IMPLEMENTED` / `SIMULATED`.** Syntetický řez
  řeší výpadek na jedné celé směně, tři varianty, deterministický dopad, výběr
  managerem, potvrzení nové verze týdne a minimální audit. Gemini, provozní
  limity a produkční workflow zůstávají `NOT VERIFIED`.
- Prisma obsahuje provozní modely identity, snapshotu běhu a auditu. Migrace včetně
  typu úvazku byly nasazeny a ověřeny na aktivní nakonfigurované PostgreSQL.
  Zálohy, obnova a monitoring zůstávají `NOT VERIFIED`; cílové nasazení na
  Vercel Hobby + stávající Neon je `PLANNED`.
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
| `lib/ai/` | Serverové AI adaptéry: Cloudflare Workers AI (měsíční), Gemini (starší) | `IMPLEMENTED`; reálné volání Cloudflare `NOT VERIFIED` |
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
`npm run db:validate`, `npm run db:migrate`, `npm run db:migrate:deploy`, `npm run db:studio`.

Pro aplikační běh nastav `PLANNING_PROVIDER`, případně samostatný
`PLANNING_MONTHLY_PROVIDER=cloudflare` s `CLOUDFLARE_ACCOUNT_ID` a
`CLOUDFLARE_API_TOKEN`, nebo `PLANNING_MONTHLY_PROVIDER=ortools` s
`PLANNING_PYTHON_EXECUTABLE` na Python s lokálně instalovanými závislostmi ze
`scripts/requirements-monthly-solver.txt`, dále `PLANNING_PERSISTENCE=prisma`,
`DATABASE_URL`, `DATABASE_URL_UNPOOLED` pro migrace a lokální login proměnné
(viz `.env.example`). Databázové příkazy (`db:migrate`, `db:studio`) vyžadují
běžící PostgreSQL a před jejich spuštěním je nutné potvrdit cílovou databázi.

Pro online běh na Vercelu: `PLANNING_MONTHLY_PROVIDER=cloudflare`,
`PLANNING_AUTH_MODE=database`, `PLANNING_PERSISTENCE=prisma`, `AUTH_SECRET`,
pooled `DATABASE_URL` a unpooled `DATABASE_URL_UNPOOLED`. Migrace se pouští
ručně (`npm run db:migrate:deploy` s `DATABASE_URL_UNPOOLED`), ne při každém
buildu. Lokální OR-Tools na Vercelu dostupný není, protože vyžaduje spuštění
Python procesu.

## Dokumentace

- Rozcestník a legenda popisků: [`docs/README.md`](docs/README.md)
- Postup nasazení: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- Návrh doménové specifikace: [`docs/DOMAIN_SPECIFICATION.md`](docs/DOMAIN_SPECIFICATION.md)
- Minimální datový kontrakt: [`docs/PLANNING_CONTRACT.md`](docs/PLANNING_CONTRACT.md)
- Rozhodovací list pro managera: [`docs/DOMAIN_DECISIONS.md`](docs/DOMAIN_DECISIONS.md)
- Roadmapa a stav: [`docs/ROADMAP.md`](docs/ROADMAP.md)
- Schválený design a rozsah jsou shrnuty v [`docs/DOMAIN_DECISIONS.md`](docs/DOMAIN_DECISIONS.md), [`docs/DOMAIN_SPECIFICATION.md`](docs/DOMAIN_SPECIFICATION.md) a [`docs/ROADMAP.md`](docs/ROADMAP.md). Historické implementační plány byly odstraněny.
- Instrukce pro agenty: [`AGENTS.md`](AGENTS.md)

## Bezpečnost a hranice

- Repozitář neobsahuje produkční databázi ani skutečná zaměstnanecká data.
  Jediná připojená Neon databáze může obsahovat uživatelem vložená data; zápisy
  a migrace se provádějí jen po výslovném potvrzení.
- **Externí AI je povolená** (`VERIFIED`, 6. 11. 2026), včetně skutečných jmen
  a volného textu. Používá se model Cloudflare Workers AI s nulovým uchováváním
  a bez trénování na zákaznickém obsahu. Jde o přenos do USA; rozhodnutí
  uživatele je zaznamenané v `docs/PRE_PUBLISH_CHECKLIST.md`.
- Přihlášení používá lokální MVP credentials gate bez CRM/Graph integrace;
  není to produkční autentizace. Entra ID je pouze budoucí `PLANNED` varianta.
- Demo scénáře používají syntetická data; kvalita plánovacího výstupu pro produkci
  zůstává `NOT VERIFIED`.
- Přístup k externím službám (např. GitHub, Vercel, Cloudflare) vyžaduje
  samostatné potvrzení. Klíče patří do prostředí, nikdy do repozitáře.

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
