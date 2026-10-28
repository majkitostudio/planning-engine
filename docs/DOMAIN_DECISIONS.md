# Rozhodovací list pro managera — doménové P0

> **Stav: `PARTIALLY ANSWERED` — část rozhodnutí potvrzena 24. 10. 2026,
> zbytek čeká na managera.**
>
> Tento dokument **nerozhoduje**. Překládá otevřené otázky z
> [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) do podoby, kterou lze
> probrat s managerem telemarketingu, a sbírá odpovědi. Nic z toho, co je níže,
> není schválené pravidlo ani hotová funkce, dokud to není výslovně označeno
> `VERIFIED`.
>
> Autoritativní seznam otázek zůstává v `DOMAIN_SPECIFICATION.md`. Tento list
> ho jen překládá do praxe a zaznamenává odpovědi.

Datum vytvoření: 22. 10. 2026
Poslední aktualizace: 28. 10. 2026
Vyplnil: uživatel / zadání projektu (částečně)

## Evidence z původního emailu managera (`SOURCE EVIDENCE`, 28. 10. 2026)

Přiložený email s odpověďmi managera doplňuje obraz současného provozu. Nejde
automaticky o nové schválení všech pravidel; níže uvedené body proto nemění
stav `VERIFIED` bez dalšího sjednocení s aktuálním zadáním projektu.

- Plánování dnes probíhá každý čtvrtek na následující týden. Nejprve se
  zapisují dovolené, náhradní volno a nemoci, poté odpolední směny a víkend;
  ranní směny lze v současném programu doplnit hromadně.
- Požadavky zaměstnanců přicházejí přes Outlook přes jejich nadřízené a mají
  čtvrteční uzávěrku. Současné přenášení hotového rozpisu do rosteru je ruční;
  automatický přenos není požadován.
- Sestavení rastru běžně zabere jeden až dva dny. Hlavní obtíž je dodržet
  potřebné počty lidí při absencích a dovolených.
- Email uvádí konkrétní minima obsazení: všední den ráno 23, všední den
  odpoledne 8, víkend ráno 12 a víkend odpoledne 9. Aktuální projektové
  rozhodnutí ale říká, že obsazení je konfigurovatelný vstup; tato čísla proto
  nejsou zapsána jako univerzální konstanty.
- Email uvádí šest zaměstnanců na částečný úvazek. To potvrzuje, že v reálném
  provozu existují, ale nemění rozhodnutí, že jsou mimo první funkční řez.

### Rozpor k vyřešení před použitím emailu jako specifikace

Email uvádí víkendovou ranní směnu 7:45–18:00 a odpolední 10:45–21:00.
Aktuální projektové rozhodnutí (`VERIFIED`) uvádí 7:45–16:30 a 12:45–21:00.
Dokud manager nepotvrdí, která varianta platí pro tento projekt, zůstávají
stávající potvrzené časy beze změny a email je pouze zdrojem otevřené otázky.

Email zároveň popisuje pravidlo 35 hodin po šesti pracovních dnech, které se
se stávajícím rozhodnutím shoduje. Pravidlo „kdo pošle požadavek dříve, má
prioritu“ je třeba ještě výslovně přijmout jako pravidlo pro engine, nebo jej
ponechat jako popis dnešní ruční praxe.

## Nová potvrzená rozhodnutí (`VERIFIED`)

Tato rozhodnutí nejsou odpovědi na původní OQ, ale od 24. 10. 2026 platí a
mění zadání:

- **AI je hlavní plánovací logika.** Vytváří konkrétní návrh směn, vyhodnocuje
  požadavky, absence, dostupnost a obsazení a navrhuje řešení problémů.
- **Deterministická validace je nezávislá kontrola návrhu AI.** Nenahrazuje
  plánování.
- **Manažer návrh potvrzuje.** Aplikace bez potvrzení nic neukládá ani
  neaplikuje.
