# Rozhodovací list pro managera — doménové P0

> **Stav: `OPEN QUESTION` — čeká na odpovědi managera.**
>
> Tento dokument **nerozhoduje**. Překládá otevřené otázky z
> [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) do podoby, kterou lze
> probrat s managerem telemarketingu, a sbírá odpovědi. Nic z toho, co je níže,
> není schválené pravidlo ani hotová funkce.
>
> Autoritativní seznam otázek zůstává v `DOMAIN_SPECIFICATION.md`. Tento list
> ho jen překládá do praxe a zaznamenává odpovědi.

Datum vytvoření: 22. 10. 2026
Vyplnil: ______________________

## Jak list použít

- U každé otázky jsou **varianty** a sloupec **dopad na kód** — aby bylo vidět,
  co která odpověď znamená.
- **„Návrh k diskusi"** je `PROPOSAL` — inženýrský tip, **ne rozhodnutí**.
  Manager ho může vzít, upravit nebo odmítnout.
- Odpověď se zapisuje na řádek `Odpověď:` pod otázkou.
- **„Nevím" je platná odpověď.** Otázka pak zůstane `OPEN QUESTION` a věc, která
  na ní závisí, zůstane `BLOCKED`. Nic se nedomýšlí.
- Co v tomto listu není, je shrnuté v části „Mimo tento list" na konci.

## Přehled a co co odblokuje

| # | Otázka | Co odblokuje | Stav |
| --- | --- | --- | --- |
| OQ2 | Statický, nebo průběžně upravovaný plán? | chování kontroly po ručních úpravách | `OPEN QUESTION` |
| OQ3 | Které entity skutečně potřebujeme? | doménové typy | `OPEN QUESTION` |
| OQ4 | Které atributy jsou povinné? | doménové typy a formuláře | `OPEN QUESTION` |
| OQ5 | Pobočka / umístění call centra? | datový model, filtry | `OPEN QUESTION` |
| OQ9 | Která pravidla jsou tvrdá? | první pravidla v jádře | `OPEN QUESTION` |
| OQ10 | Jaké konkrétní limity? | implementace limitů (H5, H6) | `OPEN QUESTION` |
| OQ11 | Existují pravidla mimo seznam? | rozsah prvního řezu | `OPEN QUESTION` |
| OQ15 | Kdo rozhoduje při konfliktu? | tok po nálezu problému | `OPEN QUESTION` |
| OQ16 | Neúplný plán, nebo chyba? | stav úplnosti plánu | `OPEN QUESTION` |
| OQ17 | Pořadí obětování preferencí? | navazuje na OQ12–OQ14 | `OPEN QUESTION` |
| OQ18 | Jaké další role? | později, až s přihlášením | `OPEN QUESTION` |
| OQ19 | Plánovač vs. schvalovatel? | schvalovací tok | `OPEN QUESTION` |
| OQ20 | Potřebujeme audit změn? | historie a odpovědnost | `OPEN QUESTION` |

---

## 1. Plán a jeho úpravy

### OQ2 — Má být plán statický, nebo se průběžně upravuje?

**Proč to potřebujeme:** určuje, jestli engine počítá jen jednou při vygenerování,
nebo musí znovu zkontrolovat plán po každé ruční změně.

| Varianta | Co to znamená v praxi | Dopad na kód |
| --- | --- | --- |
| A — statický | Engine vygeneruje návrh, manager ho přijme nebo odmítne. Úpravy se dělají mimo nástroj. | jednodušší; stačí jeden běh kontroly |
| B — průběžně upravovaný | Manager mění přiřazení přímo v nástroji a pravidla se přepočítávají. | potřeba historie změn, opakovaná kontrola, zamčená přiřazení |
| C — kombinace | Návrh je výchozí, ruční úpravy jsou možné a každá změna projde kontrolou. | B + jasné rozlišení „návrh" vs. „ruční úprava" |

**Návrh k diskusi (`PROPOSAL`):** C — protože se v kandidátech už objevuje
zamčené přiřazení (H7), které bez ručních úprav nedává smysl.

**Odpověď:**

---

## 2. Entity a atributy

### OQ3 — Které entity skutečně potřebujeme?

**Proč to potřebujeme:** každá entita znamená typy, databázovou tabulku, sloupce
v UI a testovací data. Méně entit = rychlejší první řez.

Kandidáti z doménové specifikace: období, směna, zaměstnanec, přiřazení,
dostupnost, role/dovednost, úvazek.

| Varianta | Obsah | Umožní pravidla |
| --- | --- | --- |
| A — minimální | období, směna, zaměstnanec, přiřazení | H1, H2 |
| B — s dostupností | A + dostupnost | navíc H3 |
| C — s rolemi | B + role/dovednosti | navíc H4 |
| D — plná | C + úvazky, kampaně, pobočky | navíc H5, H6 — ale nejvíc vstupů |

Poznámka: pravidla jsou v jádře už teď **vstupem**, takže je nemusíme ukládat
jako samostatnou entitu.

