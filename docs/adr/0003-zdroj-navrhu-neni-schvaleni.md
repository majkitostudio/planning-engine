# ADR 0003 — Zdroj návrhu není schválení

- **Stav:** `IMPLEMENTED`
- **Datum:** 23. 10. 2026
- **Kontext kódu:** `lib/planning/types.ts` (`ProposalSource`, `PlanProposal`, `ControlResult`)

## Kontext

Návrh může vzniknout ručně, mechanickým plánovačem nebo později AI. Nabízelo se
označit některý zdroj jako důvěryhodnější, nebo naopak přidat do výsledku pole
`approved` / `accepted`.

## Rozhodnutí

`source` je **jen informace o původu**. Nemění tok kontroly, nezakládá
oprávnění a výsledek kontroly nemá pole `approved`, `accepted` ani `decision`.
Přijetí plánu je vždy rozhodnutí managera a je záměrně **mimo jádro** — jeho
slovník není potvrzený.

## Důsledky

- Všechny zdroje procházejí stejnou kontrolou.
- UI nesmí zdroj prezentovat jako záruku kvality.
- Rozšíření o další zdroj (např. import) nevyžaduje změnu toku.
- Případný audit (OQ20) se doplní později; dnes ho jádro neřeší.

## Co to neznamená

- Neznamená, že na původu nezáleží — jen že podle něj jádro nerozhoduje.
- Neznamená, že se rozhodnutí managera nikde nezaznamená; jen že to není věc
  tohoto jádra.

## Aktualizace 24. 10. 2026

AI je nyní **hlavní zdroj návrhu**, ale toto rozhodnutí se nemění: `source:
"ai"` je pořád jen informace o původu. AI výstup prochází stejnou validací a
nikdy není potvrzením. Potvrzení zůstává samostatný krok manažera (ADR 0005).
