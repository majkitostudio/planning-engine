# Šev pro doménu — kde se doména napojí na jádro

- **Stav:** `PROPOSAL` — design note, čeká na potvrzení; nic z toho není implementované.
- **Datum:** 23. 10. 2026
- **Souvisí:** [ADR 0001](adr/0001-domenove-nezavisle-jadro.md),
  [Plánovací vrstva](../lib/planning/README.md),
  [Návrh doménové specifikace](DOMAIN_SPECIFICATION.md),
  [Rozhodovací list](DOMAIN_DECISIONS.md)

## Proč tento dokument existuje

Jádro v `lib/planning/` je doménově nezávislé (ADR 0001) a doménové typy
i pravidla jsou `BLOCKED` do odpovědí managera. Aby se po odpovědích
nepřepisoval základ, tenhle dokument popisuje **kde** se doména napojí a **co**
se přitom nesmí změnit. Neobsahuje žádná doménová pravidla, limity ani hodnoty —
ty musí dodat manager (OQ9–OQ11).

## Tři styčné body

Doména se napojuje přesně ve třech místech. Všechno ostatní zůstává beze změny.

| # | Styčný bod | Co se doplní | Odvíjí se od |
| --- | --- | --- | --- |
| 1 | Doménový typ plánu (`TPlan`) | `PlanProposal<TPlan>` dostane konkrétní tvar | OQ3, OQ4 |
| 2 | Pravidla a jejich limity | `PlanningRule<TPlan>` + konfigurace | OQ9, OQ10, OQ11 |
| 3 | Zobrazení výsledku | mapování `ControlResult` na stavy UI | OQ2, OQ16 |

## 1. Doménový typ plánu

**Návrh umístění** (`PLANNED`): `lib/planning/domain/types.ts`

- Doménové typy zůstávají **vedle** jádra, ne uvnitř něj. Jádro o nich nesmí
  vědět (`lib/planning/types.ts` zůstane generický).
- `TPlan` se plní parametry: `PlanProposal<DomainPlan>`, `PlanningRule<DomainPlan>`.
- Doménový typ smí obsahovat jen to, co potvrdí OQ3/OQ4. Nic „pro jistotu".
- Žádná osobní data v testech — fixtures budou syntetické a zřetelně označené.

## 2. Pravidla a jejich limity

**Návrh umístění** (`PLANNED`):

- `lib/planning/domain/rules/` — jednotlivá pravidla (H1–H7) jako `PlanningRule`.
- `lib/planning/domain/config.ts` — **typy** konfigurace, ne hodnoty.

**Jak se limity předávají** (`PROPOSAL`):

- Každé pravidlo, které nějaký limit potřebuje, vzniká **továrnou**:
  `createRule(config) => PlanningRule<DomainPlan>`.
- Konfigurace je explicitní argument, ne globální konstanta a ne hodnota
  uložená v pravidle. Důvod: stejné pravidlo musí jít spustit s jinou
  konfigurací (jiné období, jiná jednotka) a v testech s jiným limitem.
- Chybějící nebo neplatná konfigurace je chyba volajícího, ne nález v plánu.
  Hlásí se `RuleConfigurationError` ještě před během kontroly — plán nesmí
  dostat nález, který ve skutečnosti patří konfiguraci.
- **Žádné výchozí hodnoty.** Dokud manager limity nepotvrdí, konfigurace
  nesmí mít „rozumný" default — tichý default by předstíral schválené pravidlo.

**Tvar konfigurace** je `OPEN QUESTION` (OQ9–OQ11). Tento dokument záměrně
neuvádí žádné konkrétní limity ani jejich jednotky.

## 3. Co bude UI čekat od `ControlResult`

`ControlResult` je hotový kontrakt (`IMPLEMENTED`). UI ho jen čte — nikdy
needituje a nikdy z něj neodvozuje schválení.

| Pole | Význam pro UI |
| --- | --- |
| `status` | který ze tří stavů zobrazit (viz níže) |
| `problems` | seznam nálezů k vypsání, v deterministickém pořadí |
| `checkedRuleIds` | co se skutečně kontrolovalo; patří k vysvětlení výsledku |
| `proposalId` | identifikace návrhu, ke kterému výsledek patří |
| `source` | původ návrhu — **informace, ne důvěra** (ADR 0003) |

**Mapování stavů** (`PROPOSAL`):

| `status` | UI | Nesmí |
| --- | --- | --- |
| `no_problems_found` | „Dostupná pravidla nic nenašla." | zelené „v pořádku / schváleno" |
| `problems_found` | seznam nálezů s `ruleId` a závažností | skrýt nálezy za souhrn |
| `not_verified` | výrazné „Nepodařilo se ověřit." | splynout s úspěchem |

**Když kontrola selže** (pravidlo vyhodí výjimku — ADR 0004): volající chybu
odchytí a zobrazí „Kontrolu nešlo provést." Tohle **není** `not_verified`
a nesmí se to vydávat za nález v plánu.

Výsledek kontroly **není** rozhodnutí managera. Rozhodnutí (přijmout / upravit
/ zamítnout) je samostatný krok mimo jádro a jeho slovník je `OPEN QUESTION`.

## Co zůstává mimo jádro

- Rozhodnutí managera a jeho zaznamenání (OQ20).
- Uložení návrhu a výsledku (databáze).
- Autentizace a role (OQ18–OQ19).
- Generování rozpisu (samotný plánovací algoritmus) — navazuje až po
  doménovém kontraktu.

## Až přijdou odpovědi — pořadí práce

1. OQ3–OQ5 → doménový typ v `lib/planning/domain/types.ts`.
2. OQ9–OQ11 → tvar konfigurace a první tvrdá pravidla s testy.
3. OQ2, OQ16 → mapování `ControlResult` na obrazovky.
4. OQ12–OQ14 → preference (až druhé kolo; jádro se nemění).
5. OQ18–OQ20 → rozhodnutí managera, role, audit.

## Co to neznamená

- Neznamená schválení jakéhokoli doménového typu — to závisí na odpovědích.
- Neznamená, že cesty výše jsou konečné; jsou to `PLANNED` návrhy.
- Neznamená, že doména patří do jádra. Naopak: jádro zůstává generické
  a doména se napojuje zvenku.
