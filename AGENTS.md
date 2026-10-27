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

### Commity a pull requesty

- Commit je interní a vratná operace: vytváří ho projektový engineer **cíleně
  sám**, když je dokončený a ověřený logický celek. Uživatel ho nemusí žádat
  pokaždé.
- Commit dělej účelově, ne „aby se něco dělo“: jeden srozumitelný celek,
  ověřený podle typu změny (typecheck/test/build) a s popisem, který říká,
  co a proč se změnilo.
- Push, pull request a jakákoli změna vzdáleného repozitáře zůstávají **externí
  operace** — před nimi ověř stav a potvrď cíl s uživatelem (viz výše).

## Technologický stack

- Next.js (App Router) + TypeScript + React.
- PostgreSQL + Prisma (technický základ; doménové modely čekají na schválení domény).
- Příkazy: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`,
  `npm run typecheck`, `npm run test`, `npm run test:watch`, databázové `db:*`.
- **TypeScript 7 a typescript-eslint:** v `devDependencies` je `typescript`
  aliasovaný na `@typescript/typescript6` (API 6.0, které potřebuje
  typescript-eslint) a nativní compiler 7.0 je v `@typescript/native`
  (`npx tsc` běží z něj). Aliasy neměň bez ověření — typescript-eslint zatím
  API TypeScriptu 7 nepodporuje.

## Plánovací model projektu

Tato rozhodnutí jsou pro další práci závazná:

- **AI je hlavní plánovací logika**, ne volitelný doplněk. AI sestavuje konkrétní
  návrh směn, vyhodnocuje požadavky, absence, dostupnost a potřebné obsazení
  a aktivně navrhuje řešení nalezených problémů.
- **Deterministická validace je nezávislá kontrola návrhu AI.** Nenahrazuje
  plánování a nesmí být jediným nositelem pravidel. AI ani validace se
  nepovažují za schválení.
- **Manažer návrh kontroluje a potvrzuje.** Aplikace nesmí bez potvrzení
  automaticky uložit nebo aplikovat navržené změny.
- **Návrh, ověřený návrh a potvrzené změny jsou tři různé stavy.** Samotné
  vygenerování návrhu nic nemění v uloženém rozpisu.
- **Neověřené nebo chybějící informace se nesmí prezentovat jako jistota.**
  Výsledek musí přiznat omezení a nabídnout nejlepší dostupné alternativy.
- **První funkční verze:** jeden týden (pondělí–nedělí) a zaměstnanci na plný
  úvazek. Měsíční plánování, částečné úvazky a integrace jsou mimo první řez.
- **Rozsah zůstává praktický.** Nevytvářej univerzální plánovací framework ani
  integraci s Countdown CRM; to je pouze budoucí architektonický směr.

### Potvrzené časy směn (`VERIFIED`)

| Typ směny | Začátek | Konec |
| --- | ---: | ---: |
| Ranní směna (všední den i víkend) | 7:45 | 16:30 |
| Odpolední směna ve všední den | 13:15 | 21:00 |
| Víkendová odpolední směna | 12:45 | 21:00 |

Časy jsou potvrzené zadáním, ale nejsou úplnou specifikací pracovněprávních
pravidel. Způsob započítávání přestávek je `OPEN QUESTION` — viz
`docs/DOMAIN_SPECIFICATION.md`.

### Potvrzená pravidla (`VERIFIED`)

- Po šesti po sobě jdoucích pracovních dnech musí následovat alespoň 35 hodin
  nepřetržitého odpočinku.
- Zaměstnanec, který pracuje o víkendu, má mít během téhož týdne dva dny volna.
  Přesný výklad „během týdne“ je `ASSUMPTION` (pondělí–neděle) do potvrzení.
- Potřebné obsazení směn je konfigurovatelný vstup. Historické počty se
  nepovažují za univerzálně platné bez ověření.

## Aktuální stav projektu

- **Plánovací Engine je rozpracovaný technický základ s demo UI (Next.js +
  TypeScript).** Není to hotová ani produkční aplikace.
- Plánovací jádro: `IMPLEMENTED` — `lib/planning/` obsahuje doménově
  nezávislé kontrakty, běh pravidel a deterministickou validaci
  (`validatePlan()`).
- AI kontrakt a orchestrace: `IMPLEMENTED` — `lib/planning/ai-provider.ts`
  definuje provider-neutral rozhraní, `lib/planning/orchestrator.ts` spojuje
  návrh, validaci, změny a pokrytí. Serverový Gemini adaptér je v
  `lib/ai/gemini-planning-provider.ts`; reálné volání je `NOT VERIFIED`.
- **Fáze 2 — UI napojení na orchestrátor: `IMPLEMENTED`.** Route handlery
  `POST /api/planning/run` a `/confirm` volají `runPlanning()` přes `run-service.ts`.
  Potvrzení běží v `confirm-service.ts` s in-memory registrem `PlanningRunRegistry`
  (`SIMULATED`, `NOT PERSISTED`). UI komponenta `PlanningResult` zobrazuje tři
  vrstvy (návrh, validace, potvrzení) s blokátory potvrzení podle OQ23.
- Provider režim přes `PLANNING_PROVIDER=simulated|gemini`; bez hodnoty →
  `ai_not_configured`. Žádný tichý fallback na simulaci.
- Simulovaný provider (`lib/planning/simulated/`) vrací tři fixture scénáře
  (`complete`, `partial`, `unverified`) pro pevný týden 5.–11. 10. 2026.
- Doménová specifikace: `PARTIALLY VERIFIED PROPOSAL` —
  `docs/DOMAIN_SPECIFICATION.md` — část rozhodnutí je `VERIFIED` (zejména AI
  role, rozsah prvního řezu, časy směn a dvě pravidla), zbytek zůstává
  `PROPOSAL`/`OPEN QUESTION`.
- Rozhodovací list pro managera: `docs/DOMAIN_DECISIONS.md` — částečně
  zodpovězený; otevřené otázky zůstávají `OPEN QUESTION`. Odpovědi ani doménu
  nedomýšlej.
- Aktuální pracovní strom prochází lintem, typecheckem, testy i buildem.
  Známý dluh je ukládání potvrzení do DB (Prisma modely); podrobnosti v
  `docs/ROADMAP.md`.
- Stav informací označuj popisky (`VERIFIED`, `IMPLEMENTED`, `PLANNED`,
  `ASSUMPTION`, `OPEN QUESTION`, `NOT VERIFIED`, `SIMULATED`, `BLOCKED`).
  Jejich význam a rozdíl mezi `IMPLEMENTED` a `VERIFIED` vysvětluje
  [`docs/README.md`](docs/README.md#stavové-popisky).

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
