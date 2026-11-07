# Dokumentace — Plánovací Engine

Technický repozitář: `planning-engine`

Rozcestník dokumentace. Každý dokument má jednu hlavní odpovědnost a podrobnosti
jiných dokumentů neopakuje.

Dokumentace obsahuje aktuální podklady i historické pracovní záznamy.
Schválená doménová rozhodnutí platí podle jejich aktuálního znění v
`DOMAIN_DECISIONS.md` a `DOMAIN_SPECIFICATION.md`; aktuální implementaci a
ověření a historické výsledky uvádí `ROADMAP.md`.

Dokumentace však stále obsahuje historické záznamy a dosud nebyla plně
konsolidována; jejich zařazení a omezení uvádí [inventura](INVENTURA_DOKUMENTACE.md).
Aktuální navržené priority jsou v [roadmapě dalšího postupu](ROADMAPA_DALSIHO_POSTUPU.md).

## Kde co hledat

| Dokument | Odpovídá na | Stav |
| --- | --- | --- |
| [`../README.md`](../README.md) | Co projekt je, jaký je stav a jak ho spustit | `IMPLEMENTED` |
| [`../AGENTS.md`](../AGENTS.md) | Pravidla práce coding agenta a meze autonomie | `IMPLEMENTED` |
| [`ROADMAP.md`](ROADMAP.md) | Co je hotové, co chybí a co dělat dál | `IMPLEMENTED` (pracovní plán) |
| [`ROADMAPA_DALSIHO_POSTUPU.md`](ROADMAPA_DALSIHO_POSTUPU.md) | Návrh priorit a kritéria dokončení dalších etap | `PROPOSAL` |
| [`INVENTURA_DOKUMENTACE.md`](INVENTURA_DOKUMENTACE.md) | Rozdělení dokumentů a upozornění na historické části | `IMPLEMENTED` |
| [`PLAN_OVERENI_AI.md`](PLAN_OVERENI_AI.md) | Scénáře a bezpečný postup ověření AI plánování | `PLANNED` |
| [`projektova-karta.pdf`](projektova-karta.pdf) | Stručný vizuální stav projektu pro manažery | stav k 7. 11. 2026 |
| [`projektova-karta.html`](projektova-karta.html) | Upravitelné zdrojové znění vizuální karty | stav k 7. 11. 2026 |
| [`PROJEKTOVA_KARTA.md`](PROJEKTOVA_KARTA.md) | Podrobný textový podklad k projektové kartě | stav k 7. 11. 2026 |
| [`PRE_PUBLISH_CHECKLIST.md`](PRE_PUBLISH_CHECKLIST.md) | Co zbývá před online vydáním a proč | `IMPLEMENTED` (checklist) |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Postup nasazení na Vercel Hobby a stávající Neon | `PLANNED` (neprovedeno) |
| [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) | Původní týdenní AI kontrakt a odkazy na měsíční tok | `PROPOSAL` (kontrakt) / `IMPLEMENTED` (kód) |
| [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) | Doménový model a pravidla s mírou potvrzení | `PARTIALLY VERIFIED PROPOSAL` |
| [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) | Otevřené otázky a odpovědi managera | `PARTIALLY ANSWERED` |
| [`adr/`](adr/README.md) | Proč jsou technická rozhodnutí taková | `IMPLEMENTED` |
| [`../lib/planning/README.md`](../lib/planning/README.md) | Co skutečně obsahuje plánovací jádro | `IMPLEMENTED` |
| [`../prisma/schema.prisma`](../prisma/schema.prisma) | Identita, zaměstnanci, běhy, staffing a rozhodnutí | `IMPLEMENTED` (lokální migrace `VERIFIED`, produkční DB `NOT VERIFIED`) |

## Aktuální stav

