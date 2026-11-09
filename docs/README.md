# Dokumentace Planning Engine

## Zdroje pravdy

| Otázka | Dokument |
| --- | --- |
| Co projekt dělá a jak ho spustit? | [`../README.md`](../README.md) |
| Jaká pravidla práce a schválená rozhodnutí platí pro agenta? | [`../AGENTS.md`](../AGENTS.md) |
| Jaká doménová pravidla platí pro měsíční pilot? | [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) |
| Jaká rozhodnutí jsou potvrzená a co zůstává otevřené? | [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) |
| Co je implementováno, ověřeno, nebo zbývá? | [`ROADMAP.md`](ROADMAP.md) |
| Co doložily konkrétní AI běhy? | [`PLAN_OVERENI_AI.md`](PLAN_OVERENI_AI.md) |
| Jak se nasazení provádí, pokud bude zvlášť schváleno? | [`DEPLOYMENT.md`](DEPLOYMENT.md) |
| Jak vypadá starší týdenní technický kontrakt? | [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) — historické API, nikoli specifikace měsíčního UI |
| Jaká rozhodnutí vedla k architektuře? | [`adr/README.md`](adr/README.md) |
| Jak se rychle zorientovat v repozitáři a historii commitů? | [`CLAUDE_PROJECT_MAP.md`](CLAUDE_PROJECT_MAP.md) — časový snímek, nikoli zdroj aktuálního stavu |

## Archiv

[`archive/README.md`](archive/README.md) popisuje archivní snímek dlouhých pracovních verzí doménových rozhodnutí, specifikace, roadmapy, testovacího plánu, projektové karty a nasazovacích checklistů. Archiv slouží pro dohledání historie, ne jako zdroj aktuálního stavu nebo otevřených úkolů.

Starší ADR zůstávají v [`adr/`](adr/README.md), protože vysvětlují důvody architektonických rozhodnutí. Jejich aktuální platnost a vztahy mezi nimi shrnuje index ADR.

## Stavové popisky

| Popisek | Význam |
| --- | --- |
| `IMPLEMENTED` | Kód nebo typ existuje; neznamená, že chování bylo ověřeno. |
| `VERIFIED` | Konkrétní chování nebo rozhodnutí je doložené. Rozsah důkazu musí být uveden. |
| `NOT VERIFIED` | Důkaz zatím chybí; nejde automaticky o nefunkčnost. |
| `PARTIAL` | Ověřen je jen dílčí scénář nebo část chování. |
| `SIMULATED` / `DEMO` | Ukázkové chování, ne živý výsledek plánování. |
| `OPEN QUESTION` | Čeká se na rozhodnutí nebo chybějící podklad. |
| `PLANNED` / `PROPOSAL` | Návrh práce, nikoli implementace nebo schválení. |
