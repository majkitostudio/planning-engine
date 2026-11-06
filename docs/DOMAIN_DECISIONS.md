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
Poslední aktualizace: 6. 11. 2026
Vyplnil: uživatel / zadání projektu (částečně)

## Projekt a provoz (`VERIFIED`, 6. 11. 2026)

Tato rozhodnutí mění dřívější předpoklady a platí pro další práci:

- **Projekt je nekomerční** — studentský/ukázkový projekt pro jednoho manažera,
  ne oficiální zakázka. Neočekává se platba za něj.
- **Rozpočet je 0 Kč.** Hosting i AI se volí podle nejnižších možných nákladů.
- **Cílová databáze je jediná stávající Neon databáze na bezplatném tarifu.**
  Další databáze, izolované ani vývojové se nezakládají.
- **Cílový hosting je Vercel Hobby** (zdarma, nekomerční použití). Vercel Pro
  by se použil jen při změně na komerční projekt.
- **Měsíční AI plánovač je Cloudflare Workers AI** s modelem s nulovým
  uchováváním a bez trénování na zákaznickém obsahu. Bezplatný limit je
  10 000 neuronů denně.
- **Externí AI smí dostávat skutečná jména, směny i volný text.** Dřívější
  omezení „neposílat skutečná jména“ bylo nedorozumění; projekt s externí AI
  počítal od začátku.
- **Pilot je pouze pro plné úvazky.** Poloviční úvazky zůstávají implementované,
  ale mimo pilot.
- **Týden pro víkendové volno je pondělí–nedělí.**
- **Online MVP** znamená funkční web s přihlášením, který vytváří rozpis.
  Vydání je odloženo, dokud nebude AI plánovač připravený a ověřený.
- **Smyšlená demo data** mohou být vložena do jediné databáze, musí být označená
  a po ověření je lze odstranit.

## Rozepsané měsíční zadání (`VERIFIED`, 5. 11. 2026)

Manažer zvolil automatické ukládání rozepsaného zadání na zařízení, aby je
mohl po obnovení stránky nebo návratu znovu načíst.

## Rozhodnutí manažera: měsíční MVP a vizuální návrh (31. 10. 2026)

- Hlavním cílem je jeden návrh pro celý kalendářní měsíc; týden je pohled do něj.
  Schválený záměr počítá s AI a volnými textovými pokyny, které samy nejsou
  deterministicky ověřovaným tvrdým pravidlem.
- Návrh se kontroluje jako celek včetně návazností mezi týdny a přes hranice
  měsíců; chybějící podklady se označí jako neověřené a neúplný plán nelze potvrdit.
- Manažer zadává období, zaměstnance, absence, dostupnost, obsazení a pokyny.
  Platí potvrzené časy směn v `AGENTS.md`.