**Návrh k diskusi (`PROPOSAL`):** nejdřív rozhodnout OQ9 (která pravidla jsou
tvrdá) a rozsah entit nechat vyplynout z nich. Pro první řez odhaduji A nebo B.

**Odpověď:**

### OQ4 — Které atributy jsou povinné?

**Proč to potřebujeme:** bez povinných údajů nejde pravidla vyhodnotit; zároveň
každý povinný údaj musí někdo zadat nebo dodat.

Zaškrtněte, co má být **povinné**:

| Entita | Atribut | K čemu slouží | Povinné? |
| --- | --- | --- | --- |
| Směna | datum | základní evidence | [ ] |
| Směna | čas od–do | H2 (překryv), H6 (odpočinek) | [ ] |
| Směna | kapacita | H1 (kolik lidí smí být na směně) | [ ] |
| Směna | role/dovednost | H4 | [ ] |
| Zaměstnanec | identifikátor (jméno) | základní evidence | [ ] |
| Zaměstnanec | role/dovednost | H4 | [ ] |
| Zaměstnanec | úvazek / hodinový fond | H5 | [ ] |
| Přiřazení | směna + zaměstnanec | základní evidence | [ ] |
| Přiřazení | zamčené (nelze přepsat) | H7 | [ ] |
| Dostupnost | časové okno | H3 | [ ] |

**Návrh k diskusi (`PROPOSAL`):** minimum pro H1 + H2 (směna: datum, od–do;
zaměstnanec: identifikátor; přiřazení: obojí). Zbytek podle OQ9.

**Odpověď:**

### OQ5 — Existuje pojem pobočky / umístění call centra?

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — žádné | Jeden plochý seznam směn i zaměstnanců. | nejjednodušší |
| B — jedno call centrum, ale týmy/fronty | Směny patří týmu nebo kampani. | filtr týmu, bez geografie |
| C — více poboček | Vlastní obsazenost a pravidla pro každou pobočku. | další entita a pravidla per pobočka |

**Návrh k diskusi (`PROPOSAL`):** A pro první verzi (kontext: jedno oddělení,
100+ zaměstnanců). B až když to manager potvrdí.

**Odpověď:**

---

## 3. Tvrdá pravidla

### OQ9 — Která pravidla jsou skutečně tvrdá?

**Proč to potřebujeme:** „tvrdé" = nikdy se nesmí porušit, engine ho vždy
kontroluje. „Měkké" = preference, dá se obětovat. Co není potřeba, neimplementujeme.

Zaškrtněte u každého pravidla, kam patří:

| # | Pravidlo lidsky | Tvrdé | Měkké | Nepotřebuji | Potřebuje data |
| --- | --- | --- | --- | --- | --- |
| H1 | Každou směnu obsadí nejvýš jeden člověk. | [ ] | [ ] | [ ] | směna |
| H2 | Jeden člověk nemůže být na dvou směnách ve stejný čas. | [ ] | [ ] | [ ] | časy směn |
| H3 | Člověk může být přiřazen jen v době, kdy je dostupný. | [ ] | [ ] | [ ] | dostupnost |
| H4 | Směnu smí obsadit jen člověk s potřebnou rolí/dovedností. | [ ] | [ ] | [ ] | role |
| H5 | Maximální počet hodin (nebo směn) za období. | [ ] | [ ] | [ ] | limit (OQ10) |
| H6 | Minimální odpočinek mezi směnami. | [ ] | [ ] | [ ] | limit (OQ10) |
| H7 | Zamčené přiřazení nelze přepsat. | [ ] | [ ] | [ ] | OQ2 |

**Návrh k diskusi (`PROPOSAL`):** H1 + H2 jako minimum — nepotřebují žádná další
data. H3 až pokud existuje evidence dostupnosti. H7 jen pokud OQ2 = úpravy.

**Odpověď:**

### OQ10 — Jaké jsou konkrétní limity?

**Proč to potřebujeme:** bez čísel nelze pravidlo implementovat — a vymyslet je
nesmím. Tohle je čistě vstup managera.

| Veličina | Otázka | Odpověď |
| --- | --- | --- |
| Maximum hodin za měsíc | Kolik hodin? Platí stejně pro všechny, nebo podle úvazku? | |
| Minimum odpočinku mezi směnami | Kolik hodin mezi koncem a začátkem další směny? | |
| Maximum směn v řadě | Kolik dní v kuse nejvýš? | |
| Maximum směn za měsíc | Kolik směn nejvýš? | |
| Jiný limit | Co dalšího se nesmí překročit? | |

**Návrh k diskusi (`PROPOSAL`):** žádný — čísla musí dodat manager.

**Odpověď:**

### OQ11 — Existují pravidla mimo uvedený seznam?

**Proč to potřebujeme:** seznam H1–H7 je jen kandidát. Skutečná pravidla mohou
být jinde (např. víkendy, svátky, jazykové dovednosti, kontinuita týmu).

