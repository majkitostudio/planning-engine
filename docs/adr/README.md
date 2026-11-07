# Architektonická rozhodnutí (ADR)

Krátké záznamy rozhodnutí, která platí v kódu. Nejsou to požadavky ani doménová
pravidla — popisují **proč** je technické rozhodnutí takové a co z něj plyne.

| # | Rozhodnutí | Stav |
| --- | --- | --- |
| [0001](0001-domenove-nezavisle-jadro.md) | Doménově nezávislé plánovací jádro | `IMPLEMENTED` |
| [0002](0002-tri-stavy-kontroly.md) | Tři stavy kontroly a význam `not_verified` | `IMPLEMENTED` |
| [0003](0003-zdroj-navrhu-neni-schvaleni.md) | Zdroj návrhu není schválení | `IMPLEMENTED` |
| [0004](0004-chyba-pravidla-se-nepolyka.md) | Chyba uvnitř pravidla se nepolyká | `IMPLEMENTED` |
| [0005](0005-ai-navrhuje-validace-overuje.md) | AI navrhuje, validace ověřuje, manažer potvrzuje | `IMPLEMENTED` (rozhodnutí) |
| [0006](0006-mesicni-ai-cloudflare-workers-ai.md) | Měsíční AI plánovač na Cloudflare Workers AI | `IMPLEMENTED`; reálné volání ověřeno, širší spolehlivost `NOT VERIFIED` |
| [0007](0007-nekomerci-hosting-vercel-neon.md) | Nekomerční hosting: Vercel Hobby a jediná Neon databáze | `VERIFIED` rozhodnutí; aktuální provozní stav `NOT VERIFIED` |
| [0008](0008-cloudflare-only-and-unified-ui.md) | Online AI plánování a jednotné UI | `VERIFIED` rozhodnutí; rozsah ověření viz roadmapa |

## Jak přidat další rozhodnutí

- Nový soubor `NNNN-kratky-nazev.md`, číslo vzestupně.
- Struktura: **Kontext → Rozhodnutí → Důsledky → Co to neznamená**.
- Stavy používají stejné popisky jako zbytek dokumentace (`IMPLEMENTED`,
  `PLANNED`, `SUPERSEDED`, …).
- Když rozhodnutí přestane platit, nepřepisuj ho — označ `SUPERSEDED`, odkaž
  nové a vysvětli, co se změnilo.