- **První funkční verze:** jeden týden, zaměstnanci na plný úvazek.
- **Potvrzené časy směn:** ranní 7:45–16:30 (i víkend), odpolední ve všední den
  13:15–21:00, víkendová odpolední 12:45–21:00.
- **Po šesti po sobě jdoucích pracovních dnech:** alespoň 35 h nepřetržitého
  odpočinku.
- **Práce o víkendu:** dva dny volna během téhož týdne.
- **Obsazení směn:** konfigurovatelný vstup, ne historická konstanta.
- **Countdown CRM:** budoucí architektonický směr, nyní žádná integrace.

## Jak list použít

- U každé otázky jsou **varianty** a sloupec **dopad na kód** — aby bylo vidět,
  co která odpověď znamená.
- **„Návrh k diskusi"** je `PROPOSAL` — inženýrský tip, **ne rozhodnutí**.
  Manager ho může vzít, upravit nebo odmítnout.
- Odpověď se zapisuje na řádek `Odpověď:` pod otázkou.
- **„Nevím" je platná odpověď.** Otázka pak zůstane `OPEN QUESTION` a věc, která
  na ní závisí, zůstane `BLOCKED`. Nic se nedomýšlí.
- Co v tomto listu není, je shrnuté v části „Mimo tento list" na konci.
- Na první schůzku použij krátký výběr šesti otázek níže; tento list je plné
  znění a místo pro zápis odpovědí.

## První schůzka — šest otázek

Na jednu schůzku (30–45 min) stačí těchto šest otázek. „Nevím“ je platná
odpověď — otázka zůstane `OPEN QUESTION` a nic se nedomýšlí.

| # | Otázka | Stav | Proč na první schůzku |
| --- | --- | --- | --- |
| OQ9 | Která pravidla jsou tvrdá? | `PARTIALLY ANSWERED` | určuje, co se kontroluje a jaká data potřebujeme |
| OQ10 | Jaké jsou konkrétní limity? | `PARTIALLY ANSWERED` | čísla musí dodat manager, nejde je odvodit |
| OQ3 | Které entity potřebujeme? | `PARTIALLY ANSWERED` | rozsah typů, formulářů a testů |
| OQ4 | Které údaje jsou povinné? | `PARTIALLY ANSWERED` | bez nich pravidla nelze vyhodnotit |
| OQ2 | Statický, nebo průběžně upravovaný plán? | `OPEN QUESTION` | určuje historii změn a zamykání |
| OQ16 | Může být plán neúplný? | `VERIFIED` (navazuje OQ23) | určuje, co se zobrazí a uloží |

**Co na první schůzce neřešit:** preference (OQ12–OQ14), zadávání dat (OQ6),
tvar výstupu (OQ7), role a audit (OQ18–OQ20) — to je druhé kolo, až bude
první řez stát.

## Přehled a co co odblokuje

