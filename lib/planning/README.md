# Plánovací logika — čistá vrstva (`lib/planning/`)

Tento adresář je určen pro **čistou plánovací logiku**, oddělenou od Next.js
i databáze. Cílem je, aby šlo tuto vrstvu testovat samostatně (Vitest), aniž
by bylo potřeba běžící databáze.

## Odpovědnosti vrstvy

- **Vstup:** doménová data (směny, zaměstnance, dostupnost, pravidla, preference).
- **Výstup:** plán přiřazení + seznam konfliktů.
- **Mimo zodpovědnost:** žádný přístup k databázi, HTTP ani Next.js.

## Co je v adresáři

| Soubor | Obsah |
| --- | --- |
| `types.ts` | Kontrakty: zdroj návrhu, návrh plánu, pravidlo, výsledek kontroly. |
| `control.ts` | `runControl()` — spustí sadu pravidel nad návrhem a vrátí výsledek. |
| `index.ts` | Veřejné API vrstvy. |
| `control.test.ts` | Unit testy (bez databáze a bez reálných dat). |

Tok, který vrstva realizuje:

```text
zdroj návrhu → návrh plánu → kontrola dostupnými pravidly → výsledek kontroly → rozhodnutí managera
```

Poslední krok je záměrně **mimo jádro**: návrh sám se nikdy neschvaluje
automaticky. `runControl()` vrací jen stav kontroly, ne rozhodnutí.

## Stav

`IMPLEMENTED` (kostra) — v adresáři je čisté, **doménově nezávislé** plánovací
jádro: kontrakty a běh pravidel nad libovolně definovanou sadou pravidel.
Plánovací logika nad směnami **stále není implementována**.

- Jádro zná jen tři stavy kontroly: `no_problems_found` (kontrola proběhla a
  nenašla problém), `problems_found` (kontrola našla problém) a `not_verified`
  (plán nelze potvrdit — např. nejsou nakonfigurovaná žádná pravidla).
  `not_verified` se nesmí číst jako úspěch, bezpečnost, schválení ani hotový
  plán.
- Nalezené problémy nesou **stabilní identifikátor pravidla** a závažnost.
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

## Co dál

1. Po schválení doménového kontraktu doplnit doménové typy vedle stávajících
   generických (`PlanProposal<TPlan>`) — bez zásahu do toku kontroly.
2. Teprve potom implementovat první tvrdá pravidla (H1–H7) jako
   `PlanningRule` a doplnit syntetické fixtures.
3. Rozhodnutí managera zůstává mimo jádro; nad výsledkem kontroly se rozhoduje
   člověk.
