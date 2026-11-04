# Návrh doménové specifikace — Plánovací Engine

Technický repozitář: `planning-engine`
Dokument: `docs/DOMAIN_SPECIFICATION.md`

> **Stav dokumentu: ČÁSTEČNĚ POTVRZENÝ NÁVRH (PARTIALLY VERIFIED PROPOSAL).**
>
> Dokument obsahuje **potvrzený kontext domény** (§0.1), rozhodnutí (§0.2),
> časy směn a dvě pracovní pravidla. Současná měsíční implementace s OR-Tools
> se liší od schváleného záměru využít AI jako hlavní plánovací logiku; rozdíl
> je zaznamenán v `docs/DOMAIN_DECISIONS.md`. Zbytek zůstává `PROPOSAL` nebo `OPEN QUESTION` — dokument
> stále není úplná schválená specifikace a nevymýšlí chybějící pravidla.
> Každý pracovní předpoklad je označen `ASSUMPTION`, každá nevyřešená věc
> `OPEN QUESTION`.
>
> **Aktuální model měsíčního MVP:** lokální OR-Tools sestavuje přiřazení;
> deterministická validace nezávisle kontroluje celý měsíc; manažer rozhoduje
> o potvrzení. Historický týdenní AI tok zůstává oddělený.
>
> **Implementační stav (`IMPLEMENTED`, ne schválení domény):** doménové typy,
> potvrzené časy, `validatePlan()`, AI kontrakt, Gemini adaptér a orchestrátor
> existují. To nemění nic na tom, že nepotvrzená pravidla a výklady zůstávají
> `ASSUMPTION` nebo `OPEN QUESTION`.

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
- Dlouhodobým cílem je sestavování **měsíčních rozpisů směn** pro **více než
  100 zaměstnanců**; aktuální MVP plánuje jeden celý kalendářní měsíc.
- Technologický směr: **Next.js, React, TypeScript, PostgreSQL a Prisma**.
- Plánovací předmět tedy není obecný „slot", ale **pracovní směna** v call centru.

Tato kontextová fakta jsou `VERIFIED` (potvrzena požadavkem). Konkrétní pravidla,
entity i role zůstávají `ASSUMPTION` nebo `OPEN QUESTION`, dokud je uživatel
nezávazně nepotvrdí.

### 0.2 Potvrzená rozhodnutí z 24. 10. až 3. 11. 2026 (`VERIFIED`)

Následující rozhodnutí potvrdil uživatel v zadání pro pokračování projektu.
Jsou závazná pro další implementaci:

- **AI je schváleným záměrem hlavní plánovací logiky.** Aktuální měsíční
  implementace přesto sestavuje přiřazení lokálním OR-Tools; tento rozpor je
  otevřený a sám o sobě nemění schválené rozhodnutí.
- **Deterministická validace je nezávislá kontrola návrhu.** Nenahrazuje
  plánování; ověřuje, co provider navrhl.
- **Manažer návrh kontroluje a potvrzuje.** Bez potvrzení se navržené změny
  neukládají ani neaplikují.
- **Návrh, ověřený návrh a potvrzené změny jsou tři různé stavy.**
- **Neověřené nebo chybějící informace se nesmí prezentovat jako jistota.**
  Systém musí přiznat omezení a nabídnout nejlepší dostupné alternativy.
- **Aktuální měsíční MVP:** celý kalendářní měsíc a zaměstnanci na plný
  úvazek; týdenní tabulka je pohled do měsíčního návrhu. Částečné úvazky a
  integrace zůstávají mimo rozsah.
- **Potřebné obsazení směn je konfigurovatelný vstup.** Historické počty se
  nepovažují za univerzálně platné bez ověření.
- **Střídání ranních a odpoledních směn je měkké přání managera.** Porovnávají
  se sousední pracovní směny zaměstnance i přes libovolný počet dnů volna;
  potvrzená pravidla a potřebné obsazení mají přednost. Výjimky se zobrazí,
  ale samy neblokují potvrzení. Pokud chybí směna před nebo po plánovaném
  měsíci, střídání v dotčeném okraji je neověřené. `VERIFIED`, 3. 11. 2026.

#### Potvrzené časy směn

| Typ směny | Začátek | Konec | Hrubá délka |
| --- | ---: | ---: | ---: |
| Ranní směna (všední den i víkend) | 7:45 | 16:30 | 8 h 45 min |
| Odpolední směna ve všední den | 13:15 | 21:00 | 7 h 45 min |
| Víkendová odpolední směna | 12:45 | 21:00 | 8 h 15 min |

Víkendová ranní směna se řídí ranním časem výše, protože dokumentace ani
potvrzené rozhodnutí neříká jiný čas.

Víkendová odpolední směna začíná ve 12:45 záměrně, aby se do pevného času
12:45–21:00 vešla půlhodinová obědová přestávka. Nejde o přesčas ani o
operativní prodloužení směny.

`VERIFIED` **(OQ24) — přestávky a výpočet odpracované doby:** první verze
validace používá hrubý interval začátku a konce směny. Přestávka ani odpracovaná
doba nejsou tvrdým validačním pravidlem. Toto rozhodnutí popisuje chování
plánovacího engine; nejde o pracovněprávní posudek ani výpočet placené doby.

#### Potvrzená pravidla

