# ADR 0002 — Tři stavy kontroly a význam `not_verified`

- **Stav:** `IMPLEMENTED`
- **Datum:** 23. 10. 2026
- **Kontext kódu:** `lib/planning/types.ts` (`ControlStatus`), `lib/planning/control.ts`

## Kontext

Kontrola může skončit různě: našla problém, nenašla nic, nebo vůbec nemohla
proběhnout (nejsou nakonfigurovaná pravidla). Sloučit „nenašla nic" a „nemohla
proběhnout" by znamenalo vydávat neověřený plán za čistý.

## Rozhodnutí

Tři stavy:

- `no_problems_found` — pravidla proběhla a nic nenašla.
- `problems_found` — alespoň jedno pravidlo něco našlo.
- `not_verified` — plán **nelze potvrdit** (typicky nejsou nakonfigurovaná
  pravidla).

`not_verified` se nikdy nesmí zobrazit ani interpretovat jako úspěch,
schválení, bezpečný plán ani „hotovo".

## Důsledky

- UI musí všechny tři stavy odlišit; `not_verified` nesmí splynout se zelenou.
- Ani `no_problems_found` není schválení — jen „dostupná pravidla nic nenašla".
- Nevzniká čtvrtý stav pro chybu v pravidle: ta se nepolyká a propadá jako
  výjimka (ADR 0004).

## Co to neznamená

- Není to skóre kvality ani míra pokrytí plánu.
- Neznamená, že `no_problems_found` je konečné rozhodnutí.
