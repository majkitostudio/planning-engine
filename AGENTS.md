# AGENTS.md — Plánovací Engine

Pracovní pravidla pro samostatný projekt `planning-engine`.

## Práce v projektu

- Nepřenášej z jiných projektů jejich názvy, data, doménu, kód ani dokumentaci.
- Před změnou zkontroluj pracovní strom a přečti jen relevantní soubory. Zachovej nesouvisející práci.
- Nevymýšlej plánovací ani pracovněprávní pravidla, optimalizační váhy nebo osobní data. Rozlišuj požadavek, návrh, předpoklad, implementaci a ověření.
- Pracuj po malých ověřitelných krocích. Nevytvářej duplicitní plány, roadmapy, archivy ani agentní kontextové složky. Neznámé soubory nemaž bez zjištění jejich účelu.
- Po změně kódu spusť dostupné relevantní kontroly a nikdy netvrď, že proběhly, pokud nebyly spuštěny. Před dokončením zkontroluj diff a nové soubory.
- Komunikuj česky, jednoduše a věcně.

## Bezpečnost a externí služby

- Nevypisuj ani neukládej tajné údaje; nečti konfiguraci mimo pracovní strom.
- Produkční databáze, produkční zápisy, migrace a nasazení vyžadují výslovné potvrzení. Nepředstírej, že lokální či simulované ověření potvrzuje produkční provoz.
- Před běžným pushem ověř cílovou větev, vzdálený stav a rozsah. Nepoužívej force push, `git reset --hard`, `git clean -fd` ani hromadné mazání. Pull requesty a jiné vzdálené změny vyžadují potvrzení.
- Commit můžeš vytvořit pro ucelený ověřený krok; přidej jen související soubory a nepřebírej uživatelské změny.

## Technický stack

- Next.js App Router, React, TypeScript, PostgreSQL a Prisma.
- Příkazy projektu: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`, `npm run test` a `db:*`.
- V `devDependencies` je `typescript` aliasovaný na `@typescript/typescript6` kvůli typescript-eslint; `@typescript/native` poskytuje compiler 7. Neměň aliasy bez ověření kompatibility.

## Plánovací směr a pravidla

- Rozhodnutí uživatele z 9. 11. 2026: obnovit OR-Tools jako hlavní solver. Stav je **IN_PROGRESS**: implementace je výslovně volitelná a synteticky ověřená, produkční přepnutí zatím neproběhlo. Starší rozhodnutí o Cloudflare AI jako hlavní logice je nahrazeno. Kód Cloudflare nemaž ani tiše nepoužívej jako záložní solver; podrobnosti a postup jsou v [`docs/SOLVER_REPLACEMENT_PLAN.md`](docs/SOLVER_REPLACEMENT_PLAN.md).
- AI není autoritou pro přiřazování směn. Její možná role při převodu volného textu na strukturovaný vstup zůstává otevřená; nepřipojuj takové zpracování do běhu bez schváleného rozsahu.
- Měsíční návrh, jeho nezávislá deterministická validace a manažerem potvrzené změny jsou různé stavy. Návrh sám nesmí změnit potvrzený rozpis. `invalid` a `not_verified` blokují potvrzení; chybějící podklad není důkazem správnosti ani neproveditelnosti.
- Pilot cílí na celý kalendářní měsíc a zaměstnance na plný úvazek. Týdenní tabulka je pohled do měsíce. Částečné úvazky a integrace jsou mimo současný rozsah.
- Potvrzené časy: ranní 07:45–16:30 každý den; odpolední ve všední den 13:15–21:00; víkendová odpolední 12:45–21:00.
- Potvrzená pravidla: pracovní den je kalendářní den s alespoň jednou směnou; po šesti po sobě jdoucích pracovních dnech následuje alespoň 35 hodin souvislého odpočinku; při práci o víkendu jsou v týdnu pondělí–neděle dva dny volna, nemusí být po sobě. Obsazení je konfigurovatelný manažerský vstup, historické počty nejsou univerzální.
- Volný text není sám deterministicky ověřené tvrdé pravidlo. Částečný návrh lze ukázat, ale nesmí se potvrdit. Nepřisuzuj modelu matematické optimum; uživatel požaduje praktický použitelný návrh.

## Zdroj aktuálního přehledu

Udržuj pouze dva věcné dokumenty v `docs/`: [`PROJECT_MAP.md`](docs/PROJECT_MAP.md) (současný stav, doména a stručná historie) a [`SOLVER_REPLACEMENT_PLAN.md`](docs/SOLVER_REPLACEMENT_PLAN.md) (plán OR-Tools). Při rozporu ověř kód a skutečné kontroly; historie vysvětluje rozhodnutí, ale není důkazem aktuální implementace.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