- **Odpočinek po šesti dnech:** po šesti po sobě jdoucích pracovních dnech musí
  následovat alespoň **35 hodin nepřetržitého odpočinku**. `VERIFIED`
- **Víkend a dva dny volna:** zaměstnanec, který pracuje o víkendu, má mít
  během téhož týdne **dva dny volna**. `VERIFIED`; výklad „během týdne“ jako
  pondělí–neděle je `ASSUMPTION` do potvrzení. Dny volna nemusí následovat
  po sobě; odpočinek po šesti pracovních dnech se kontroluje samostatně. `VERIFIED`
- **Plný úvazek:** první verze neobsahuje zaměstnance na částečný úvazek.
  `VERIFIED` jako rozsah, ne jako doménové pravidlo.
- **Konfigurovatelné obsazení:** počty potřebných zaměstnanců na směnách jsou
  vstup, ne historická konstanta. `VERIFIED`
- **Provozní minima pro MVP:** Po–Pá ráno 23 a odpoledne 8; So–Ne ráno 12 a
  odpoledne 9. Jde o výchozí profil konfigurovatelného vstupu, potvrzený
  managerem 30. 10. 2026. `VERIFIED`
- **Pracovní den pro pravidlo šesti dnů:** kalendářní den s alespoň jednou
  směnou; více směn v jednom dni se počítá jako jeden pracovní den. `VERIFIED`
- **Potvrzení neúplného návrhu:** neúplný návrh se smí zobrazit k posouzení,
  ale nesmí být potvrzen. `VERIFIED` (OQ23)

### 0.3 Potvrzený směr operativních náhrad (29. 10. 2026)

Následující rozhodnutí potvrzují rozsah přípravy dalšího implementačního řezu.
Nejsou schválením dosud otevřených pracovněprávních nebo personálních pravidel.

- Náhrada začíná nad posledním manažerem potvrzeným plánem týdne a po potvrzení
  vytváří novou verzi celého týdne.
- První řez řeší jednu celou směnu. Dílčí nástup uprostřed směny se zatím
  nepodporuje.
- AI smí navrhnout změny i u dalších celých přiřazení v týdnu, pokud je každá
  změna viditelná v dopadu návrhu.
- Výpadek je samostatný provozní incident na konkrétní směně; před potvrzením
  zůstává pouze v rozpracovaném návrhu.
- AI má dodat tři odlišné konkrétní varianty, pokud jsou dostupné. Pokud jich
  není dost, systém to přizná.
- Dopad variant se počítá deterministicky. Po výběru manažerem se vybraná
  varianta znovu ověří stejnou validací jako běžný týdenní návrh.
- Minimální obsazení je konfigurovatelný vstup po jednotlivých dnech a směnách.
  Potvrzený výchozí profil managera je Po–Pá 23 ráno / 8 odpoledne a So–Ne
  12 ráno / 9 odpoledne. Jde o interní provozní minimum, nikoli zákonný limit.
- Délka směny je pevně daná definicí směny. Operativní náhrada nesmí směnu
  prodlužovat, zkracovat ani dělit.
- Přesčasy se v tomto provozu nepoužívají. Varianta vyžadující práci mimo
  pevnou směnu je neplatná.
- Priorita návrhu je: zachovat minimální obsazení, neporušit ověřená tvrdá
  pravidla, změnit co nejméně dalších lidí a zobrazit celý řetězec následků,
  pokud se mu nelze vyhnout.
- Při běžném plánování každé evidované volno blokuje směnu. Při operativní
  náhradě smí AI navrhnout kandidáta s potvrzeným volnem, pokud tím neporuší
  pravidlo 35 h odpočinku po šesti pracovních dnech. O kontaktování zaměstnance
  a změně volna rozhoduje manager. Změna se zaznamená a systém navrhne
  náhradní volno; jeho datum ani přidělení se nesmí domýšlet či aplikovat bez
  potvrzení managera. `VERIFIED` jako procesní směr; termín náhradního volna
  zůstává `OPEN QUESTION`.
- První řez používá syntetická data a simulovaný provider. Gemini se zapojí až
  po stabilizaci kontraktu operativní náhrady.
- V prvním řezu se audit zaměřuje na potvrzenou změnu, původní a nový rozpis,
  incident, vybranou variantu, výchozí verzi a identitu managera.
- Limity budou připravené jako konfigurovatelný profil. Právní baseline je
  pouze `SOURCE EVIDENCE`; bez interního a právního potvrzení zůstává jejich
  vyhodnocení `NOT VERIFIED`.
- V provozním vstupu se nesmí automaticky zaměnit skutečná dovolená, plánovaný
  den volna a náhradní volno po víkendové práci. Pokud jejich přesné rozlišení
  není dostupné, návrh musí tuto nejistotu přiznat.

### 0.5 Právní baseline (`SOURCE EVIDENCE`, 29. 10. 2026)

Pro nastavitelný profil limitů byly zkontrolovány příslušné části aktuálního
znění zákoníku práce v příručce MPSV. Tento přehled není právní posudek ani
automaticky schválené pravidlo aplikace:

- § 79 a § 80: standardní týdenní pracovní doba a písemně sjednaná kratší
  pracovní doba,
- § 83: maximální délka směny 12 hodin,
- § 84: standardní oznámení rozvrhu nebo jeho změny nejpozději 2 týdny předem,
- § 88: přestávka nejméně 30 minut po nejvýše 6 hodinách nepřetržité práce,
- § 90 a § 92: denní a týdenní nepřetržitý odpočinek,
- § 93: podmínky a limity práce přesčas,
- § 217: určování, změna a odvolání z dovolené včetně možných nákladů.

