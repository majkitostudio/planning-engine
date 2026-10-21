# Plánovací logika — čistá vrstva (`lib/planning/`)

Tento adresář je určen pro **čistou plánovací logiku**, oddělenou od Next.js
i databáze. Cílem je, aby šlo tuto vrstvu testovat samostatně (Vitest), aniž
by bylo potřeba běžící databáze.

## Odpovědnosti vrstvy

- **Vstup:** doménová data (směny, zaměstnance, dostupnost, pravidla, preference).
- **Výstup:** plán přiřazení + seznam konfliktů.
- **Mimo zodpovědnost:** žádný přístup k databázi, HTTP ani Next.js.

## Stav

`PLANNED` — plánovací logika zatím **není implementována**.

- **Neexistuje schválený doménový kontrakt.** Konkrétní entity (`Slot`, `Worker`,
  atd.), tvrdá pravidla H1–H7 a preference S1–S5 jsou v
  [`docs/DOMAIN_SPECIFICATION.md`](../../docs/DOMAIN_SPECIFICATION.md) označeny
  jako `ASSUMPTION` a `OPEN QUESTION`.
- Proto zatím **nejsou definovány finální typy** zaměstnanců, směn, úvazků ani
  přiřazení. Jejich tvar závisí na odpovědích manažera (OQ3–OQ5, OQ9–OQ11).
- Algoritmus, optimalizace ani pravidla H1–H7 a S1–S5 **zatím neimplementovat**.

## Proč je kontrakt otevřený

Před přímo doménovými typy je třeba potvrdit:

1. Které entity a atributy jsou povinné (OQ3–OQ5).
2. Která pravidla jsou tvrdá a jaké mají limity (OQ9–OQ11).
3. Které preference se váží a jak (OQ12–OQ14).

Dokud tyto odpovědi chybí, předčasné typy by zamknuly návrh do nepotřebné
podoby. Po schválení dodat typy a první testovatelná pravidla sem.
