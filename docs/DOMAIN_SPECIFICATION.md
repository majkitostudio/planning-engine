# Návrh doménové specifikace — Plánovací Engine

Technický repozitář: `planning-engine`
Dokument: `docs/DOMAIN_SPECIFICATION.md`

> **Stav dokumentu: NÁVRH (PROPOSAL) — NE schválená specifikace.**
>
> Tento dokument navrhuje základní pojmy, entity, vstupy, výstupy, kandidáty na
> pravidla a otevřené otázky. Obsahuje **potvrzený kontext domény** (§0.1), ale
> žádná **schválená doménová pravidla** — neříká, jak se směny skutečně mají
> plánovat. Žádná implementace není tímto dokumentem povolena. Každý pracovní
> předpoklad je označen `ASSUMPTION`, každá nevyřešená věc `OPEN QUESTION`.

## 0. Jak číst tento dokument

| Označení | Význam |
| --- | --- |
| `PROPOSAL` | Návrh, není rozhodnutí |
| `VERIFIED` | Ověřeno v projektu/příkazem, nebo explicitně potvrzeno uživatelem |
| `ASSUMPTION` | Pracovní předpoklad, není ověřený ani schválený |
| `OPEN QUESTION` | Nevyřešená otázka vyžadující rozhodnutí uživatele |
| `DEMO` / `PŘÍKLAD` | Čistě ilustrativní, fiktivní data |
| `NOT VERIFIED` | Nebylo ověřeno |
| `BLOCKED` | Nelze pokračovat bez rozhodnutí |

### 0.1 Potvrzený kontext domény (`VERIFIED`)

Následující skutečnosti uživatel explicitně potvrdil v tomto projektu:

- Jedná se o **chytrý plánovač směn** pro **zaměstnance call centra společnosti
  AAAAuto**.
- Nástroj je určen pro **managera telemarketingového oddělení**.
- Cílem je sestavování **měsíčních rozpisů směn** pro **více než 100 zaměstnanců**.
- Technologický směr: **Next.js, React, TypeScript, PostgreSQL a Prisma**.
- Plánovací předmět tedy není obecný „slot", ale **pracovní směna** v call centru.

Tato kontextová fakta jsou `VERIFIED` (potvrzena požadavkem). Konkrétní pravidla,
entity i role zůstávají `ASSUMPTION` nebo `OPEN QUESTION`, dokud je uživatel
nezávazně nepotvrdí.

## 1. Účel a hranice první verze

### 1.1 Účel (`PROPOSAL`)

Poskytnout textový základ pro **chytrý plánovač měsíčních rozpisů směn** pro
**zaměstnance call centra společnosti AAAAuto** (nástroj pro managera
telemarketingového oddělení, §0.1): co se plánuje, z jakých vstupů, jakými
pravidly a jak se reportují konflikty. Cílem je **odhalit rozhodnutí, která je
třeba potvrdit**, než bude možné psát kód.

### 1.2 V rozsahu první verze (`PROPOSAL`, k potvrzení)

- Definice předmětu plánování, časové oblasti a způsobu zadávání vstupů.
- Seznam tvrdých pravidel (hard constraints) a měkkých preferencí (soft preferences).
- Způsob detekce a hlášení konfliktů a neřešitelných situací.
- Předpokládané uživatelské role (v první verzi, bez oprávnění).

### 1.3 Mimo rozsah první verze (explicitně)

- Žádný plánovací algoritmus ani optimalizační funkce.
- Žádná **schválená doménová pravidla** (H1–H7 a S1–S5 zůstávají `ASSUMPTION`).
- Žádné reálné osobní ani zaměstnanecká data (jen syntetická/anonymizovaná).
- Žádná autentizace, zaměstnanecký portál, docházka, mzdy ani integrace s EDocházkou.
- Žádný deployment, CI/CD, cloud.

**Poznámka k databázi a API (rozlišení technické připravenosti a domény):**
Technologický směr zahrnuje **PostgreSQL a Prisma** (`VERIFIED`). Je proto v pořádku
připravit technický základ databázové vrstvy — Prisma klient, konfiguraci a schéma
**bez doménových modelů**. To se **nezaměňuje** s implementací doménových funkcí:
konkrétní databázové modely, migrace a aplikační pravidla čekají na schválení
doménových entit (OQ3–OQ5, OQ9–OQ11). Produkční databáze a reálná data zůstávají
mimo rozsah první verze.

