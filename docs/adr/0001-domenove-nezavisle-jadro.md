# ADR 0001 — Doménově nezávislé plánovací jádro

- **Stav:** `IMPLEMENTED`
- **Datum:** 23. 10. 2026
- **Kontext kódu:** `lib/planning/types.ts`, `lib/planning/control.ts`

## Kontext

Doménový kontrakt (entity, atributy, tvrdá pravidla a limity) není schválený —
čeká na odpovědi managera (OQ2–OQ11). Zároveň potřebujeme mít hotový a
otestovaný tok „návrh → kontrola → výsledek", aby se po schválení domény
nepřepisoval základ.

Nabízely se dvě cesty:

1. Začít rovnou doménovými typy (`Slot`, `Worker`, …) a hádat jejich tvar.
2. Postavit tok nad generickým kontraktem a doménu doplnit později.

## Rozhodnutí

Jádro je **doménově nezávislé**. Pracuje s `PlanProposal<TPlan>`, kde obsah
plánu je pro jádro `unknown`; pravidla jsou vstup (`PlanningRule<TPlan>`) a
jádro nezná žádné konkrétní směnové pravidlo.

## Důsledky

- Tok kontroly lze testovat bez databáze a bez doménových dat.
- Rozhodnutí o doméně nemění tok — jen přidají typy a pravidla.
- Cena: uvnitř pravidel je do schválení domény slabší typová opora; tu dodá
  doménový typ až po OQ3–OQ4.
- Vzniká potřeba „švu" — místa, kde se doménový typ napojí (viz
  `docs/DOMAIN_SEAM.md`).

## Co to neznamená

- Neznamená, že na doméně nezáleží nebo že je jakýkoli tvar plánu přijatelný.
- Neznamená, že doménová pravidla můžeme vymyslet — ta musí dodat manager.
