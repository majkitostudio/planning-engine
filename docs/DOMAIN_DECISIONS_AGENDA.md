# Agenda schůzky s managerem — 6 otázek pro první řez

> **Stav: `OPEN QUESTION` — čeká na odpovědi managera.**
>
> Jednostránková agenda pro **jednu schůzku (30–45 min)**. Nejsou to všechny
> otázky projektu — jen těch šest, které odblokují první funkční řez.
> Plné znění, varianty a dopad na kód jsou v
> [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md).

## Cíl schůzky

Odpovědět na šest otázek níže. **„Nevím" je platná odpověď** — otázka zůstane
otevřená a nic se nedomýšlí. Lepší je nechat otázku otevřenou než hádat.

Co si manager nemusí pamatovat: u každé otázky je krátké připomenutí, o co jde.

---

## 1. Která pravidla jsou skutečně tvrdá? (OQ9)

**Otázka:** Která z těchto pravidel se **nikdy nesmí porušit**? Která jsou jen
doporučení a která nepotřebujete?

| # | Pravidlo lidsky | Tvrdé / měkké / nepotřebuji |
| --- | --- | --- |
| H1 | Každou směnu obsadí nejvýš jeden člověk | |
| H2 | Jeden člověk nemá dvě směny ve stejný čas | |
| H3 | Člověk je přiřazen jen v době, kdy je dostupný | |
| H4 | Směnu smí obsadit jen člověk s potřebnou rolí | |
| H5 | Maximální počet hodin (nebo směn) za období | |
| H6 | Minimální odpočinek mezi směnami | |
| H7 | Zamčené přiřazení nelze přepsat | |

**Proč to potřebujeme:** tvrdá pravidla určují, co se vůbec kontroluje, a podle
nich se rozhodne, která data potřebujeme.

**Odpověď:**

---

## 2. Jaké jsou konkrétní limity? (OQ10)

**Otázka:** U pravidel, která potřebují číslo, jaké číslo platí?

| Veličina | Otázka | Odpověď |
| --- | --- | --- |
| Maximum hodin za měsíc | Kolik? Platí stejně pro všechny, nebo podle úvazku? | |
| Minimum odpočinku mezi směnami | Kolik hodin mezi koncem a začátkem další směny? | |
| Maximum směn v řadě | Kolik dní v kuse nejvýš? | |
| Maximum směn za měsíc | Kolik směn nejvýš? | |
| Jiný limit | Co dalšího se nesmí překročit? | |

**Proč to potřebujeme:** čísla nejde vymyslet — musí je dodat manager. Pokud
teď nejsou po ruce, stačí říct „dodám později" a pravidlo zůstane otevřené.

**Odpověď:**

---

## 3. Které entity skutečně potřebujeme? (OQ3)

**Otázka:** Co všechno musí nástroj evidovat?

- [ ] období (měsíc)
- [ ] směna
- [ ] zaměstnanec
- [ ] přiřazení (kdo je na které směně)
- [ ] dostupnost
- [ ] role / dovednost
- [ ] úvazek
- [ ] pobočka
- [ ] něco dalšího: ______________________

**Proč to potřebujeme:** každá entita znamená formulář, data a testy. Méně entit
= rychlejší první verze. Rozsah by měl vyplynout z odpovědi na otázku 1.

**Odpověď:**

---

## 4. Které údaje jsou povinné? (OQ4)

**Otázka:** U každé entity — co musí být vyplněné, aby šel plán zkontrolovat?

| Entita | Údaj | Povinné? |
| --- | --- | --- |
| Směna | datum | |
| Směna | čas od–do | |
| Směna | kapacita | |
| Směna | role / dovednost | |
| Zaměstnanec | identifikátor (jméno) | |
| Zaměstnanec | role / dovednost | |
| Zaměstnanec | úvazek | |
| Přiřazení | směna + zaměstnanec | |
| Přiřazení | zamčené (nelze přepsat) | |
| Dostupnost | časové okno | |

**Proč to potřebujeme:** co není povinné, nemusí existovat — a pravidlo, které
ten údaj potřebuje, nepůjde vyhodnotit.

**Odpověď:**

---

## 5. Statický plán, nebo průběžné úpravy? (OQ2)

**Otázka:** Když nástroj vytvoří návrh plánu, co se s ním děje dál?

- [ ] **A — statický:** manager návrh přijme nebo odmítne, úpravy dělá mimo nástroj.
- [ ] **B — průběžně upravovaný:** manager mění přiřazení přímo v nástroji a pravidla se přepočítají.
- [ ] **C — kombinace:** návrh je výchozí, ruční úpravy jsou možné a každá změna projde kontrolou.

**Proč to potřebujeme:** u varianty B/C musí nástroj znát historii změn a
zamčená přiřazení; varianta A je výrazně jednodušší.

**Odpověď:**

---

## 6. Může být plán neúplný? (OQ16)

**Otázka:** Když se nepodaří obsadit všechny směny, co se má stát?

- [ ] **A — neúplný plán je platný:** nepokryté směny se vypíšou v reportu.
- [ ] **B — je to chyba:** plán se nevytvoří, dokud nejde obsadit všechno.
- [ ] **C — konfigurovatelné:** manager si zvolí chování.

**Proč to potřebujeme:** ovlivňuje, jak se návrh ukládá a co se zobrazí managerovi.

**Odpověď:**

---

## Co se stane s odpověďmi

1. Odpovědi se zapíšou do [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) a
   potvrzené otázky se v [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md)
   označí `VERIFIED`.
2. Podle nich vzniknou doménové typy a první tvrdá pravidla — nic dřív.
3. Otázky bez odpovědi zůstanou `OPEN QUESTION` a na nich závislá práce zůstane
   `BLOCKED`.

## Co na této schůzce řešit nechceme

Preference (OQ12–OQ14), způsob zadávání dat (OQ6), tvar výstupu (OQ7), role a
audit (OQ18–OQ20) — to je druhé kolo, až bude první řez stát.