| # | Otázka | Co odblokuje | Stav |
| --- | --- | --- | --- |
| OQ2 | Statický, nebo průběžně upravovaný plán? | chování kontroly po ručních úpravách | `OPEN QUESTION` |
| OQ3 | Které entity skutečně potřebujeme? | doménové typy | `PARTIALLY ANSWERED` — minimální kontrakt navržen |
| OQ4 | Které atributy jsou povinné? | doménové typy a formuláře | `PARTIALLY ANSWERED` — kontrakt navržen |
| OQ5 | Pobočka / umístění call centra? | datový model, filtry | `OPEN QUESTION` — první řez předpokládá plochý seznam |
| OQ9 | Která pravidla jsou tvrdá? | první pravidla v jádře | `PARTIALLY ANSWERED` — odpočet 6 dnů a víkend potvrzeny |
| OQ10 | Jaké konkrétní limity? | implementace limitů (H5, H6) | `PARTIALLY ANSWERED` — 35 h potvrzeno, ostatní ne |
| OQ11 | Existují pravidla mimo seznam? | rozsah prvního řezu | `OPEN QUESTION` |
| OQ15 | Kdo rozhoduje při konfliktu? | tok po nálezu problému | `VERIFIED` — AI navrhne, validace zkontroluje, manažer potvrdí |
| OQ16 | Neúplný plán, nebo chyba? | stav úplnosti plánu | `VERIFIED` — neúplný návrh se přizná a nabídnou se alternativy |
| OQ17 | Pořadí obětování preferencí? | navazuje na OQ12–OQ14 | `OPEN QUESTION` |
| OQ18 | Jaké další role? | později, až s přihlášením | `OPEN QUESTION` |
| OQ19 | Plánovač vs. schvalovatel? | schvalovací tok | `OPEN QUESTION` |
| OQ20 | Potřebujeme audit změn? | historie a odpovědnost | `OPEN QUESTION` |
| OQ21 | Co je „pracovní den“ pro 6 dnů v řadě? | výklad pravidla odpočinku | `VERIFIED` |
| OQ22 | Schválený požadavek vs. přání? | zpracování preferencí | `OPEN QUESTION` |
| OQ23 | Lze potvrdit částečně neúplný návrh? | schvalovací tok | `VERIFIED` |
| OQ24 | Jak se započítávají přestávky? | pracovní doba a validace | `VERIFIED` |

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

**Odpověď:** `PARTIALLY ANSWERED` (24. 10. 2026) — pro první týdenní řez je
navržený minimální kontrakt v [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md):
zaměstnanec, čas směny, potřebné obsazení, schválená absence, požadavek,
existující směna a pravidla. Potvrzení tohoto tvaru vznikne ověřením
v implementaci; nejde o potvrzení všech budoucích entit.

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

**Odpověď:** `PARTIALLY ANSWERED` (24. 10. 2026) — povinné pro první řez:
týden, zaměstnanec, den, druh směny, potřebné obsazení, absence a existující
směny. Role, dovednosti a zamykání zůstávají otevřené. Přesný tvar je
v [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md).

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

**Odpověď:** `PARTIALLY ANSWERED` (24. 10. 2026) — potvrzeno:
- Schválená absence blokuje přiřazení (H3).
- Po šesti po sobě jdoucích pracovních dnech alespoň 35 h nepřetržitého
  odpočinku (H6).
- Zaměstnanec pracující o víkendu má v témže týdnu dva dny volna (H8).
- Překryv směn a existence přiřazení jsou strukturální integrita návrhu (H1, H2).
- Bez potvrzení manažera se nic neukládá (H11).

Zůstává otevřené: role/dovednosti (H4), maximální hodiny nebo směny (H5) a
zamykání přiřazení (H7).

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

**Odpověď:** `PARTIALLY ANSWERED` (24. 10. 2026) — potvrzeno je pouze:
- 6 po sobě jdoucích pracovních dnů → alespoň 35 h nepřetržitého odpočinku.
- Práce o víkendu → 2 dny volna v témže týdnu.

Ostatní limity (maximum hodin za týden, maximum směn v řadě, jiný odpočinek)
zůstávají `OPEN QUESTION`. Čísla se nesmí domýšlet.

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

**Odpověď:** `VERIFIED` (24. 10. 2026) — **C**. AI vytvoří konkrétní návrh
a aktivně navrhne řešení; deterministická validace ho nezávisle zkontroluje;
manažer rozhodne, zda návrh přijme, upraví, nebo odmítne. AI ani validace
neschvalují a aplikace bez potvrzení nic neukládá.

### OQ16 — Má být neúplný plán platný stav, nebo chyba?

| Varianta | Co to znamená | Dopad na kód |
| --- | --- | --- |
| A — neúplný plán je platný | Některé směny zůstanou nepřiřazené a objeví se v reportu. | stav „neúplný" + seznam nepokrytých směn |
| B — chyba/oznámení | Plán se nevytvoří, dokud nejde obsadit všechno. | návrh se vůbec neuloží |
| C — konfigurovatelné | Manager si zvolí chování. | obojí + nastavení |