| Oblast | Stav | Poznámka |
| --- | --- | --- |
| Typ projektu | `VERIFIED` | Nekomerční ukázkový projekt pro jednoho manažera; rozpočet 0 Kč (6. 11. 2026) |
| Next.js aplikace a routy | `IMPLEMENTED` | App Router, TypeScript, React |
| Demo UI | `IMPLEMENTED` / `DEMO` | Syntetická data z `lib/demo-data.ts` |
| Generické plánovací jádro | `IMPLEMENTED` | `lib/planning/types.ts`, `control.ts` |
| Doménový kontrakt | `IMPLEMENTED` | `lib/planning/domain/`; kontrakt je `PROPOSAL` k ověření |
| Deterministická validace | `IMPLEMENTED` | `validatePlan()`; testy procházejí |
| AI kontrakt | `IMPLEMENTED` | `lib/planning/ai-provider.ts` |
| Cloudflare Workers AI adaptér | `IMPLEMENTED` / `VERIFIED` (omezené testy) | Reálné volání ověřeno; podle uživatele pozdější test vytvořil platný rozpis. Spolehlivost na dalších vstupech zůstává `NOT VERIFIED`. |
| Gemini adaptér | `IMPLEMENTED` / `VERIFIED` (volání) | `lib/ai/gemini-planning-provider.ts`; starší varianta, produkční kvalita `NOT VERIFIED` |
| Orchestrace | `IMPLEMENTED` | `runPlanning()` spojuje návrh, validaci a změny |
| Starší týdenní API | `IMPLEMENTED` / `DEMO` | `POST /api/planning/run`; samostatné týdenní UI bylo odstraněno |
| Měsíční pilot | `IMPLEMENTED` / `PARTIAL` | Cloudflare Workers AI navrhuje celý měsíc, nezávislá validace kontroluje návrh a manažer potvrzuje. Další testy kvality čekají; pilot je pouze pro plné úvazky. |
| Zaměstnanci pro plánování | `IMPLEMENTED` | Manažer spravuje trvalý seznam a může načíst aktivní zaměstnance do měsíčního návrhu. Odebrání zachová historii a zaměstnance lze znovu zařadit se stejnou identitou. |
| Přihlášení a role | `IMPLEMENTED` / `VERIFIED` (lokální syntetický smoke) | Auth.js podporuje vývojový local režim a databázové účty v PostgreSQL; vytvoření účtu, změna hesla a zneplatnění deaktivované session prošly lokálním browser průchodem. Produkční úroveň a Entra ID zůstávají `NOT VERIFIED`/`PLANNED`. |
| Správa přihlašovacích účtů | `IMPLEMENTED` / `VERIFIED` (izolovaná lokální PostgreSQL) | `/uzivatele`, manager-only API a jednorázový `db:bootstrap-manager`; migrace, bootstrap, create, role, reset, povinná změna hesla, viewer denial i souběžná ochrana posledního managera byly ověřeny synteticky. Produkce `NOT VERIFIED`. |
| Potvrzení manažera | `IMPLEMENTED` | Manager-only potvrzení s blokací částečných a neověřených návrhů |
| Ukládání běhů a potvrzení | `IMPLEMENTED` / `VERIFIED` (lokální Docker smoke) | Prisma snapshot a `ConfirmedPlan`; migrace a zápis potvrzení byly ověřeny v izolované lokální PostgreSQL |
| Audit potvrzení | `IMPLEMENTED` / `VERIFIED` (lokální Docker smoke) | Zápis `planning.confirmed` byl ověřen; čtecí pohled je `IMPLEMENTED` pro managera a ukazuje pouze tato potvrzení |
| Operativní náhrada směny | `IMPLEMENTED` / `SIMULATED` | Syntetický řez: výpadek celé směny, tři varianty, deterministický dopad, výběr, manager-only potvrzení; Gemini a provozní kvalita `NOT VERIFIED` |
| Nastavení potřebného obsazení | `IMPLEMENTED` / `VERIFIED` (lokální smoke) | `/nastaveni`, manager-only zápis přes API, Prisma persistence a použití v operativních náhradách; migrace a manuální browser smoke proběhly v lokálním Docker PostgreSQL |
| Rozhodování o požadavcích | `IMPLEMENTED` / `SIMULATED` | `/pozadavky` ukazuje dopad dvou syntetických požadavků, dostupné kandidáty a manager-only schválení/zamítnutí; rozhodnutí se ukládá přes Prisma a samo neupraví rozpis |
| Testy | `IMPLEMENTED` | Výsledky a rozsah posledního zaznamenaného ověření uvádí [roadmapa](ROADMAP.md). |
| Kvalitní brána (CI) | `IMPLEMENTED` / `VERIFIED` (lokální běh) | Testy, typecheck, lint, build a `db:validate` prošly; úplná provozní/produkční brána z toho nevyplývá |
| Cílové online nasazení | `VERIFIED` (omezené) | Vercel Hobby + stávající Neon Free + Cloudflare Workers AI Free; podrobnosti a limity jsou v checklistu nasazení |
| Produkční připravenost | `NOT VERIFIED` | Nasazení a AI volání existují, ale zálohy, monitoring, obnova a produkční úroveň zabezpečení nejsou ověřeny |

## Stavové popisky

| Popisek | Význam |
| --- | --- |
| `IMPLEMENTED` | Kód nebo typ existuje. Neznamená, že chování je ověřené. |
| `VERIFIED` | Konkrétní chování je doložené testem, příkazem nebo potvrzeným rozhodnutím. |
| `ASSUMPTION` | Pracovní předpoklad, který nikdo nepotvrdil. |
| `OPEN QUESTION` | Čeká na rozhodnutí nebo chybějící informaci. |
| `PLANNED` | Implementace zatím neexistuje. |

Pomocné popisky: `NOT VERIFIED` (neověřeno), `DEMO`/`SIMULATED` (jen
demonstrační chování), `PARTIALLY ...` (částečné), `SUPERSEDED` (nahrazeno),
`BLOCKED` (nelze pokračovat bez rozhodnutí).

`IMPLEMENTED` a `VERIFIED` se neslučují: implementovaná funkce může být
neověřená a naopak.