Pro každé další pravidlo prosím: **co** se nesmí / má, **kdy** to platí a zda je
**tvrdé**, nebo **měkké**.

**Návrh k diskusi (`PROPOSAL`):** žádný — pravidla musí vyjmenovat manager.

**Odpověď:**

---

## 4. Konflikty a výstup

### OQ15 — Kdo rozhoduje, když vznikne konflikt?

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — jen manager | Engine konflikt jen ohlásí, nerozhoduje. | nejjednodušší a nejbezpečnější |
| B — engine vybere sám | Engine vybere „nejlepší" variantu podle priorit. | potřebuje váhy preferencí (OQ12–OQ14) |
| C — engine navrhne, manager potvrdí | Engine nabídne řešení, rozhodnutí zůstává na člověku. | B + potvrzovací krok |

Projektové pravidlo, které platí vždy: **engine sám nikdy neschvaluje plán.**

**Návrh k diskusi (`PROPOSAL`):** A nebo C. B by znamenalo, že musíme nejdřív
vyřešit preference.

**Odpověď:**

### OQ16 — Má být neúplný plán platný stav, nebo chyba?

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — neúplný plán je platný | Některé směny zůstanou nepřiřazené a objeví se v reportu. | stav „neúplný" + seznam nepokrytých směn |
| B — chyba/oznámení | Plán se nevytvoří, dokud nejde obsadit všechno. | návrh se vůbec neuloží |
| C — konfigurovatelné | Manager si zvolí chování. | obojí + nastavení |

**Návrh k diskusi (`PROPOSAL`):** A — doménová specifikace (§7) už navrhuje
„neúplný plán, ne chyba aplikace".

**Odpověď:**

### OQ17 — Jak se obětují preference, když se vylučují?

**Proč to potřebujeme:** tato otázka má smysl jen tehdy, pokud se preference
vůbec používají (OQ12–OQ14, mimo tento list).

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — pevné pořadí | Preference mají danou prioritu a obětují se zdola. | váhy/pořadí v konfiguraci |
| B — nic se neobětuje | Buď jsou splněné, nebo je to konflikt. | žádné váhy |
| C — manager rozhodne případ od případu | Engine jen ukáže, co se vylučuje. | bez automatického rozhodování |

**Návrh k diskusi (`PROPOSAL`):** odložit — preference nejsou v prvním řezu.

**Odpověď:**

---

## 5. Role a audit

### OQ18 — Jaké další role kromě managera?

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — jen manager | Jediný uživatel nástroje. | nic navíc |
| B — manager + čtenář | Někdo další se jen dívá. | oprávnění pro čtení |
| C — + správce pravidel | Někdo spravuje pravidla a role. | samostatná role |
| D — víc rolí | Např. plánovač a vedoucí. | schvalovací tok |

**Návrh k diskusi (`PROPOSAL`):** A pro první verzi — přihlašování je stejně
mimo rozsah.

**Odpověď:**

### OQ19 — Je plánovač a schvalovatel stejná osoba?

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — stejná osoba | Manager plán navrhne i schválí. | žádný schvalovací tok |
| B — oddělené role | Někdo navrhne, jiný schválí. | schvalovací tok a evidence |

**Návrh k diskusi (`PROPOSAL`):** A. Varianta B by znamenala samostatnou
funkcionalitu nad rámec prvního řezu.

**Odpověď:**

### OQ20 — Potřebujeme audit změn?

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — není potřeba | Nikdo neřeší, kdo co změnil. | nic navíc |
| B — základní | Kdo plán vytvořil/upravil a kdy. | identita uživatele + záznam |
| C — plný | Historie všech změn s detailem. | auditní tabulka a zobrazení |

**Návrh k diskusi (`PROPOSAL`):** pro první verzi A (nemáme přihlašování),
s přípravou na B, až přihlášení vznikne.

**Odpověď:**

---

## Mimo tento list

Tyto otázky zatím neblokují první řez, proto jsou v druhém kole:

| # | Otázka | Proč až později |
| --- | --- | --- |
| OQ6 | Jak se vstupy zadávají (ručně / soubor / integrace)? | první řez pracuje se syntetickými daty |
| OQ7 | Jaký je požadovaný tvar výstupu? | navazuje na OQ16 |
| OQ8 | Kdy se vyhodnocují preference? | až s OQ12–OQ14 |
| OQ12–OQ14 | Které preference, váhy a precedence? | první řez stojí na tvrdých pravidlech |

## Co se stane s odpověďmi

1. Odpovědi se zapíšou do [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md);
   potvrzené otázky se označí `VERIFIED` (potvrzeno managerem). Co zůstane
   otevřené, zůstane `OPEN QUESTION`.
2. Podle potvrzených odpovědí vzniknou doménové typy v `lib/planning/` a první
   tvrdá pravidla jako `PlanningRule`.
3. Do té doby zůstává konkrétní generování rozpisu `BLOCKED` a nic se
   nedomýšlí.
