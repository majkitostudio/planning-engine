# Architektonická rozhodnutí (ADR)

Krátké záznamy rozhodnutí, která platí v kódu. Nejsou to požadavky ani doménová
pravidla — popisují **proč** je technické rozhodnutí takové a co z něj plyne.

| # | Rozhodnutí | Stav |
| --- | --- | --- |
| [0001](0001-domenove-nezavisle-jadro.md) | Doménově nezávislé plánovací jádro | `IMPLEMENTED` |
| [0002](0002-tri-stavy-kontroly.md) | Tři stavy kontroly a význam `not_verified` | `IMPLEMENTED` |
| [0003](0003-zdroj-navrhu-neni-schvaleni.md) | Zdroj návrhu není schválení | `IMPLEMENTED` |
| [0004](0004-chyba-pravidla-se-nepolyka.md) | Chyba uvnitř pravidla se nepolyká | `IMPLEMENTED` |

## Jak přidat další rozhodnutí

- Nový soubor `NNNN-kratky-nazev.md`, číslo vzestupně.
- Struktura: **Kontext → Rozhodnutí → Důsledky → Co to neznamená**.
- Stavy používají stejné popisky jako zbytek dokumentace (`IMPLEMENTED`,
  `PLANNED`, `SUPERSEDED`, …).
- Když rozhodnutí přestane platit, nepřepisuj ho — označ `SUPERSEDED`, odkaž
  nové a vysvětli, co se změnilo.