- Hlavní obrazovka je „Rozpis směn“, ostatní položky jsou ve skupině „Budoucí
  funkce“. Schválený vizuální podklad je [`mvp-final.png`](design/mvp-final.png),
  podrobnosti jsou v [`docs/ROADMAP.md`](ROADMAP.md) a [`docs/DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md).
  Schválený návrh sám o sobě nedokládá implementaci ani ověření.

## Výchozí dostupnost měsíčního plánování (`VERIFIED`, 3. 11. 2026)

Při zadávání měsíčního návrhu jsou vybraní zaměstnanci výchozím nastavením
dostupní na obě směny každý den, včetně víkendů. Výslovná nedostupnost a
schválená absence mají přednost. Dostupnost sama neurčuje přidělení směny ani
nenahrazuje kontrolu ostatních pravidel.

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

### Historický rozpor v podkladech

Email uvádí víkendovou ranní směnu 7:45–18:00 a odpolední 10:45–21:00.
Pozdější rozhodnutí pro měsíční MVP z 31. 10. 2026 potvrzuje pro tento projekt
7:45–16:30 a 12:45–21:00. Dřívější email zůstává historickým podkladem;
neprokazuje aktuální časy používané mimo tento projekt.

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
- **Manažer návrh potvrzuje.** Aplikace může uložit nepotvrzený návrh, ale bez
  potvrzení jej nesmí aplikovat jako potvrzený rozpis.
- **Původní první funkční verze:** jeden týden, zaměstnanci na plný úvazek;
  rozsah pilotu byl později změněn na celý měsíc, viz rozhodnutí výše.
- **Potvrzené časy směn:** ranní 7:45–16:30 (i víkend), odpolední ve všední den
  13:15–21:00, víkendová odpolední 12:45–21:00. Víkendový začátek 12:45 je
  záměrný kvůli půlhodinové obědové přestávce.
- **Po šesti po sobě jdoucích pracovních dnech:** alespoň 35 h nepřetržitého
  odpočinku.
- **Práce o víkendu:** dva dny volna během téhož týdne.
- **Obsazení směn:** konfigurovatelný vstup, ne historická konstanta.
- **Countdown CRM:** budoucí architektonický směr, nyní žádná integrace.

## Pracovní fond zaměstnanců (`VERIFIED` rozhodnutí a parametry, `IMPLEMENTED`, 5. 11. 2026)

Uživatel potvrdil, že aplikace má hlídat fond práce každého zaměstnance.
Parametry byly doplněny takto:

- Fond se zadává v hodinách za celý kalendářní měsíc, pro každého zaměstnance
  zvlášť. Aplikace výchozí výši nedopočítává ani nedosazuje.
- Manažer zadává také hodiny, které se mají do fondu započítat jako omluvené
  (například schválená absence nebo svátek). Aplikace je sama neodvozuje.
- Plánovaná pracovní doba se počítá z potvrzených časů směn a z přiřazení
  v daném měsíci; přestávky zůstávají mimo výpočet (OQ24).
- Nedostatečné i nadměrné naplnění se zobrazí jako samostatný nález. Je to
  nezávazné upozornění a neblokuje potvrzení.
- Chybějící fond se označí jako neověřený, nikoli jako splněný; ani tento nález
  sám neblokuje potvrzení.
- **Měsíční pilot je pouze pro plné úvazky** (`VERIFIED`, 6. 11. 2026).
  Poloviční úvazky jsou v kódu implementované, ale do pilotu nepatří. Směny
  plného úvazku jsou uvedeny níže v rozhodnutích manažera z 5. 11. 2026.
- Technický strop 1000 hodin na vstup je pouze ochrana proti zjevně chybnému
  zadání, nikoli doménové pravidlo ani pracovněprávní limit.
- Fond je ve formuláři volitelná (rozbalovací) část. Zcela prázdný řádek
  znamená „nevyplněno“ a návrh lze vytvořit i bez fondu; kontrola pak uvede,
  že naplnění fondu nelze ověřit. Pokud manažer u zaměstnance vyplní alespoň
  jednu hodnotu, musí doplnit fond i omluvené hodiny, jinak formulář vytvoření
  návrhu neumožní. Chybějící údaj zůstává možný u starších nebo přímých vstupů
  a validace jej označí jako neověřený.

`IMPLEMENTED` (5. 11. 2026): volitelný vstup `workFunds` v měsíčním zadání,
deterministická kontrola `workFundFindings` (`WORK_FUND_MISSING`,
`WORK_FUND_UNDER`, `WORK_FUND_OVER`), pole ve formuláři a v lokálním uložení,
přenos anonymizovaných fondů do lokálního solveru a jeho měkký cíl. Měkké
vážení v solveru (jedna minuta odchylky odpovídá jednomu opakování směny) je
volba implementace, nikoli potvrzené doménové pravidlo; tvrdé pokrytí a
potvrzená pravidla mají přednost. Ověření a přesné výsledky jsou v
[`ROADMAP.md`](ROADMAP.md).

`IMPLEMENTED` (6. 11. 2026): fond práce je ve formuláři volitelná rozbalovací
část. Zcela prázdné řádky se do měsíčního zadání nepřenášejí, takže návrh lze
vytvořit bez fondu; částečně vyplněný řádek (jen jedna z hodnot) vytvoření
návrhu zablokuje s vysvětlením. Souhrn ukazuje počet vyplněných fondů a
upozorňuje, že zbytek zůstane neověřený. Chování je pokryté testy
`lib/planning/monthly-form.test.ts`; typecheck, lint, testy a build prošly.

## Rozhodnutí manažera — druhé kolo (5. 11. 2026)

- **Částečné úvazky (poloviční):** `IMPLEMENTED`, ale **mimo pilot**
  (`VERIFIED` rozhodnutí, 6. 11. 2026). Pilot používá pouze plné úvazky.
  Implementované časy pro budoucí rozšíření:
  - Plný úvazek: ranní 7:45–16:30 (všední den i víkend), odpolední ve
    všední den 13:15–21:00, víkendová odpolední 12:45–21:00.
  - Poloviční úvazek: ranní 7:45–15:00 (pouze všední den), odpolední
    15:00–21:00 (pouze všední den). `VERIFIED` doplnění manažera:
    poloviční úvazek smí pracovat o víkendu, ale pouze v plné délce
    víkendové směny (7:45–16:30, 12:45–21:00).
  Fond práce se zadává v hodinách pro každého zaměstnance zvlášť.
- **Role a dovednosti (H4):** `VERIFIED` — ne, všichni zaměstnanci mohou
  obsadit libovolnou směnu. Role se neevidují.
- **Maximální počet hodin nebo směn (H5):** `VERIFIED` — žádný tvrdý limit.
  Fond práce zůstává nezávazným cílem (H13).
- **Zamykání přiřazení (H7):** `VERIFIED` — ne, manažer nemůže přiřazení
  zamknout; solver může přepsat cokoli.
- **Měkké preference (S1–S5):** `VERIFIED` — žádné další preference se do
  pilotu nepřidávají. Zůstává pouze S6 (střídání ranní/odpolední).
- **Další pravidla mimo seznam (svátky, jazyky, kontinuita):** `VERIFIED` —
  žádná další pravidla. Kalendář svátků se nezavádí.
- **Notifikace v UI:** `VERIFIED` — ponechat lokální `Alert`; globální toast
  se nezavádí.
- **Analytika:** `VERIFIED` — read-only přehled z potvrzených rozpisů
  (pokrytí, vytížení, neobsazené směny); bez exportu.
- **Solver timeout:** `VERIFIED` — výchozí 120 s, konfigurovatelné přes env
  `PLANNING_SOLVER_TIMEOUT_MS`.
- **Přihlášení přes Outlook/Entra:** pro MVP není potřeba; lokální databázové
  účty zůstávají dostatečné. Azure tenant tedy neblokuje MVP.
- **Aktivní databáze:** manažer výslovně povolil používat aktuálně
  nakonfigurovanou databázi i pro testovací/pilotní a produkční data a povolil
  migrace (5. 11. 2026). Toto povolení umožňuje zápis a migrace, ale samo o sobě
  neověřuje zálohování, monitoring, obnovu ani připravenost aplikace k nasazení;
  tyto provozní aspekty zůstávají `NOT VERIFIED`.

## Současná implementace měsíčního MVP (`IMPLEMENTED`, 3. 11. 2026)

Níže uvedené popisuje implementaci, nikoli doloženou změnu schváleného záměru
AI jako hlavní plánovací logiky. Rozdíl mezi zadáním a implementací zůstává
otevřený k rozhodnutí uživatele.

- Lokální OR-Tools sestavuje přiřazení směn pro celý kalendářní měsíc.
- Měsíční AI návrh zajišťuje Cloudflare Workers AI (`IMPLEMENTED` adaptér,
  reálné volání `NOT VERIFIED`). Externí AI je `VERIFIED` rozhodnutím
  uživatele (6. 11. 2026) povolená včetně skutečných jmen a volného textu;
  používá se model s nulovým uchováváním a bez trénování na zákaznickém obsahu.
- Nezávislá deterministická validace kontroluje celý návrh včetně dostupných
  návazností. Chybějící hranice, neúplný návrh ani výsledek solveru samy o sobě
  nejsou ověření ani potvrzení.
- Doplňující textové pokyny nejsou tvrdé pravidlo; v režimu OR-Tools se
  nevyhodnocují a výsledek to musí přiznat. AI je může zohlednit, ale jejich
  splnění nezávislá kontrola neověří.

## Potvrzený směr operativních náhrad (`VERIFIED`, 29. 10. 2026)

Tato rozhodnutí určují rozsah přípravy dalšího implementačního řezu. Neuzavírají
dosud neznámé pracovní limity ani preference.

- Náhrada začíná nad posledním potvrzeným plánem a po potvrzení vytváří novou
  verzi celého týdne.
- První řez řeší jednu celou směnu. Dílčí nástup uprostřed směny je mimo
  rozsah.
- AI smí navrhnout změny dalších celých přiřazení v týdnu, ale každá změna
  musí být viditelná v dopadu varianty.
- Výpadek je samostatný incident na konkrétní směně. Před potvrzením se
  neukládá jako změna rozpisu; při opuštění procesu zůstává původní rozpis.
- AI má dodat tři odlišné varianty, pokud jsou dostupné. Každá varianta musí
  mít konkrétního kandidáta a celý výsledný návrh. Nedostatek variant se přizná.
- Dopad každé varianty se dopočítává deterministicky; po výběru se varianta
  znovu validuje před potvrzením.
- Minimální obsazení je konfigurovatelné podle konkrétního dne a směny.
  Dosavadní výchozí profil pilotu 15/7 je nahrazen novými potvrzenými hodnotami
  managera z 30. 10. 2026; viz níže.
- Délka směny je pevně daná existující definicí směny. Operativní náhrada nesmí
  směnu prodlužovat, zkracovat ani dělit na části.
- Přesčasy se v tomto provozu nepoužívají. Varianta, která by vyžadovala práci
  mimo pevně definovanou směnu, není platná náhrada.
- Pořadí cíle operativní náhrady je: zachovat minimální obsazení, neporušit
  ověřená tvrdá pravidla, změnit co nejméně dalších lidí a pokud změna volna
  vytvoří další povinnost odpočinku, navrhnout i její náhradu. Když bez řetězové
  změny nelze směnu pokrýt, AI musí řetěz zobrazit celý; manager vybírá variantu.
- Při běžném plánování je schválená dovolená nebo jiné potvrzené volno
  blokátorem. Pro operativní náhradu platí užší manažerská výjimka popsaná
  v odpovědích z 30. 10. 2026 níže; datum náhradního volna se nesmí domýšlet.
- První řez operativních náhrad používá syntetická data a simulovaný provider.
  AI návrhy náhrad zatím nejsou zapojené.
- Základní audit prvního řezu obsahuje potvrzenou změnu, původní a nový rozpis,
  incident, vybranou variantu, výchozí verzi a identitu managera.
- Limity se budou připravovat jako konfigurovatelný profil, nikoli jako
  univerzální čísla v kódu. První profil vychází z ověřeného znění zákoníku
  práce a z interních pravidel, která manager výslovně potvrdí. Dokud není
  profil doplněný a právně zkontrolovaný pro konkrétní provoz, zůstává jeho
  vyhodnocení `NOT VERIFIED`.

### Právní baseline pro konfigurovatelný profil (`SOURCE EVIDENCE`, 29. 10. 2026)

Průzkum aktuálního znění zákoníku práce poskytl tento orientační rámec pro
další nastavení. Nejde o právní posudek ani o automaticky schválená pravidla
Planning Enginu:

- **§ 79:** stanovená týdenní pracovní doba je zpravidla 40 hodin; kratší
  pracovní doba se sjednává písemně. To je důležité pro budoucí podporu
  částečných úvazků, ale první řez je zatím neřeší.
- **§ 83:** délka směny nesmí přesáhnout 12 hodin.
- **§ 84:** písemný rozvrh nebo jeho změna se zaměstnanci standardně oznamuje
  nejpozději 2 týdny předem, pokud se nedohodne jiná lhůta.
- **§ 88:** po nejvýše 6 hodinách nepřetržité práce náleží nejméně 30 minut
  přestávky; běžná přestávka se nezapočítává do pracovní doby.
- **§ 90:** běžný nepřetržitý denní odpočinek dospělého zaměstnance je nejméně
  11 hodin během 24 hodin; výjimky mají vlastní podmínky a nesmějí se
  automaticky předpokládat pro call centrum.
- **§ 92:** týdenní odpočinek dospělého zaměstnance vychází nejméně na 35 hodin
  jako 24 hodin spolu s navazujícím denním odpočinkem; zákon zná výjimky pro
  zvláštní režimy.
- **§ 93:** přesčas je pouze výjimečný; nařízený přesčas má limity 8 hodin v
  jednotlivém týdnu a 150 hodin v kalendářním roce, přičemž existuje i průměrný
  limit za vyrovnávací období.
- **§ 217:** dobu čerpání dovolené určuje zaměstnavatel s přihlédnutím k
  oprávněným zájmům zaměstnance; změna určené dovolené nebo odvolání z ní může
  založit povinnost nahradit zaměstnanci vzniklé náklady.

Zdrojem je aktuální příručka MPSV s úplným zněním zákona č. 262/2006 Sb.,
[část pracovní doba a odpočinek](https://ppropo.mpsv.cz/VIIIPracovnidobaadobaodpocinku),
[úplné znění zákoníku práce](https://ppropo.mpsv.cz/zakon_262_2006) a
[část o dovolené](https://ppropo.mpsv.cz/XDovolena). Před použitím jako
tvrdých pravidel musí konkrétní profil projít právní a interní kontrolou.

Pro tento projekt je interní rozhodnutí přísnější: přesčasy se nepoužívají.
Zákonný rámec pro přesčasy proto není povolením, aby je AI navrhovala; slouží
jen jako zdroj evidence pro budoucí právní kontrolu.

V provozním scénáři se nesmí zaměnit **skutečná dovolená**, **plánovaný den
volna** a **náhradní volno po víkendové práci**. Při běžném plánování každé
evidované volno blokuje přiřazení. Při operativní náhradě může systém navrhnout
záskok během schválené dovolené, ale změnu smí manager potvrdit pouze po
výslovném přijetí tohoto dopadu. Náhradní volno se zaznamená jako návrh bez
data; termín zůstává `OPEN QUESTION` a nesmí se automaticky určit. Kontrola
35hodinového odpočinku zůstává tvrdou podmínkou.

## Odpovědi managera a rozsah MVP (`VERIFIED`, 30. 10. 2026)

Následující odpovědi jsou novým zdrojem pravdy pro projekt. Konkrétní
implementace se musí řídit těmito pravidly; kde odpověď nedodává konkrétní údaj,
otázka zůstává otevřená.

- **Časy směn:** manager zvolil sjednocení úplné tabulky časů pro jednotlivé
  dny a směny. Konkrétní časy v této odpovědi nedodal; rozpor mezi dříve
  potvrzenými časy a časy uvedenými v původním emailu proto zůstává
  `OPEN QUESTION`.
- **Minimální obsazení:** konfigurovatelné podle dne a směny. Potvrzené hodnoty
  jsou pondělí–pátek ráno 23 a odpoledne 8; sobota–neděle ráno 12 a odpoledne
  9. Jde o provozní minimum, nikoli pracovněprávní limit. Hodnoty 15/7 z
  předchozího syntetického pilotu už nejsou zdrojem pravdy.
- **Platnost minima obsazení:** manager potvrdil opakující se týdenní profil.
  Uložená hodnota pro den a směnu platí pro každý odpovídající den v týdnu,
  dokud ji manager nezmění; nejde o nastavení navázané na jeden kalendářní týden.
- **Uložení a chybějící obsazení (`VERIFIED`, 5. 11. 2026):** Výslovným
  uložením celé tabulky manažer schvaluje všechny zobrazené hodnoty včetně
  předvyplněných. Když při operativní náhradě chybí uložený potřebný počet
  pro směnu, aplikace požádá o doplnění; výchozí počet sama nedosadí.
- **Tvrdá pravidla MVP:** platí pouze již potvrzená pravidla. Další limity
  hodin či směn se nesmějí domýšlet.
- **Požadavky zaměstnanců:** o schválení či odmítnutí rozhoduje manager.
  Aplikace požadavek automaticky nevyhodnocuje; ukáže vzniklé mezery při jeho
  přijetí a navrhne jejich pokrytí. Čas odeslání sám neurčuje prioritu.
- **Volno při tvorbě rozpisu:** každé evidované volno blokuje přiřazení.
- **Volno při operativní náhradě:** AI smí navrhnout i člověka s potvrzeným
  volnem. Manager rozhoduje, zda ho kontaktuje a požádá o záskok; aplikace
  zaznamená změnu volna a navrhne jeho náhradu. Takový návrh je zakázán, pokud
  by porušil potvrzených 35 hodin nepřetržitého odpočinku po šesti po sobě
  jdoucích pracovních dnech. Přesný termín a způsob poskytnutí náhradního volna
  zůstává `OPEN QUESTION`; změna se bez potvrzení managera neaplikuje.
- **Preference:** žádné další preference ani váhy se do MVP nepřidávají.
- **Vstupy:** MVP používá ruční zadávání; Outlook a automatický přenos do
  rosteru jsou mimo rozsah.
- **Úpravy plánu:** manager může návrh upravit. Každá potvrzená změna vytvoří
  novou verzi týdne; souběžné změny a širší historie zůstávají otevřené.
- **Audit:** MVP zaznamenává potvrzené změny; odmítnuté a opuštěné varianty
  neeviduje.
- **Role:** manager plánuje i potvrzuje, viewer pouze čte. Oddělené role
  plánovače a schvalovatele nejsou v MVP.
- **Týmy a pobočky:** MVP používá jeden seznam. Budoucí návrh může počítat s
  rozšířením o týmy či pobočky, ale nyní se neimplementují.
- **Částečné úvazky:** mimo MVP, ale s jejich podporou se počítá pro budoucí
  rozšíření. Pravidla jejich plánování zůstávají `OPEN QUESTION`.

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
| OQ10 | Jaké jsou konkrétní limity? | `VERIFIED` pro pilot | další číselné limity jsou mimo pilot; budoucí profil zůstává otevřený |
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
| OQ2 | Statický, nebo průběžně upravovaný plán? | chování kontroly po ručních úpravách | `PARTIALLY ANSWERED` — operativní řez vytváří novou verzi potvrzeného týdne |
| OQ3 | Které entity skutečně potřebujeme? | doménové typy | `PARTIALLY ANSWERED` — minimální kontrakt navržen |
| OQ4 | Které atributy jsou povinné? | doménové typy a formuláře | `PARTIALLY ANSWERED` — kontrakt navržen |
| OQ5 | Pobočka / umístění call centra? | datový model, filtry | `OPEN QUESTION` — první řez předpokládá plochý seznam |
| OQ9 | Která pravidla jsou tvrdá? | první pravidla v jádře | `PARTIALLY ANSWERED` — odpočet 6 dnů a víkend potvrzeny; H4/H5/H7 uzavřeny (5. 11. 2026): H4=ne, H5=žádný tvrdý limit, H7=ne |
| OQ10 | Jaké konkrétní limity? | implementace limitů (H5, H6) | `VERIFIED` pro pilot — žádné další číselné limity; budoucí profil zůstává otevřený |
| OQ11 | Existují pravidla mimo seznam? | rozsah prvního řezu | `VERIFIED` (5. 11. 2026) — žádná další pravidla (svátky, jazyky, kontinuita) |
| OQ15 | Kdo rozhoduje při konfliktu? | tok po nálezu problému | `VERIFIED` — AI navrhne, validace zkontroluje, manažer potvrdí |
| OQ16 | Neúplný plán, nebo chyba? | stav úplnosti plánu | `VERIFIED` — neúplný návrh se přizná a nabídnou se alternativy |
| OQ17 | Pořadí obětování preferencí? | navazuje na OQ12–OQ14 | `VERIFIED` pro pilot — nejprve pokrytí, potom tvrdá pravidla, potom nejmenší dopad; v pilotu existuje pouze S6, žádné váhy se nezavádějí |
| OQ18 | Jaké další role? | později, až s přihlášením | `OPEN QUESTION` |
| OQ19 | Plánovač vs. schvalovatel? | schvalovací tok | `OPEN QUESTION` |
| OQ20 | Potřebujeme audit změn? | historie a odpovědnost | `VERIFIED` pro pilot — audit potvrzených změn; odmítnuté a opuštěné varianty se neevidují |
| OQ21 | Co je „pracovní den“ pro 6 dnů v řadě? | výklad pravidla odpočinku | `VERIFIED` |
| OQ22 | Schválený požadavek vs. přání? | zpracování incidentů a preferencí | `VERIFIED` pro pilot — manager rozhoduje a vidí dopad; náhradní volno zůstává návrhem bez data |
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

**Odpověď:** `PARTIALLY ANSWERED` (29. 10. 2026) — pro operativní náhrady je
potvrzená varianta C v omezeném rozsahu: změna vzniká nad potvrzeným týdnem,
každá potvrzená náhrada vytvoří novou verzi a před potvrzením se znovu ověří.
Historie verzí, souběžné změny a zamykání přiřazení zůstávají otevřené.

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
| Zaměstnanec | úvazek / hodinový fond | H13 (měsíční fond) | [x] |
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
| Maximum hodin za období | Jaké období se posuzuje a kolik hodin? Platí stejně pro všechny, nebo podle úvazku? | |
| Minimum odpočinku mezi směnami | Kolik hodin mezi koncem a začátkem další směny? | |
| Maximum směn v řadě | Kolik dní v kuse nejvýš? | |
| Maximum směn za měsíc | Kolik směn nejvýš? | |
| Jiný limit | Co dalšího se nesmí překročit? | |

**Návrh k diskusi (`PROPOSAL`):** žádný — čísla musí dodat manager.

**Odpověď:** `VERIFIED` pro rozsah pilotu (30. 10. 2026) — manager potvrdil,
že se kromě již stanovených pravidel v pilotu jednoho týdne a plných úvazků
neaktivují další číselné limity. Nezadávají se proto limity maximálních hodin,
minimálního odpočinku mezi směnami ani maximálního počtu směn v řadě či za
období. Tato odpověď neurčuje budoucí profil pro širší rozsah.

Již potvrzená pravidla zůstávají:
- 6 po sobě jdoucích pracovních dnů → alespoň 35 h nepřetržitého odpočinku.
- Práce o víkendu → 2 dny volna v témže týdnu.

Přesčasy jsou pro tento provoz výslovně zakázaný projektový výstup. Další
limity a jejich právní či interní profil zůstávají `OPEN QUESTION` pro případné
rozšíření mimo schválený pilot.

### OQ11 — Existují pravidla mimo uvedený seznam?

**Proč to potřebujeme:** seznam H1–H7 je jen kandidát. Skutečná pravidla mohou
být jinde (např. víkendy, svátky, jazykové dovednosti, kontinuita týmu).

Pro každé další pravidlo prosím: **co** se nesmí / má, **kdy** to platí a zda je
**tvrdé**, nebo **měkké**.

**Návrh k diskusi (`PROPOSAL`):** žádný — pravidla musí vyjmenovat manager.

**Odpověď:** `PARTIALLY ANSWERED` (29. 10. 2026) — pro první operativní řez
nepřidáváme další tvrdá pravidla nad potvrzený základ a minimum obsazení
nastavované podle dne a směny. Další pravidla (např. svátky, jazyky,
role/dovednosti nebo kontinuita týmu) zůstávají `OPEN QUESTION`, dokud je
manager výslovně nepotvrdí. Přesčasy zůstávají zakázaným výstupem projektu;
nejde o další optimalizační limit.

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

**Odpověď:** `VERIFIED` pro pilot — pořadí je „nejprve pokrytí, potom tvrdá pravidla, potom nejmenší dopad". V pilotu existuje pouze preference S6 (střídání ranní/odpolední) jako nezávazné přání, žádné další preference ani váhy se nezavádějí, takže pořadí obětování se v tomto rozsahu neuplatňuje.

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

**Odpověď:** `VERIFIED` pro pilot (30. 10. 2026) — audit zaznamenává
potvrzenou změnu, původní a nový rozpis, incident, vybranou variantu, výchozí
verzi a identitu managera. Odmítnuté a opuštěné varianty se neevidují. Rozšířený
audit mimo tento rozsah zůstává `OPEN QUESTION`.

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

**Odpověď:** `PARTIALLY ANSWERED` (30. 10. 2026). Manager rozhoduje ručně,
zda požadavek schválit nebo odmítnout; čas odeslání neurčuje prioritu a aplikace
nemá požadavek automaticky vyhodnotit. Při schválení musí ukázat dopad na
obsazení a navrhnout pokrytí. Přijetí požadavku samo nepotvrzuje ani neaplikuje
změnu rozpisu.

Pro běžné plánování zůstává schválená absence blokátorem. Při operativní náhradě
může AI navrhnout zaměstnance se schválenou dovolenou; manager musí její změnu
výslovně přijmout. Návrh nesmí porušit 35hodinový odpočinek po šesti po sobě
jdoucích pracovních dnech. Zásah a návrh náhradního volna se zaznamenají, ale
datum náhradního volna zůstává `OPEN QUESTION` a nesmí se domyslet ani přidělit
automaticky. Samostatné zamítnuté a opuštěné varianty se podle rozhodnutí
managera neevidují.

### OQ23 — Může manažer potvrdit částečně neúplný návrh?

**Proč to potřebujeme:** návrh může mít méně lidí, než je potřeba. Systém to
musí přiznat. Není ale potvrzené, zda takový návrh smí manažer uložit jako
platný stav, nebo musí nejdřív doplnit obsazení.

**Odpověď:** `VERIFIED` (28. 10. 2026) — částečný návrh se smí zobrazit a
projednávat, ale manažer jej nesmí potvrdit. `ConfirmedPlan` vzniká pouze u
kompletního návrhu, který je `ready_for_review`.

### OQ24 — Jak se započítávají přestávky?

**Proč to potřebujeme:** víkendová odpolední směna začíná ve 12:45 záměrně,
aby se do pevného času 12:45–21:00 vešla půlhodinová obědová přestávka. Nejde
o přesčas ani o operativní prodloužení směny. Čistá nebo placená odpracovaná
doba se ale v prvním řezu samostatně nepočítá.

**Odpověď:** `VERIFIED` (29. 10. 2026) — validace v první verzi používá hrubý
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