## 2. Co má plánovací nástroj plánovat

`VERIFIED` — předmětem plánování jsou **směny zaměstnanců call centra** (§0.1).
Otázka OQ1 je tedy zodpovězena.

`ASSUMPTION` (pracovní předpoklad, k potvrzení):

- Plánuje se rozdělení **směn** mezi **zaměstnanci call centra** v rámci
  **měsíčního rozpisu** (platnost `VERIFIED`, §0.1; konkrétní pravidla však ne).
- Směna má časový rozsah (od–do) a případně požadovanou roli/odbornost
  (např. typ kampaně/fronty — k potvrzení).
- Plánovač může ponechat některé směny nepřiřazené (nedokončený plán).

`OPEN QUESTION`:

1. *(vyřešeno)* Předmět plánování: **směny zaměstnanců call centra** — `VERIFIED` (§0.1).
2. Je plán statický (jednou vygenerován) nebo se průběžně upravuje?

## 3. Základní pojmy a entity

Všechny entity níže jsou `ASSUMPTION` (k potvrzení). Pojmenování je ilustrativní.
Mapování na kontext call centra (§0.1): `Slot` = **směna**, `Worker` = **zaměstnanec
call centra**.

| Entita | Popis | Stav |
| --- | --- | --- |
| `PlanningPeriod` | Časové období plánování (např. týden, období X–Y) | `ASSUMPTION` |
| `Slot` | Pozice k obsazení = **směna** v call centru (od–do, kapacita, role) | `ASSUMPTION` |
| `Worker` | **Zaměstnanec call centra**; fiktivní, žádná reálná data | `ASSUMPTION` |
| `Assignment` | Přiřazení `Worker` do `Slot` | `ASSUMPTION` |
| `Availability` | Kdy je zaměstnanec dostupný/nedostupný | `ASSUMPTION` |
| `HardConstraint` | Pravidlo, které nesmí být porušeno | `ASSUMPTION` |
| `SoftPreference` | Preference, kterou se snažíme splnit, ale lze ji obětovat | `ASSUMPTION` |
| `Plan` | Souhrn přiřazení pro dané období + report konfliktů | `ASSUMPTION` |

`OPEN QUESTION`:

3. Které entity jsou skutečně potřeba a které jsou nadbytečné?
4. Jaké atributy entit jsou povinné (např. role, kapacita směny, dovednosti, typ kampaně)?
5. Existuje pojem „pobočka/umístění call centra", nebo stačí plochý seznam?

## 4. Možné vstupy a výstupy

### 4.1 Vstupy (`ASSUMPTION`)

| Vstup | Popis |
| --- | --- |
| Plánovací období | Časový rámec plánu |
| Seznam směn | Co má být obsazeno (sloty v call centru) |
| Seznam zaměstnanců | Syntetická/fiktivní jména |
| Dostupnost | Kdy je zaměstnanec k dispozici |
| Dovednosti/role | Co zaměstnanec umí / kdo může obsadit směnu |
| Tvrdá pravidla | Seznam omezení |
| Měkké preference | Seznam preferencí |
| Existující přiřazení | Co se má zachovat (pokud není plán nový) |

### 4.2 Výstupy (`ASSUMPTION`)

| Výstup | Popis |
| --- | --- |
| Plán přiřazení | Který zaměstnanec je v jaké směně |
| Seznam konfliktů | Kde bylo porušeno tvrdé pravidlo |
| Nepokryté směny | Kde chybí přiřazení |
| Přehled metrik | Např. počet směn na zaměstnance, rozpětí vytížení |
| Stav dokončení | Plán je úplný / neúplný |

`OPEN QUESTION`:

6. Jak se vstupy zadávají (ručně, soubor, budoucí integrace)?
7. Jaký je požadovaný tvar výstupu (seznam, tabulka, export)?
8. Mají se preference vyhodnocovat vždy, nebo až po splnění tvrdých pravidel?

## 5. Tvrdá pravidla (kandidáti, `ASSUMPTION`)