Odkazy na zdroje: [MPSV — pracovní doba a odpočinek](https://ppropo.mpsv.cz/VIIIPracovnidobaadobaodpocinku),
[MPSV — úplné znění zákoníku práce](https://ppropo.mpsv.cz/zakon_262_2006),
[MPSV — dovolená](https://ppropo.mpsv.cz/XDovolena).

### 0.4 Evidence z původního emailu managera (`SOURCE EVIDENCE`, 28. 10. 2026)

Původní email s odpověďmi managera potvrzuje současný pracovní postup:
čtvrteční plánování na další týden, nejprve zadání absencí, následné obsazení
odpoledních směn a víkendu, požadavky sbírané přes Outlook a ruční přepis
hotového rozpisu do současného rosteru. Automatický přenos proto není
požadavkem prvního řezu.

Email také uvádí minima 23 / 8 ve všední den a 12 / 9 o víkendu a šest
částečných úvazků. Manager 30. 10. 2026 potvrdil tato minima jako nový zdroj
pravdy pro výchozí konfigurovatelný profil. Částečné úvazky zůstávají mimo MVP,
ale jsou plánovaným budoucím rozšířením.

Email obsahuje rozpor proti potvrzeným víkendovým časům v §0.2: uvádí ranní
7:45–18:00 a odpolední 10:45–21:00, zatímco aktuální projektové rozhodnutí
uvádí 7:45–16:30 a 12:45–21:00. Do vyřešení tohoto rozporu se potvrzené časy
nemění. Pravidlo 35 hodin po šesti pracovních dnech se naopak shoduje.

Manager potvrdil, že požadavky schvaluje nebo odmítá ručně. Aplikace má ukázat
mezery vzniklé při vyhovění požadavku a navrhnout jejich pokrytí; nesmí je
automaticky vyhodnotit. Dřívější odeslání samo o sobě neurčuje automatickou
prioritu.

## 1. Účel a hranice první verze

### 1.1 Účel (`VERIFIED`)

Poskytnout základ pro **chytrý plánovač směn** pro **zaměstnance call centra
společnosti AAAAuto** (nástroj pro managera telemarketingového oddělení, §0.1):
co se plánuje, z jakých vstupů, jakými pravidly a jak se reportují konflikty.
Hlavní měsíční MVP má manažerovi ušetřit práci: lokální plánovač sestaví návrh na celý měsíc, nezávislá validace ho zkontroluje a manažer ho potvrdí nebo odmítne.

### 1.2 V rozsahu aktuálního měsíčního MVP (`VERIFIED`)

- Jeden celý kalendářní měsíc; týdenní tabulka je pohled do něj.
- `VERIFIED` (rozhodnutí uživatele, 3. 11. 2026): manažer má mít také možnost
  doplánovat jen část měsíce; stávající směny mimo plánovanou část se zachovají.
  Implementace tohoto rozšíření je `PLANNED`, současný tok je celoměsíční.
- `VERIFIED` (rozhodnutí uživatele, 3. 11. 2026): střídání ranních a
  odpoledních je přání, nikoli povinné pravidlo. Jeho zohlednění plánovačem je
  `PLANNED`; výklad střídání přes dny volna zůstává otevřený.
- Zaměstnanci na plný úvazek; částečné úvazky jsou mimo rozsah.
- Lokální OR-Tools plánovač vytváří konkrétní přiřazení směn.
- Deterministická validace nezávisle kontroluje celý měsíc podle dostupných podkladů.
- Výstup rozlišuje nalezené řešení, známou neproveditelnost a nedokončený běh.
- AI pomoc s pokyny či vysvětlením zůstává oddělená a volitelná.
- Potvrzení manažerem před uložením nebo aplikací změn.
- Syntetická demonstrační data; žádná reálná osobní data.

### 1.3 Mimo rozsah měsíčního MVP (explicitně)

- Zaměstnanci na částečný úvazek.
- Integrace s Countdown CRM, EDocházkou, mzdami nebo jinými systémy.
- Automatické ukládání nebo aplikace návrhu bez potvrzení manažera.
- Produkční nasazení, produkční databáze a reálná data.
- Vymýšlení pravidel, která nejsou potvrzená (H1–H7 a S1–S5 zůstávají
  z velké části `ASSUMPTION`/`OPEN QUESTION`).

**Poznámka k databázi a API:** technologický směr zahrnuje **PostgreSQL a
Prisma** (`VERIFIED`). Návrh měsíce se ukládá jako samostatný nepotvrzený běh;
potvrzený rozpis se změní až samostatným potvrzením manažera.

### 1.4 Aktuální měsíční plánovací model (`VERIFIED`)

```text
vstupní podklady
  → lokální OR-Tools vytvoří měsíční přiřazení
  → deterministická validace návrh nezávisle zkontroluje
  → výsledek: návrh + nálezy + neověřené kontroly
  → manažer zkontroluje a potvrdí (nebo odmítne / upraví)
  → teprve potom se změny uloží
```

AI není potřeba pro vytvoření měsíčního návrhu. Doplňující textové pokyny se
v režimu OR-Tools nevyhodnocují a systém to přizná. Výsledek validace není
schválení; schválení je vždy samostatný krok manažera.

### 1.5 Další implementační řez: operativní náhrada (`IMPLEMENTED` / `SIMULATED`)

Další práce navazuje na hotový týdenní návrh, ale není jeho součástí. Cílem je
workflow:

```text
potvrzený týdenní plán
  → výpadek konkrétního člověka na konkrétní směně
  → tři AI varianty náhrady
  → výběr managerem
  → deterministická validace vybrané varianty
  → potvrzení a nová verze týdne
```

Pojmy `ShiftIncident`, `ReplacementRequest` a `ReplacementOption` jsou
implementované pro syntetický pilot v `lib/planning/domain/types.ts`. Nejsou
produkční doménovou specifikací; jejich rozšíření zůstává závislé na OQ2–OQ4,
OQ9–OQ11 a OQ20. OQ22 je částečně zodpovězená; otevřený zůstává přesný termín
náhradního volna po záskoku během schválené dovolené.

## 2. Co má plánovací nástroj plánovat

`VERIFIED` — předmětem plánování jsou **směny zaměstnanců call centra** (§0.1).
Otázka OQ1 je tedy zodpovězena.

`VERIFIED` pro první verzi:

- Měsíční MVP plánuje **celý kalendářní měsíc** pro zaměstnance na plný úvazek; týdenní pohled není samostatný plán.
- Směna má potvrzený časový rozsah (ranní / odpolední, všední den / víkend).
- Potřebné obsazení každé směny je vstup; nemusí být stejné pro všechny dny.
- Návrh může obsahovat nepokryté směny, ale musí je přiznat a nabídnout
  alternativy; nesmí je vydávat za plně ověřený plán.

`ASSUMPTION`:

- Role/dovednost může být volitelný atribut, ale žádné pravidlo o rolích není
  potvrzené. První řez se bez něj obejde.

`OPEN QUESTION`:

2. **Historická otázka původního týdenního návrhu; pro měsíční MVP nahrazena.**
   Manažer může upravit nepotvrzený návrh ve vybraném týdenním pohledu. Každá
   úprava vytvoří novou verzi po nezávislé kontrole celého měsíce. Potvrzený
   rozpis se mění až samostatným potvrzením manažera.

## 3. Základní pojmy a entity

Konkrétní minimální kontrakt první verze je v
[`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) a v TypeScriptu v
`lib/planning/domain/`. Následující tabulka je pojmový přehled, ne druhá
definice kontraktu.

| Entita | Popis | Stav |
| --- | --- | --- |
| `PlanningWeek` | Legacy týdenní kontrakt; v měsíčním MVP jde o pohled do měsíčního návrhu | `IMPLEMENTED` (legacy) |
| `Employee` | Zaměstnanec call centra; v první verzi plný úvazek, fiktivní data | `VERIFIED` (rozsah) |
| `ShiftDefinition` | Potvrzené časy ranní/odpolední směny ve všední den a o víkendu | `VERIFIED` |
| `StaffingRequirement` | Kolik zaměstnanců je potřeba na dané směně v daném dni | `VERIFIED` (vstup) |
| `Absence` | Dovolená, nemoc nebo jiná absence; schválená blokuje přiřazení | `ASSUMPTION` (stav) |
| `EmployeeRequest` | Požadavek na volno nebo preference směny | `IMPLEMENTED` / `SIMULATED` (manager review); skutečný příjem požadavků není implementován |
| `ExistingAssignment` | Již existující směna, vůči které se počítají změny | `VERIFIED` (vstup) |
| `PlanningRules` | Potvrzená pravidla odpočinku a víkendových dnů volna | `VERIFIED` |
| `PlanDraft` | Legacy návrh AI a společný tvar přiřazení; měsíční běh sestavuje lokální OR-Tools | `IMPLEMENTED` (typ) |
| `ShiftIncident` | Provozní výpadek zaměstnance na konkrétní směně | `IMPLEMENTED` / `SIMULATED` |
| `ReplacementRequest` | Požadavek na náhradu nad konkrétní verzí potvrzeného týdne | `IMPLEMENTED` / `SIMULATED` |
| `ReplacementOption` | Jedna konkrétní varianta náhrady s dopočítaným dopadem | `IMPLEMENTED` / `SIMULATED` |
| `ControlResult` | Výsledek nezávislé validace | `IMPLEMENTED` (jádro) |
| `ConfirmedPlan` | Až manažerem potvrzený výsledek; nevzniká automaticky | `IMPLEMENTED` (typ) / `PLANNED` (vznik potvrzením) |

`OPEN QUESTION`:

3. Které entity jsou skutečně potřeba a které jsou nadbytečné? *(pro první řez
   je navržen minimální kontrakt; potvrzení vznikne ověřením v implementaci)*
4. Jaké atributy entit jsou povinné (např. role, kapacita směny, dovednosti, typ kampaně)?
5. Existuje pojem „pobočka/umístění call centra", nebo stačí plochý seznam?
   *(první řez předpokládá plochý seznam — `ASSUMPTION`)*

## 4. Vstupy a výstupy

Konkrétní minimální tvar je v [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md).
Zde je obsahový přehled.

### 4.1 Vstupy

| Vstup | Popis | Stav |
| --- | --- | --- |
| Týden | Pondělí–nedělí, pro který se plánuje | `VERIFIED` |
| Zaměstnanci | Identita, plný úvazek; syntetická data | `VERIFIED` (rozsah) |
| Potřebné obsazení | Počet zaměstnanců na směně v daném dni | `VERIFIED` (vstup) |
| Schválené absence | Dovolená, nemoc, jiná absence; blokují přiřazení | `VERIFIED` (význam), `ASSUMPTION` (stav) |
| Požadavky a preference | Volno, preference ranní/odpolední | `IMPLEMENTED` / `SIMULATED` (náhled a rozhodnutí nad dvěma fixture požadavky); skutečný příjem a plánovací AI tok `NOT VERIFIED` |
| Existující směny | Výchozí stav, vůči kterému se počítají změny | `VERIFIED` (vstup) |
| Výpadek směny | Konkrétní zaměstnanec, datum, směna a výchozí verze plánu | `PROPOSAL` pro operativní řez |
| Pravidla | Odpočinek po 6 dnech, víkendové dny volna | `VERIFIED` |
| Časy směn | Potvrzené ranní/odpolední časy | `VERIFIED` |
| Role/dovednosti | Volitelný atribut, bez potvrzeného pravidla | `OPEN QUESTION` |

AI dostává jen data potřebná pro daný týden. Neposílají se zbytečná osobní
data; první řez pracuje výhradně se syntetickými údaji.

Individuální pracovní omezení (max. hodiny, zvláštní dostupnost mimo absence)
nejsou potvrzená. První řez je reprezentuje plným úvazkem a schválenými
absencemi; per-zaměstnanecké limity jsou `OPEN QUESTION` (OQ9–OQ11) a nesmí se
doplnit jako „rozumný default“.

### 4.2 Výstupy

| Výstup | Popis | Stav |
| --- | --- | --- |
| Navržené směny | Konkrétní přiřazení zaměstnanec–den–směna | `IMPLEMENTED` (typ) |
| Změny oproti stavu | Přidané, odebrané a zachované směny | `IMPLEMENTED` (výpočet) |
| Nesplněné požadavky | Nepokryté směny a nedostatek lidí | `IMPLEMENTED` (výpočet pokrytí) |
| Výsledek validace | Nálezy nezávislých pravidel se závažností | `IMPLEMENTED` (jádro) |
| Vysvětlení | Proč AI zvolila dané přiřazení a co omezuje | `IMPLEMENTED` (typ; plnění AI `NOT VERIFIED`) |
| Alternativy | Konkrétní náhradní řešení při konfliktu | `IMPLEMENTED` (typ; plnění AI `NOT VERIFIED`) |
| Varianty náhrady | Tři odlišné celé varianty s kandidátem, dopadem a kompromisy | `IMPLEMENTED` / `SIMULATED`; kvalita AI výstupu `NOT VERIFIED` |
| Stav návrhu | Návrh / ověřený návrh / čeká na potvrzení | `IMPLEMENTED` (typy stavů) |
| Potvrzené změny | Samostatný výsledek až po rozhodnutí manažera | `IMPLEMENTED` / `SIMULATED`; produkční DB `NOT VERIFIED` |

`OPEN QUESTION`:

6. Jak se vstupy zadávají (ručně, soubor, budoucí integrace)? První řez
   pracuje s připravenými syntetickými daty.
7. Jaký je požadovaný tvar výstupu (seznam, tabulka, export)? První řez
   zobrazí návrh v existující obrazovce.
8. Mají se preference vyhodnocovat vždy, nebo až po splnění tvrdých pravidel?
   Zpracování preferencí není potvrzené.

## 5. Pravidla

Následující seznam rozlišuje potvrzená pravidla od kandidátů. Potvrzené pravidlo
musí být vynuceno deterministickou validací, ne jen instrukcí pro AI.

| # | Pravidlo | Stav | Poznámka |
| --- | --- | --- | --- |
| H1 | Každé přiřazení je jeden zaměstnanec na jedné směně; směna může mít víc přiřazení podle obsazení | `VERIFIED` (význam) | Nahrazuje starší „max. jeden na směnu“. |
| H2 | Zaměstnanec nesmí být ve dvou směnách, které se překrývají | `VERIFIED` (integrita) | Základní invariant návrhu. |
| H3 | Schválená absence blokuje přiřazení | `VERIFIED` | Jiná omezení dostupnosti jsou `OPEN QUESTION`. |
| H4 | Směnu smí obsadit jen zaměstnanec s požadovanou rolí/dovedností | `ASSUMPTION` | Role nejsou potvrzené. |
| H5 | Maximální počet hodin nebo směn za období | `OPEN QUESTION` | Právní baseline je zdroj evidence; konkrétní profil není potvrzený. |
| H6 | Po šesti po sobě jdoucích pracovních dnech alespoň 35 h nepřetržitého odpočinku | `VERIFIED` | Pracovní den je kalendářní den s alespoň jednou směnou (OQ21). |
| H7 | Uzamčené přiřazení nelze přepsat | `OPEN QUESTION` | První řez nemá potvrzené zamykání. |
| H8 | Zaměstnanec pracující o víkendu má v témže týdnu dva dny volna | `VERIFIED` | Výklad „během týdne“ = pondělí–nedělí je `ASSUMPTION`. |
| H9 | První verze pouze plné úvazky | `VERIFIED` (rozsah) | Není pravidlo pro plánování, ale omezení rozsahu. |
| H10 | Potřebné obsazení je splněno, nebo je nedostatek přiznán | `VERIFIED` (cíl) | Zda je nedostatek tvrdá chyba, je `OPEN QUESTION`. |
| H11 | Bez potvrzení manažera se nic neukládá | `VERIFIED` (proces) | Netýká se obsahu plánu. |
| H12 | Operativní náhrada nesmí prodlužovat, zkracovat ani dělit pevnou směnu; přesčas se nepoužívá | `VERIFIED` (interní) | Náhrada se vybírá pouze z celých existujících směn. |

`OPEN QUESTION`:

9. Která z kandidátních pravidel (H4, H5, H7) jsou skutečně tvrdá?
10. Jaké jsou konkrétní limity (max. hodiny, jiný odpočinek než 35 h po 6 dnech)?
11. Existují další pravidla mimo seznam (svátky, jazyky, kontinuita týmu)?
OQ21 je uzavřena: pracovní den je kalendářní den s alespoň jednou směnou;
více směn v jednom dni se započítá jednou.

## 6. Měkké preference (kandidáti, `ASSUMPTION`)

| # | Kandidát na měkkou preferenci | Stav |
| --- | --- | --- |
| S1 | Rovnoměrné rozložení směn mezi zaměstnance | `ASSUMPTION` |
| S2 | Respektovat preference zaměstnanců (obliba směn/časů) | `ASSUMPTION` |
| S3 | Práce mimo pevnou směnu | `VERIFIED` (interní zákaz; viz H12) |
| S4 | Preferovat kontinuitu (stejný tým/kampaň v rámci období) | `ASSUMPTION` |
| S5 | Vyvažovat složitost/obtížnost směn | `ASSUMPTION` |
| S6 | Střídat ranní a odpolední mezi sousedními pracovními směnami i přes dny volna | `VERIFIED` (měkké přání managera, 3. 11. 2026) |

Preference S6 může manager výslovně zapnout pro měsíční návrh. Lokální OR-Tools
ji optimalizuje a nezávislá validace zobrazí opakování nebo chybějící
návaznost. Nejde o tvrdé pravidlo a tyto nálezy samy neblokují potvrzení.
Další měkké preference a jejich váhy se do MVP nepřidávají. Manager rozhoduje,
zda požadavku vyhoví; aplikace pouze ukáže dopad na obsazení a navrhne pokrytí.
U operativní náhrady platí aktuální minimum nastavené pro konkrétní datum a
směnu, ověřená tvrdá pravidla a co nejmenší dopad na další lidi. Deterministická
validace nesmí žádnou měkkou preferenci vydávat za splněný nárok.

`OPEN QUESTION`:

12. Které preference jsou žádoucí (S1–S5)?
13. Mají preference seřazenou váhu/prioritu, nebo jen binárně zapnuto/vypnuto?
14. Co má přednost, když se preference navzájem vylučují?
22. Jak se liší „schválený požadavek“ od „přání“?

## 7. Konflikty a neřešitelné situace

`VERIFIED` — chování první verze:

- AI se pokusí sestavit co nejlepší návrh i při omezeních.
- Deterministická validace návrh nezávisle zkontroluje a nálezy vrátí.
- Pokud nelze splnit všechny požadavky, systém to **přizná**, vypíše konkrétní
  nedostatky a nabídne alternativy. Nesmí výsledek vydávat za plně ověřený.
- Manažer rozhoduje, zda návrh přijme, upraví, nebo odmítne. Aplikace sama
  neukládá ani neaplikuje změny.
- Neúplný návrh je přípustný výstup k posouzení, ale není „platný schválený
  plán“. Podle OQ23 jej manažer v první verzi potvrdit nemůže.

`ASSUMPTION` — typy situací:

| Situace | Popis |
| --- | --- |
| Nedostatek obsazení | Na směnu je méně dostupných zaměstnanců, než požaduje obsazení |
| Kolize pravidel | Navržené přiřazení porušuje odpočinek, absenci nebo překryv |
| Neúplný vstup | Chybí povinný údaj (např. obsazení nebo čas směny) |
| Neplatný výstup AI | AI vrátí strukturu, která neodpovídá kontraktu |
| Selhání validace | Pravidlo vyhodí chybu; výsledek se nesmí tvářit jako čistý |

`OPEN QUESTION`:

17. Jak se mají obětovat preference, když se vylučují? (navazuje na §6)
23. Může manažer potvrdit i částečně neúplný návrh, nebo musí nejdřív doplnit
    obsazení?

## 8. Předpokládané uživatelské role

`VERIFIED` — primárním uživatelem je **manager telemarketingového oddělení** (§0.1).
Jeho úloha v první verzi: zkontrolovat vstupní podklady, spustit tvorbu návrhu,
posoudit návrh a výsledky validace, případně zvolit alternativu a potvrdit
uložení. AI ani validace neschvalují. Žádná autentizace není v rozsahu.

| Role | Předpokládaná schopnost | Stav |
| --- | --- | --- |
| Manažer telemarketingového oddělení | Primární uživatel; spouští návrh, kontroluje a potvrzuje změny | `VERIFIED` (identita a potvrzení) |
| Prohlížeč (viewer) | Čte plán a reporty, nemůže měnit | `ASSUMPTION` |
| Správce (admin) | Spravuje pravidla/role (zda vůbec existuje) | `OPEN QUESTION` |

`OPEN QUESTION`:

19. Jaké další role mimo managera telemarketingového oddělení?
20. Existuje rozdíl mezi „plánovačem" a „vedoucím", který schvaluje?
21. Je potřeba sledovat, kdo plán vytvořil/upravil (audit)?

## 9. Ilustrační příklady (`DEMO`)

> Následující příklady jsou **čistě fiktivní** (`DEMO`). Nejsou to skutečná data,
> ani návod, jak se plánuje. Slouží jen k nastínění tvaru vstupu a výstupu.

### Příklad 1 — základní týden (`DEMO`)

- Období: **jeden týden**, 8 zaměstnanců na plný úvazek (ukázka zjednodušena).
- Obsazení: ráno 3 lidé, odpoledne 2 lidé; o víkendu stejný princip podle
  potvrzených časů.
- Pravidla: absence, překryv, 35 h odpočinku po 6 dnech, dva dny volna po
  víkendu.
- Výstup: tabulka přiřazení + seznam „nepokryté směny“ (prázdné), vysvětlení
  a výsledek validace.

### Příklad 2 — konflikt (`DEMO`)

- Na páteční ranní směnu je potřeba 3 lidé, ale dva jsou na schválené dovolené
  a třetí by porušil 35 h odpočinku.
- Očekávaný výstup: návrh přizná nedostatek, nabídne konkrétní alternativu
  (např. přesun jiného zaměstnance z odpoledne) a uvede, co by to ovlivnilo.
  Validace nález potvrdí; manažer rozhodne.

### Příklad 3 — preference (`DEMO`)

- Dva zaměstnanci mohou nastoupit na odpolední směnu; jeden má preferenci
  odpoledne. AI ho zvolí a vysvětlí proč. Preference není nárok a validace ji
  nevyžaduje.

## 10. Otevřené otázky a rozhodnutí (shrnutí)

Autoritativní seznam otázek. Čísla `OQ` odpovídají číslům `OPEN QUESTION` v sekcích
výše; v závorce je uvedena sekce (`S`).

Praktická podoba těchto otázek pro vyplnění s managerem (varianty, dopad na kód,
místo na odpověď) je v [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md). Zůstává
podřízený tomuto dokumentu — autoritativní seznam je tento.

### Vyřešené otázky

- **OQ1** (S2) — `VERIFIED`: předmětem plánování jsou **směny zaměstnanců call centra**;
  nástroj je pro **managera telemarketingového oddělení** (§0.1).
- **OQ15** (S7) — `VERIFIED`: AI navrhne, validace zkontroluje, manažer potvrdí.
  Nejedná se o automatické schválení AI.
- **OQ16** (S7) — `VERIFIED`: neúplný návrh je přípustný výstup k posouzení,
  musí být označen jako neúplný a nesmí se vydávat za plně ověřený.
- **AI role, rozsah prvního řezu, časy směn, 35 h odpočinku, dva dny volna po
  víkendu a výklady OQ21, OQ23 a OQ24** — `VERIFIED` (§0.2). Jde o závazná
  rozhodnutí v jejich popsaném rozsahu.

### Blokující pro úplnou definici domény

- **OQ2** (S2) Je plán statický nebo průběžně upravovaný? Pro operativní řez je
  potvrzeno průběžné vytváření nové verze týdne; širší pravidla historie zůstávají otevřená.
- **OQ3** (S3) Které entity jsou skutečně potřeba a které nadbytečné? Syntetický
  pilot používá `ShiftIncident`, `ReplacementRequest` a `ReplacementOption`; jejich
  produkční rozšíření zůstává otevřené.
  *(minimální kontrakt první verze je navržený v `PLANNING_CONTRACT.md`)*
- **OQ4** (S3) Které atributy entit jsou povinné? Výpadek musí nejméně odkazovat
  na zaměstnance, datum, celou směnu a výchozí verzi plánu; přesný kontrakt je otevřený.
- **OQ5** (S3) Existuje pojem pobočky/umístění call centra?
- **OQ9** (S5) Která pravidla jsou skutečně tvrdá (H4, H5, H7)?
- **OQ10** (S5) Konkrétní limity tvrdých pravidel (max. hodiny, jiný odpočinek)?
- **OQ11** (S5) Existují pravidla mimo uvedený seznam?

### Blokující pro chování výstupu

- **OQ6** (S4) Jak se vstupy zadávají (ručně / soubor / budoucí integrace)? Pro první
  operativní řez je zvolen ruční vstup v UI; Outlook a import zůstávají mimo rozsah.
- **OQ7** (S4) Jaký je požadovaný tvar výstupu? Pro první řez jsou cílem tři karty
  variant s kandidátem, změnami, pokrytím, validací a kompromisy.
- **OQ8** (S4) Kdy se preference vyhodnocují?

### Blokující pro preference a optimalizaci

- **OQ12** (S6) Které preference jsou žádoucí (S1–S5)?
- **OQ13** (S6) Váha/priorita preferencí?
- **OQ14** (S6) Co má přednost při vzájemném vyloučení preferencí?
- **OQ17** (S7) Pořadí obětování preferencí?
- **OQ22** (S6) Manager schvaluje či odmítá ručně a při přijetí vidí dopad;
  po záskoku během schválené dovolené zůstává otevřené přesné datum náhradního
  volna.

### Blokující pro role a data

- **OQ18** (S8) Jaké další role mimo managera telemarketingového oddělení?
- **OQ19** (S8) Rozdíl mezi plánovačem a schvalovatelem?
- **OQ20** (S8) Je potřeba audit (kdo plán vytvořil/upravil)? Pro první řez je
  potvrzen základní audit potvrzené změny; rozsah odmítnutých variant je otevřený.

## 11. Souvislost s aktuálním stavem projektu

| Položka | Odkaz / stav |
| --- | --- |
| Základ pro budoucí logiku | `lib/planning/README.md` — jádro, doménový kontrakt, AI kontrakt a orchestrátor `IMPLEMENTED` |
| Datové kontrakty | [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) — týdenní kontrakt je historický; měsíční provider a validace jsou popsány v §11.1 (`IMPLEMENTED`) |
| Doménové typy | `lib/planning/domain/` — `IMPLEMENTED` (kontrakt a potvrzená pravidla); zbytek `OPEN QUESTION` |
| Přehled dokumentace | `docs/README.md` |
| Projektové instrukce | `AGENTS.md` |
| Technologický stack | Next.js + React + TypeScript + PostgreSQL + Prisma (`VERIFIED`) |
| Tento dokument | `PARTIALLY VERIFIED PROPOSAL` — potvrzený kontext a rozhodnutí §0.2, zbytek čeká na rozhodnutí |

Aktuální měsíční MVP plánuje celý zvolený kalendářní měsíc lokálním OR-Tools providerem; týdny jsou pouze pohledy do měsíčního návrhu. Syntetický integrační průchod ověřil vytvoření návrhu, ruční úpravu, novou kontrolu a obnovení nepotvrzené verze. Návrh zůstal `NOT VERIFIED`, protože chyběly potřebné návazné podklady a otevřený výklad víkendového volna; potvrzení zůstalo zablokované. Preference střídání S6 je `IMPLEMENTED`: lokální solver ji používá jako měkký cíl a nezávislá validace vrací výjimky i neověřenou návaznost bez toho, aby preference sama blokovala potvrzení. Částečné úvazky, další preference, produkční provoz a další integrace zůstávají mimo tento ověřený řez. Doménu ani čísla nedomýšlej.

Návaznost z exportu rosteru je nyní `IMPLEMENTED`: klient převádí semicolon CSV s hlavičkou dne/zkratky týdne, manažer volí měsíc a aplikace ověří shodu kalendáře. Ukládají se jen výslovné směny a volno; prázdné buňky, dovolená a nemoc zůstávají neznámé, dokud je manažer výslovně neopraví. Surový text, jména zdrojových řádků ani soubor se neposílají na server. Uložená historie a její přesné časy vstupují do validace návaznosti; totožné překryvy se sloučí a rozpory ponechají stav neúplný. OR-Tools nedostává vlastní časy jako typ ranní/odpolední. Parser, úložiště a návaznost mají syntetické testy; poslední sada Vitest se zapnutým lokálním solverem má 444 úspěšných a 3 přeskočené testy, lint, typecheck, build a Prisma validace prošly. Python testy solveru prošly v počtu 21. Migrace nebyla aplikována a skutečné transakční zápisy ani provozní databáze nejsou ověřené (`NOT VERIFIED`). Prohlížečový průchod importem ani ověření s připojenou databází neproběhly.

**Doplánování úseku měsíce — `IMPLEMENTED`, provozní průchod `NOT VERIFIED`:** manažer může vybrat souvislý úsek. Server načte uložený roster a při chybějícím či rozporném pevném dni nebo při překryvu se známým dnem v úseku výpočet odmítne. OR-Tools zachová známé dny mimo úsek, včetně vlastních časů pro výpočet odpočinku; nové směny vytváří pouze v úseku. Nezávislá kontrola prověří měsíc, přiřazení a návaznosti; přesné vlastní časy bez známého typu směny neprokazují pokrytí ranní ani odpolední. Před potvrzením se v databázové transakci porovná uložený snímek s aktuálním rosterem. Potvrzený výsledek zachovává pevné dny pro další měsíc. Opětovné uložení aktuálního importu je idempotentní; obnovení staršího obsahu vytváří novou verzi. Syntetické testy pokrývají skutečný lokální solver, kontrolu změny podkladu a simulovanou databázovou transakci; izolovaná obrazovka volby období byla zobrazena v prohlížeči. Celý tok s databází, migrace a nasazení nebyly ověřeny.

**Rozhraní manažera — `IMPLEMENTED`, browser ověření `PARTIALLY VERIFIED`:** přehled zobrazuje krátké české výsledky nezávislé kontroly a konkrétní nálezy. U lokálního plánovače i ukázky je zřejmé, že volný text nevyhodnocují; výstup Gemini je označen jako tvrzení AI, které není nezávisle ověřené. Ruční editace návrhu a volba ukázkového scénáře byly odstraněny; jedno výslovné tlačítko potvrzení zůstává a samo potvrzení neprovádí. Ukázkové seznamy a interní názvy režimů byly odstraněny z přehledu; nastavení uvádí srozumitelný stav, pokud uložení není dostupné. Cílené testy, lint, typová kontrola, Prisma validace a build prošly. Prohlížeč ověřil rozměry 390×844 a 1280×900 px a klávesnicový přístup k odkazu přeskočení. Plný průchod s uloženými daty a formulářovým tokem nebyl proveden, protože lokální databáze nebyla dostupná.
