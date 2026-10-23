# ADR 0004 — Chyba uvnitř pravidla se nepolyká

- **Stav:** `IMPLEMENTED`
- **Datum:** 23. 10. 2026
- **Kontext kódu:** `lib/planning/control.ts` (`runControl`, `RuleConfigurationError`)

## Kontext

Pravidlo je kód, který může selhat (výjimka, neplatný návrat). Pokud by se
chyba spolkla a vrátil se „čistý" výsledek, kontrola by lhala. Nabízely se tři
možnosti:

1. chybu spolknout a pokračovat,
2. vrátit čtvrtý stav `control_failed`,
3. nechat výjimku propadnout.

## Rozhodnutí

Chyba uvnitř pravidla **propadá** jako výjimka. `runControl()` ji neodchytává.
Konfigurační chyby (duplicitní ID, chybějící `check()`) hlásí
`RuleConfigurationError`; porušení kontraktu nálezu (prázdný text) hlásí
`TypeError`.

## Důsledky

- Neúspěšná kontrola nemůže vypadat jako čistá.
- Volající (později UI) musí chybu odchytit a zobrazit „kontrolu nešlo
  provést" — nesmí ji zaměnit za `not_verified`.
- Jedno rozbité pravidlo zhatí celý běh; částečné výsledky se nevrací.
  Vědomě: částečný výsledek by mohl vypadat jako úplný.

## Co to neznamená

- `not_verified` zůstává pro „není co spustit", ne pro „běh selhal".
- Neznamená, že chyby pravidel není potřeba logovat — volající je může
  zalogovat.