Následující seznam je **kandidát, není schválený**. Každé pravidlo musí potvrdit
uživatel, zda je skutečně povinné.

| # | Kandidát na tvrdé pravidlo | Stav |
| --- | --- | --- |
| H1 | Každá směna má nejvýše jednoho přiřazeného zaměstnance | `ASSUMPTION` |
| H2 | Zaměstnanec je v daném čase přiřazen maximálně jednou (žádná překrývající se přiřazení) | `ASSUMPTION` |
| H3 | Zaměstnanec musí být v daném čase dostupný | `ASSUMPTION` |
| H4 | Směnu může obsadit pouze zaměstnanec s požadovanou rolí/dovedností | `ASSUMPTION` |
| H5 | Maximální počet hodin (nebo směn) za období | `ASSUMPTION` |
| H6 | Minimální odpočinek mezi směnami | `ASSUMPTION` |
| H7 | Pevně dané/zamčené přiřazení nelze přepsat | `ASSUMPTION` |

`OPEN QUESTION`:

9. Která pravidla jsou skutečně tvrdá (H1–H7)?
10. Jaké jsou konkrétní limity (max. hodiny, min. odpočinek, jaká jednotka času)?
11. Existují pravidla, která nejsou v seznamu?

## 6. Měkké preference (kandidáti, `ASSUMPTION`)

| # | Kandidát na měkkou preferenci | Stav |
| --- | --- | --- |
| S1 | Rovnoměrné rozložení směn mezi zaměstnance | `ASSUMPTION` |
| S2 | Respektovat preference zaměstnanců (obliba směn/časů) | `ASSUMPTION` |
| S3 | Minimalizovat přesčasy | `ASSUMPTION` |
| S4 | Preferovat kontinuitu (stejný tým/kampaň v rámci období) | `ASSUMPTION` |
| S5 | Vyvažovat složitost/obtížnost směn | `ASSUMPTION` |

`OPEN QUESTION`:

12. Které preference jsou žádoucí (S1–S5)?
13. Mají preference seřazenou váhu/prioritu, nebo jen binárně zapnuto/vypnuto?
14. Co má přednost, když se preference navzájem vylučují?

## 7. Konflikty a neřešitelné situace

`PROPOSAL` — jak by se měly konflikty zacházet (k potvrzení):

- Engine **nepřiřazuje tiše**, pokud to poruší tvrdé pravidlo; místo toho vytvoří
  konflikt a ponechá směnu nepřiřazenou.
- Každý konflikt/nedostatek se reportuje v přehledu (typ, směna, příčina, dotčené entity).
- Neřešitelná situace (např. nedostatek dostupných zaměstnanců) se označí jako
  neúplný plán, ne jako chyba aplikace.

`ASSUMPTION` — typy situací:

| Situace | Popis |
| --- | --- |
| Nedostatek zaměstnanců | Na směnu není žádný dostupný a kompetentní zaměstnanec |
| Kolize tvrdých pravidel | Žádné přiřazení nesplňuje všechna tvrdá pravidla |
| Zamčené přiřazení | Uživatelem uzamčené přiřazení je v rozporu s novým vstupem |
| Neúplný vstup | Chybí povinný vstup (např. dostupnost) |

`OPEN QUESTION`:

15. Má se při konfliktu vyžadovat ruční rozhodnutí (human-in-the-loop)?
16. Má se plán označit jako „neúplný", nebo spustit chybu/oznámení?
17. Mají se preference obětovat v pořadí, nebo se vybrat jedno hlavní kritérium?

## 8. Předpokládané uživatelské role

`VERIFIED` — primárním uživatelem je **manager telemarketingového oddělení** (§0.1).
Zda existují další role, není určeno. Žádná autentizace není v rozsahu.

| Role | Předpokládaná schopnost | Stav |
| --- | --- | --- |
| Manažer telemarketingového oddělení | Primární uživatel; vytváří/upravuje plán směn | `VERIFIED` (identita) |
| Prohlížeč (viewer) | Čte plán a reporty, nemůže měnit | `ASSUMPTION` |
| Správce (admin) | Spravuje pravidla/role (zda vůbec existuje) | `OPEN QUESTION` |

`OPEN QUESTION`:

18. Jaké další role mimo managera telemarketingového oddělení?
19. Existuje rozdíl mezi „plánovačem" a „vedoucím", který schvaluje?
20. Je potřeba sledovat, kdo plán vytvořil/upravil (audit)?

## 9. Ilustrační příklady (`DEMO`)

> Následující příklady jsou **čistě fiktivní** (`DEMO`). Nejsou to skutečná data,
> ani návod, jak se plánuje. Slouží jen k nastínění tvaru vstupu a výstupu.

### Příklad 1 — základní plán (`DEMO`)

- Období: **měsíc**, 5 zaměstnanců call centra (ukázka zjednodušena), směny po dnech.
- Pravidla: H1, H2, H3, H5 (max. počet směn za měsíc).
- Výstup: tabulka přiřazení + seznam „nepokryté směny" (prázdné).

### Příklad 2 — konflikt (`DEMO`)

- Směna „Pátek ráno" vyžaduje roli X, ale v tento čas je dostupný pouze zaměstnanec,
  který roli X nemá.
- Očekávaný výstup: směna zůstane nepřiřazená a v reportu se objeví konflikt
  s typem „chybí kompetence".

### Příklad 3 — preference (`DEMO`)

- Dva zaměstnanci mají stejnou kompetenci; preference S1 by měla zvolit toho,
  kdo má v období méně směn.

## 10. Otevřené otázky a rozhodnutí (shrnutí)

Autoritativní seznam otázek. Čísla `OQ` odpovídají číslům `OPEN QUESTION` v sekcích
výše; v závorce je uvedena sekce (`S`).

### Vyřešené otázky

- **OQ1** (S2) — `VERIFIED`: předmětem plánování jsou **směny zaměstnanců call centra**;
  nástroj je pro **managera telemarketingového oddělení** (§0.1).

### Blokující pro definici domény

- **OQ2** (S2) Je plán statický nebo průběžně upravovaný?
- **OQ3** (S3) Které entity jsou skutečně potřeba a které nadbytečné?
- **OQ4** (S3) Jaké atributy entit jsou povinné?
- **OQ5** (S3) Existuje pojem pobočky/umístění call centra?
- **OQ9** (S5) Která pravidla jsou skutečně tvrdá (H1–H7)?
- **OQ10** (S5) Konkrétní limity tvrdých pravidel (max. hodiny, min. odpočinek)?
- **OQ11** (S5) Existují pravidla mimo uvedený seznam?

### Blokující pro chování výstupu

- **OQ6** (S4) Jak se vstupy zadávají (ručně / soubor / budoucí integrace)?
- **OQ7** (S4) Jaký je požadovaný tvar výstupu?
- **OQ8** (S4) Kdy se preference vyhodnocují?
- **OQ15** (S7) Human-in-the-loop při konfliktu?
- **OQ16** (S7) Neúplný plán vs. chyba/oznámení?

### Blokující pro preference a optimalizaci

- **OQ12** (S6) Které preference jsou žádoucí (S1–S5)?
- **OQ13** (S6) Váha/priorita preferencí?
- **OQ14** (S6) Co má přednost při vzájemném vyloučení preferencí?
- **OQ17** (S7) Pořadí obětování preferencí?

### Blokující pro role a data

- **OQ18** (S8) Jaké další role mimo managera telemarketingového oddělení?
- **OQ19** (S8) Rozdíl mezi plánovačem a schvalovatelem?
- **OQ20** (S8) Je potřeba audit (kdo plán vytvořil/upravil)?

## 11. Souvislost s aktuálním stavem projektu

| Položka | Odkaz / stav |
| --- | --- |
| Základ pro budoucí logiku | `lib/planning/README.md` — `PLANNED` |
| Přehled dokumentace | `docs/README.md` |
| Projektové instrukce | `AGENTS.md` |
| Technologický stack | Next.js + React + TypeScript + PostgreSQL + Prisma (`VERIFIED`) |
| Tento dokument | `PROPOSAL` — potvrzený kontext domény (§0.1), zbytek čeká na rozhodnutí |

Po potvrzení klíčových `OPEN QUESTION` by měly vzniknout **schválená** doménová
pravidla, ze kterých se poté může navrhnout datový model a až následně implementace.
