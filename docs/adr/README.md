# Architektonická rozhodnutí (ADR)

ADR zaznamenávají důvody architektonických rozhodnutí. Nejsou to doménová
pravidla; ty jsou v [`../DOMAIN_SPECIFICATION.md`](../DOMAIN_SPECIFICATION.md).
Při rozporu platí nejnovější výslovné rozhodnutí uživatele zaznamenané v
[`../DOMAIN_DECISIONS.md`](../DOMAIN_DECISIONS.md) nebo novějším ADR; starší
záznam zůstává kvůli historii označen jako nahrazený.

| # | Rozhodnutí | Stav |
| --- | --- | --- |
| [0001](0001-domenove-nezavisle-jadro.md) | Doménově nezávislé plánovací jádro | Platí; implementace je v `lib/planning/` |
| [0002](0002-tri-stavy-kontroly.md) | Tři stavy kontroly a význam `not_verified` | Platí |
| [0003](0003-zdroj-navrhu-neni-schvaleni.md) | Zdroj návrhu není schválení | Platí |
| [0004](0004-chyba-pravidla-se-nepolyka.md) | Chyba uvnitř pravidla se nepolyká | Platí |
| [0005](0005-ai-navrhuje-validace-overuje.md) | AI navrhuje, validace ověřuje, manažer potvrzuje | Platí; kvalita návrhů není tímto rozhodnutím ověřena |
| [0006](0006-mesicni-ai-cloudflare-workers-ai.md) | Měsíční AI plánovač na Cloudflare Workers AI | Aktuální volba provideru; spolehlivost `NOT VERIFIED` pro běžné použití |
| [0007](0007-nekomerci-hosting-vercel-neon.md) | Nekomerční hosting: Vercel Hobby a jediná Neon databáze | Cílové rozhodnutí; online nasazení `NOT VERIFIED` |
| [0008](0008-cloudflare-only-and-unified-ui.md) | Online AI plánování a jednotné UI | Aktuální směr; lokální OR-Tools byl odstraněn |

## Jak přidat další rozhodnutí

- Nový soubor `NNNN-kratky-nazev.md`, číslo vzestupně.
- Struktura: **Kontext → Rozhodnutí → Důsledky → Co to neznamená**.
- Stavy používají stejné popisky jako zbytek dokumentace (`IMPLEMENTED`,
  `PLANNED`, `SUPERSEDED`, …).
- Když rozhodnutí přestane platit, nepřepisuj ho — označ `SUPERSEDED`, odkaž
  nové a vysvětli, co se změnilo.