**Návrh k diskusi (`PROPOSAL`):** A — doménová specifikace (§7) už navrhuje
„neúplný plán, ne chyba aplikace".

**Odpověď:** `VERIFIED` (24. 10. 2026) — **A s podmínkou**. Neúplný návrh je
přípustný výstup k posouzení, ale musí být výslovně označen jako neúplný,
nesmí se vydávat za plně ověřený a musí nabídnout konkrétní alternativy.
OQ23 je nyní rozhodnuto samostatně níže: částečný návrh se zobrazí k posouzení,
ale potvrzení zůstává zakázané.

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

## 6. Nové otázky z prvního řezu

Tyto otázky vznikly při přípravě týdenního kontraktu. OQ21, OQ23 a OQ24 jsou
níže uzavřené pro první řez; ostatní otázky zůstávají předmětem dalšího kola.

### OQ21 — Co je „pracovní den“ pro pravidlo šesti dnů v řadě?

**Proč to potřebujeme:** pravidlo „po šesti po sobě jdoucích pracovních dnech
35 h odpočinku“ potřebuje vědět, zda se počítají kalendářní dny s jakoukoli
směnou, nebo jen dny se směnou přesahující určitou délku. Bez toho může
validace označit správný plán za chybný nebo naopak přehlédnout únavu.

**Odpověď:** `VERIFIED` (28. 10. 2026) — pracovním dnem je kalendářní den,
ve kterém má zaměstnanec alespoň jednu směnu. Více směn v jednom kalendářním
dni se započítá jako jeden pracovní den. První řez nepoužívá práh délky směny;
výklad se vztahuje k datu přiřazení.

### OQ22 — Jak se liší schválený požadavek od přání?

**Proč to potřebujeme:** schválená dovolená musí blokovat přiřazení. Pouhé
přání na volno nebo preference směny blokovat nemá; AI ho může zohlednit.
Pokud se to nepotvrdí, hrozí, že se přání změní na nárok nebo naopak ignoruje.

**Odpověď:**

### OQ23 — Může manažer potvrdit částečně neúplný návrh?

**Proč to potřebujeme:** návrh může mít méně lidí, než je potřeba. Systém to
musí přiznat. Není ale potvrzené, zda takový návrh smí manažer uložit jako
platný stav, nebo musí nejdřív doplnit obsazení.

**Odpověď:** `VERIFIED` (28. 10. 2026) — částečný návrh se smí zobrazit a
projednávat, ale manažer jej nesmí potvrdit. `ConfirmedPlan` vzniká pouze u
kompletního návrhu, který je `ready_for_review`.

### OQ24 — Jak se započítávají přestávky?

**Proč to potřebujeme:** zadání uvádí 30minutovou přestávku, ale časy
víkendové odpolední směny 12:45–21:00 při ní nedávají osm odpracovaných hodin
(vychází 7 h 45 min). Rozpor je potřeba vyřešit, jinak by se z něj stal tichý
předpoklad. Do potvrzení se odpracovaná doba nepoužívá jako tvrdé pravidlo.

**Odpověď:** `VERIFIED` (28. 10. 2026) — validace v první verzi používá hrubý
interval začátku a konce směny. Přestávka ani odpracovaná doba nejsou tvrdým
validačním pravidlem. Toto rozhodnutí popisuje chování plánovacího engine;
není pracovněprávním posudkem ani výpočtem placené doby.

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
2. Podle potvrzených odpovědí vzniknou doménové typy v `lib/planning/domain/`
   a první tvrdá pravidla jako `PlanningRule`.
3. První týdenní řez už není blokovaný: potvrzená rozhodnutí stačí na návrh,
   validaci a potvrzení. Otevřené otázky omezují další rozšíření (měsíce,
   částečné úvazky, role, váhy preferencí) a musí zůstat viditelně otevřené.
   Nic se nedomýšlí.
