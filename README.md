# Plánovací Engine

Nekomerční ukázková aplikace pro jednoho manažera call centra. Cílem je
vytvořit použitelný rozpis směn na celý kalendářní měsíc s pomocí plánovacího
poskytovatele a nezávisle ověřitelných pravidel.

## Aktuální stav

Projekt je rozpracovaný technický základ s demo rozhraním, nikoli hotový ani
produkčně ověřený systém. Měsíční návrh aktuálně vytváří Cloudflare Workers AI;
deterministická validace kontroluje výsledek a manažer ho musí samostatně
potvrdit. Jednotlivé syntetické AI běhy vrátily jak validní, tak nevalidní
výsledky. Opakovatelnost a kvalita pro běžné použití zůstávají `NOT VERIFIED`.

Cílové prostředí je Vercel Hobby a stávající Neon Free, ale aktuální online
nasazení, produkční zabezpečení, obnova a monitoring nejsou ověřeny. Podrobnosti
jsou v [aktuálním stavu](docs/ROADMAP.md).

## Rozsah pilotu

- Jeden návrh pro celý kalendářní měsíc; týdenní tabulka je pouze pohled do něj.
- Zaměstnanci na plný úvazek; částečné úvazky a další integrace jsou mimo pilot.
- AI vytváří návrh; nezávislá validace a potvrzení manažerem zůstávají oddělené.
- Neúplný nebo neověřený návrh nelze potvrdit. Volný text sám není
  deterministicky ověřeným tvrdým pravidlem.

Podrobnější rozhodnutí a pravidla jsou v [doménové specifikaci](docs/DOMAIN_SPECIFICATION.md)
a [rozhodnutích](docs/DOMAIN_DECISIONS.md).

## Technologie

- Next.js App Router, React a TypeScript
- PostgreSQL a Prisma
- Cloudflare Workers AI pro měsíční AI návrhy
- Vitest a GitHub Actions CI

## Spuštění lokálně

```bash
npm install
npm run dev
```

Dostupné kontroly:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run db:validate
```

Konfiguraci popisuje [`.env.example`](.env.example). Tajné údaje nevkládej do
repozitáře. Databázové migrace a zápisy vyžadují předem ověřit cílovou databázi
a dodržet projektová pravidla v [`AGENTS.md`](AGENTS.md).

## Struktura

| Cesta | Účel |
| --- | --- |
| `app/` | Stránky a API routy |
| `components/` | Uživatelské rozhraní |
| `lib/planning/` | Plánovací kontrakty, pravidla, validace a orchestrace |
| `lib/ai/` | Adaptéry externích AI providerů |
| `prisma/` | Databázové schéma a migrace |
| `docs/` | Aktuální specifikace, rozhodnutí, stav a technická historie |

## Dokumentace

- [Rozcestník a zdroje pravdy](docs/README.md)
- [Aktuální stav a další kroky](docs/ROADMAP.md)
- [Doménová pravidla pilotu](docs/DOMAIN_SPECIFICATION.md)
- [Potvrzená rozhodnutí a otevřené otázky](docs/DOMAIN_DECISIONS.md)
- [Důkazy a další ověřování AI](docs/PLAN_OVERENI_AI.md)
- [Nasazení — návod, ne důkaz nasazení](docs/DEPLOYMENT.md)
- [Architektonická rozhodnutí](docs/adr/README.md)
- [Mapa pro Claude](docs/CLAUDE_PROJECT_MAP.md) — historický snímek, před použitím ověř aktuální stav.
