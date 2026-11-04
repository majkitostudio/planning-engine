# Aktuální stav a další kroky — Plánovací Engine

> Stav aktualizován 4. 11. 2026 při postupném sjednocování větví. Historické
> testy níže jsou výslovně označeny; aktuální kontroly jsou v závěru dokumentu.
> Význam stavových popisků
> vysvětluje [`docs/README.md`](README.md#stavové-popisky).

## Stručný přehled auditu

Zjištění kontroly ze 4. 11. 2026; podrobnosti a hranice jednotlivých ověření jsou v části
[Další kontrola a postup](#další-kontrola-a-postup-před-uzavřením-mvp).
Opravené nálezy i otevřené kroky jsou označené samostatně. Před širším použitím je potřeba zejména:

| Priorita | Zjištění a další krok |
| --- | --- |
| Vysoká | OPRAVENO — zápis přes starší API vyžaduje managera a chrání uložený záznam; souběžné potvrzení atomicky uloží právě jeden plán a auditní událost. |
| Vysoká | OPRAVENO — starší relace se po resetu, změně hesla, změně role i deaktivaci odmítají podle verze relace; ověřeno také proti izolované PostgreSQL. |
| Vysoká | Formulář může označit výchozí obsazení za uložený profil i při prázdné databázi. Rozlišit skutečný zdroj hodnot a jejich potvrzení manažerem. |
| Další | Opravit zjištěné chyby přístupnosti, neexistující návrh, časovou změnu a nesoulad limitu 200 zaměstnanců; ověřit výkon na reprezentativních syntetických zadáních. |
| Dokončení MVP | Rozhodnout o pravidlech mazání a implementovat správu jednotlivých rozpisů; doplnit Python a izolované databázové testy do CI a dokončit kontrolu uživatelského toku. |

Všechny nalezené commitované větve jsou zahrnuté v `main`. Zachované zálohy,
nesledované výstupy a starý pracovní strom s necommitovaným souborem nejsou
automaticky převzaté ani odstraněné. Postup prací je v
[doporučeném pořadí](#doporučené-pořadí-dokončení-před-závěrečným-testováním).

## Stav měsíčního MVP

Schváleným směrem je jeden návrh pro celý kalendářní měsíc; týdenní tabulka je
jeho pohled. Lokální OR-Tools plánovač vytváří přiřazení a aplikace je
nezávisle kontroluje. Manažer může zvolit i souvislý úsek měsíce s pevnými
podklady pro zbytek. Ruční úprava návrhu byla z manažerské obrazovky odstraněna;
serverové rozhraní pro opětovnou kontrolu zůstává. Potvrzení vyžaduje
samostatnou akci manažera.

Schváleným záměrem je AI jako hlavní plánovací logika. Současná implementace
s lokálním OR-Tools a bez vyhodnocení textových pokynů se od něj liší; její
existence sama nedokládá schválení změny záměru. Viz `DOMAIN_DECISIONS.md`.

| Oblast | Aktuální stav |
| --- | --- |
| Měsíční formulář, lokální OR-Tools provider a uložení návrhu | `IMPLEMENTED`; syntetický integrační průchod `VERIFIED` |
| Nezávislá měsíční validace | `IMPLEMENTED`; v testovacím měsíci zůstala část pravidel `NOT VERIFIED` kvůli chybějícím návaznostem a otevřenému výkladu víkendového volna |
| Ruční změna směn a nová kontrola | Serverové rozhraní `IMPLEMENTED`; ruční úprava z manažerské obrazovky odstraněna |
| Obnovení uložené verze po načtení stránky | `IMPLEMENTED`; obnovení syntetického prázdného návrhu v tomto auditu `VERIFIED`, další varianty `NOT VERIFIED` |
| Potvrzení rozpisu | `IMPLEMENTED`; neúplné a neověřené návrhy mají být blokovány. Níže uvedený historický návrh potvrzen nebyl. |
| Textové pokyny v režimu OR-Tools | Nevyhodnocují se; UI tuto skutečnost přiznává. Pokyny se solveru ani externí AI neposílají. |
| Gemini provider | Zůstává dostupný pro ostatní nakonfigurované toky; není hlavním plánovačem měsíčního MVP. Kvalita produkčního plánování zůstává `NOT VERIFIED`. |
| Produkční autentizace, databáze a provoz | `NOT VERIFIED`; mimo tento lokální průchod |

### Historický syntetický průchod (3. 11. 2026)

Test použil listopad 2026, 29 syntetických záznamů a obsazení 15 ranních / 7
odpoledních míst ve všední dny. Víkendové hodnoty 7 / 3 byly pouze dočasným
testovacím předpokladem, nikoli schváleným provozním pravidlem.

- Lokální plánovač vytvořil návrh s 552 přiřazeními. Nezávislá validace
  nezjistila chyby obsazení, ale označila výsledek jako `not_verified` kvůli
  chybějícím návazným podkladům a nevyřešenému výkladu dvou víkendových dnů
  volna.
- Odebrání jedné směny vytvořilo novou verzi s 551 přiřazeními. Kontrola
  označila konkrétní nedostatečně obsazenou směnu a blokovala potvrzení.
- Po opětovném přidání směny se uložila další verze s 552 přiřazeními. Po
  obnovení stránky se tato verze načetla a znovu zkontrolovala.
- Izolovaná databáze obsahovala tři nepotvrzené verze; žádná neměla čas
  potvrzení. Testovací data se nepřenášela k externí AI.

### Historické automatické kontroly (3. 11. 2026)

| Kontrola | Výsledek |
| --- | --- |
| `npm run test` s aktivním lokálním OR-Tools prostředím | 59 testovacích souborů prošlo, 2 přeskočeny; 382 testů prošlo, 3 přeskočeny |
| `npm run lint` | prošel |
| `npm run typecheck` | prošel |
| `npm run build` | prošel |
| `npm run db:validate` | prošel |
| Python testy plánovače | 10 testů prošlo |

## Známá omezení a další rozhodnutí

### Správa rozpisů

- `PLANNED` — Přidat správu vytvořených rozpisů s možností jednotlivě
  vybraný rozpis smazat. Funkci zahrnout do finalizace před závěrečným
  testováním MVP.
- `OPEN QUESTION` — Před implementací určit pravidla pro mazání potvrzených
  rozpisů, zachování historie a auditu a dopad na návazné plánování.

### Rozhraní manažera — `IMPLEMENTED`, ověřeno částečně

- Výsledek návrhu používá srozumitelné stavy a konkrétní nálezy; zobrazuje,
  zda plánovač pokyny vyhodnotil. U AI je její popis označen jako neověřené tvrzení.
- Ruční úpravy návrhu a volba ukázkového scénáře jsou z manažerské obrazovky
  odstraněny. Zůstává jedno výslovné tlačítko manažerského potvrzení; serverové
  blokátory i zákaz automatického potvrzení zůstávají.
- Ukázkové přehledy jsou odstraněny, tlačítka zaměstnanců mají čitelný styl a
  přehled i nastavení neukazují technické názvy režimů či interních proměnných.
- Prohlížečově ověřeno při 390×844 a 1280×900 px; odkaz přeskočení i náhled
  syntetického rosteru lze ovládat klávesnicí. Bez databáze nebyl proveden zápis
  ani načtení uložených dat; tento provozní tok zůstává `NOT VERIFIED`.

- Neověřené návaznosti na začátku nebo konci měsíce brání potvrzení návrhu.
  Dva dny volna při víkendové práci nemusí následovat po sobě; viz
  `docs/DOMAIN_SPECIFICATION.md`.
- Výsledek `infeasible` platí jen pro konkrétní vstupy a pravidla zahrnutá v
  modelu. Timeout ani `unknown` nejsou důkazem, že je zaměstnanců málo.
- Měsíční režim OR-Tools nevyhodnocuje volný text. Skutečná jména, interní ID
  ani textové pokyny nejsou do procesu solveru posílány.
- Testovací hodnoty obsazení nejsou schválený provozní profil. Pro provoz je
  třeba zadat schválená data a vyřešit otevřené doménové otázky.
- Tento průchod neověřuje kvalitu Gemini, pracovní právo, produkční zabezpečení,
  produkční databázi ani připravenost aplikace k nasazení.

### Kontrola po sjednocení hlavní složky (3. 11. 2026)

- Hlavní `main` byl posunut na měsíční větev; předchozí rozpracované změny jsou
  uchovány v pojmenované záloze Git stash. Nesledované vizuální výstupy zůstaly.
- Lint, typecheck, build a validace Prisma schématu prošly. Testy s lokálním
  Pythonem: 382 prošlých, 3 přeskočené; samostatné Python testy: 10 prošlých.
- Syntetický browser průchod v paměťovém režimu vytvořil 552 přiřazení, po
  odebrání směny ukázal podobsazení a blokaci potvrzení; opravená verze se po
  obnovení načetla. Při tomto průchodu nebyla ověřována databáze ani Neon.
- Pro další praktický test je třeba samostatně ověřit cílové prostředí, vstupy,
  návazné rozpisy a nevyřešené doménové otázky; produkční připravenost se tímto
  průchodem neprokázala.

### Průběžná inventura větví a kontrol (4. 11. 2026)

- `main` i `origin/main` obsahují větev `codex/navaznost-ai-plan` až po
  `c7218af`: preferenci střídání, návaznost rozpisů, doplánování úseku,
  zjednodušení obrazovky a ochranu měsíčních dat před externím Gemini.
  Překladač pokynů je pouze oddělený základ, není zapojený do aplikace.
- `VERIFIED` — Na `main` s commitem `6163d63` prošly lint, typecheck, build,
  validace Prisma schématu, 391 testů Vitest a 16 testů Python plánovače;
  tři testy Vitest byly přeskočeny.
- `VERIFIED` — Na `d2f8ed1` prošly lint, typecheck, build a 482 testů Vitest;
  tři testy byly přeskočeny. Předchozí verze `a95ff90` navíc prošla validací
  Prisma schématu a 21 samostatnými Python testy. Další commity do `c7218af`
  mění pouze dokumentaci.
- Jeden starší pracovní strom obsahuje necommitnuté změny; zálohy Git stash a
  nesledované výstupy v hlavní složce zůstávají zachovány. Čtyři stromy,
  které Windows Git označuje jako nedostupné, jsou přístupné z Ubuntu a jejich
  pracovní stromy byly při kontrole čisté; jejich commity jsou zahrnuté v `main`.
  Označení Windows Git tedy samo o sobě neprokazuje, že je lze odstranit.
- Při opakované kontrole byl nalezen další pracovní strom `jolly-pixel` v
  odpojeném stavu. Jeho pracovní strom byl čistý a commit `6077301` je již
  předkem `main`; strom zůstává zachován.
- Dvě zachované zálohy obsahují starší změny. První zachycuje průběžný audit,
  jehož body byly přeneseny nebo aktualizovány v této roadmapě; druhá obsahuje
  starší měsíční dokumentaci a podobu formuláře. Současný měsíční směr a
  obrazovka jsou mezitím řešeny novější implementací; zastaralý popis v
  `package.json` byl opraven samostatně. Zálohy nebyly aplikovány ani smazány;
  úplná shoda jejich vizuálních úprav se současným UI nebyla prokázána.
- Nesledovaný `design-qa.md` popisuje historickou vizuální kontrolu
  simulovaného týdenního rozhraní z 1. 11. 2026 a obsahuje závěr „passed“.
  Složka `output/playwright` obsahuje 13 historických PNG podkladů. Tyto
  nesledované soubory byly zachovány; jejich závěr není důkazem aktuálního
  stavu měsíčního rozhraní ani úplné přístupnosti.
- Porovnání stromu `cline/9dbfe`: upravené testovací soubory jsou totožné s
  `main` a změny exportů a importu již `main` obsahuje. Nesledovaný starší
  `ai-provider.ts` se od současného liší; jeho převzetí by odstranilo novější
  rozhraní náhrad. Navíc starší verze odmítá prázdné ID alternativy, současná
  strukturální kontrola dovoluje libovolný řetězec. `OPEN QUESTION` — ověřit
  požadavek na neprázdné ID a případně jej ošetřit cíleně s testem; starý
  soubor ani pracovní strom při auditu nemažou ani nepřepisují.
  Syntetické přímé volání `isPlanDraft()` potvrdilo přijetí alternativy s
  prázdným ID. Následný syntetický test na `508c486` potvrdil, že i měsíční
  `isMonthlyPlanDraft()` přijme dvě alternativy se shodným prázdným ID;
  měsíční UI přitom používá ID jako klíč položky. Běžný uživatelský dopad
  ani vznik takového výstupu skutečným plánovačem nebyly ověřeny. Současný
  měsíční OR-Tools i simulovaný provider vytvářejí prázdný seznam alternativ;
  zjištění se tedy jejich nově vytvořených výstupů v této podobě netýká.
  `IMPLEMENTED` / `VERIFIED` — Ze staršího souboru byla cíleně převzata
  kontrola, která odmítá prázdné ID alternativy; doplněný test nejprve selhal
  a po opravě prošel. Týká se i měsíčního kontraktu. U starších uložených
  měsíčních návrhů je prázdné ID při načtení povoleno kvůli kompatibilitě;
  jednotkové testy pokrývají načtení návrhu, potvrzeného měsíce i jeho
  návaznosti. Na `a858a8f` prošel i přímý test na izolované PostgreSQL 16:
  synteticky vložený starší potvrzený záznam šel načíst a vytvoření nového se
  stejným neplatným ID bylo odmítnuto. Nešlo o potvrzení rozpisu přes UI ani
  test návaznosti na databázi. Skutečný výskyt takových záznamů nebyl prověřen.
  Jedinečnost a ID tvořené jen mezerami tato dílčí oprava neřeší. Celý starý soubor ani
  pracovní strom nebyly přepsány.
- Hlavní README a rozcestník dokumentace byly sladěny s odstraněním ručních
  úprav z manažerské obrazovky; další historické souhrny vyžadují kontrolu.
- GitHub CI v aktuálním workflow samostatně nespouští Python testy solveru ani
  databázové integrační testy. Jejich pokrytí a bezpečné testovací prostředí
  je potřeba doplnit před závěrečným ověřením MVP.

### Další kontrola a postup před uzavřením MVP

- `VERIFIED` / oprava nutná — Syntetický vstup s 201 zaměstnanci prošel
  `validateMonthlyInput()`, ale lokální solver má maximum 200 zaměstnanců a
  běh skončil kódem `solver_invalid_output`. Sjednotit limit vstupní kontroly
  a plánovače a sdělit překročení limitu před spuštěním; bez zátěžového testu
  nelze z tohoto limitu vyvozovat provozní kapacitu pro 200 zaměstnanců.
- `VERIFIED` / omezený výkonnostní pokus — Přímé volání lokálního solveru pro
  listopad 2026 a 101 syntetických zaměstnanců s testovacím obsazením 15/7 ve
  všední dny a 7/3 o víkendu vrátilo `unknown` po 20,94 s při limitu řešení
  20 s. Předpokládaly se žádné absence ani omezení dostupnosti a prázdná,
  úplná návazná historie; nejde o skutečné podklady. Výsledek nedokazuje
  neřešitelnost ani provozní kapacitu. Ověřit výkon na reprezentativních,
  schválených syntetických scénářích včetně uživatelského toku a nezávislé
  kontroly; tento pokus testoval pouze samotný solver.
- `VERIFIED` / přístupnost — Při šířce prohlížeče 390 × 844 px šlo otevřít
  mobilní menu a přejít na Návaznost směn. Po přechodu se menu vizuálně zavřelo,
  ale stisk `Tab` přesunul fokus na skrytý odkaz Zaměstnanci; fokus nebyl na
  obrazovce viditelný. Zajistit správné vyloučení zavřené navigace z pořadí
  klávesnice a návrat fokusu; ověřit též čtečku obrazovky a další průchody.
  Přihlášení, prázdný formulář a stránka návazností byly vizuálně zkontrolovány;
  databáze byla záměrně nedostupná a jejich datové operace se netestovaly.
- `VERIFIED` / kontrola kódu přístupnosti — V měsíčním formuláři mají tlačítka
  pro odebrání různých zaměstnanců a absencí shodný název „Odebrat“. V náhledu
  návaznosti se opakují ovládací prvky „Stav“, „Od“ a „Do“; datum je vedle nich,
  ale není součástí jejich popisku ani programově přidružené skupiny. Doplnit
  rozlišitelné názvy nebo skupiny s kontextem osoby a dne a ověřit ovládání se
  čtečkou obrazovky. Jde o kontrolu zdrojového kódu, nikoli test se čtečkou.
- `VERIFIED` / klávesnice — V přihlášené lokální aplikaci na `01d7029` s
  izolovanou databází a syntetickým vstupem zůstal po přechodu z absence na
  obsazení stiskem Enter fokus na tlačítku „Pokračovat“. Následný Tab nová
  pole obsazení přeskočil a přešel na ovládání vývojářských nástrojů. Stejný
  vzor byl pozorován při předchozím přechodu myší z prvního kroku. Přesunout
  fokus po změně kroku na jeho nadpis nebo první vhodný prvek a ověřit pořadí
  v běžném sestavení i se čtečkou; pokus běžel ve vývojovém režimu.
- `VERIFIED` / přepínání měsíců a přístupnost — Ve vývojové aplikaci na
  `5f3fe9f` zůstal po přepnutí z listopadu na prosinec a zpět zachovaný
  rozpracovaný syntetický zaměstnanec v listopadovém formuláři; prosincový
  formulář byl samostatně prázdný. Při zobrazení prosince však strom
  přístupnosti označil oblast návrhu listopadem a pole pro jméno interním ID
  místo viditelného popisku. Komponenty navštívených měsíců zůstávají v DOM a
  opakují stejná ID nadpisů a polí. Zajistit jedinečná ID pro každý měsíc a
  ověřit je v prohlížeči i se čtečkou; po obnovení stránky tento pokus stav
  formuláře netestoval. Použita byla izolovaná syntetická databáze.
- `VERIFIED` / rozpracované vstupy — V přihlášené vývojové aplikaci na
  `77515ff` byl do formuláře přidán syntetický zaměstnanec. Po obnovení stránky
  se formulář bez upozornění vrátil do prázdného stavu; návrh předtím nebyl
  vytvořen a databázové ukládání bylo záměrně nedostupné. Prověřit upozornění
  na ztrátu rozpracovaných vstupů nebo bezpečné ukládání rozepsané práce;
  případné uchovávání osobních údajů vyžaduje samostatné rozhodnutí. Toto se
  netýká výše ověřené obnovy již vytvořeného návrhu.
- `VERIFIED` / UX oprava — Při odkazu prohlížeče na již neexistující návrh
  server vrátil `404`; stránka nabídla opětovné načtení, po kterém se stejná
  chyba zopakovala. Rozlišit chybějící návrh od dočasné chyby spojení a
  nabídnout bezpečný postup pro pokračování bez automatického mazání dat.
  Ověřeno v izolovaném prohlížeči a prázdné testovací databázi.
- `VERIFIED` / souběh — Při přímém volání databázového úložiště na `6d1b9cc`
  skončilo pět dvojic současných shodných syntetických importů vždy jedním
  uložením a jednou chybou transakce `P2034`; vzniklo pět importů, nikoli deset.
  Služba opakování konfliktu neprovádí a API všechny chyby ukládání převádí na
  obecné `503` (to vyplývá z kódu, API při tomto pokusu voláno nebylo).
  Doplnit bezpečné opakování a srozumitelný stav pro uživatele, ověřit i souběh
  různých verzí a reakci rozhraní. Pokus použil izolovanou PostgreSQL 16.
- `VERIFIED` / starší týdenní potvrzení — Na `275c364` bylo v izolované
  PostgreSQL pětkrát současně potvrzeno totéž syntetické ID přímým voláním
  `PrismaPlanningPersistence.confirmRun()`. V každé dvojici obě volání vrátila
  první potvrzení a vznikly dvě auditní události. Záměrně se použila odlišná
  syntetická přiřazení; tento přímý test neprováděl aplikační validaci ani
  neověřil dopad přes API. Transakce čte stav a poté aktualizuje bez podmínky,
  že záznam dosud není potvrzen. Prověřit také souběh náhrad a zajistit
  atomické jediné potvrzení a jediný auditní zápis.
- `VERIFIED` (omezený rozsah) — Stránky Návaznost směn a Zaměstnanci zobrazily
  prázdný stav; navigace mezi nimi fungovala. Tlačítko Budoucí funkce přijalo
  klávesový fokus. Nejde o úplný test přístupnosti ani mobilního zobrazení.
- `VERIFIED` / oprava nutná — Import přijme vlastní místní čas směny
  `2026-03-29 02:30`, který v Praze při přechodu na letní čas neexistuje.
  Přímý syntetický test převodu jej zpětně zobrazil jako `03:30`. Přesný dopad
  na výsledek kontroly odpočinku nebyl v aplikačním průchodu ověřen. Před
  používáním vlastních časů vyřešit neexistující i nejednoznačné místní časy a
  doplnit testy obou změn času; pevně potvrzené časy směn jsou mimo toto okno.
- `VERIFIED` / vysoká priorita — Starší týdenní a náhradové API dovolilo
  přihlášenému vieweru vytvořit uložený syntetický běh a poté přes zvolený
  identifikátor přepsat jeho obsah návrhem náhrady. V izolované PostgreSQL
  zůstal jeden nepotvrzený záznam, jehož scénář se změnil na náhradu. Routy
  kontrolují přihlášení, nikoli roli pro vytvoření; ukládání používá `upsert`
  podle dodaného identifikátoru. Následný test na `f1661c6` s novou izolovanou
  PostgreSQL potvrdil dopad i na syntetický potvrzený týdenní záznam: volání
  routy s nasimulovanou relací viewer a kolidujícím identifikátorem vrátilo
  `200` a přepsalo scénář a výsledek záznamu, zatímco původní potvrzený plán
  a čas potvrzení zůstaly zachovány. Test používá simulated režim náhrad a
  neprokazuje dopad na samostatnou tabulku měsíčních návrhů. Opravit oprávnění
  a ochranu identit existujících záznamů, potom pokrýt role a kolize integračním
  testem. Samostatný syntetický test načtení návaznosti dále ukázal možný
  dopad změněného seznamu zaměstnanců: pro září 2026 zůstaly dny 5.–7. října
  u zaměstnance bez původního týdenního podkladu neznámé, ale po nahrazení
  vstupu seznamem ze simulované náhrady byla návaznost pro téhož zaměstnance
  označena jako úplná a bez směn. Test sestavil upravené databázové řádky v
  paměti; nešlo o společný průchod útoku až po měsíční potvrzení. Doplnit
  test integrity potvrzeného vstupu i návaznosti a nesprávné podklady prověřit.
  Test `tests/planning-authenticated-flow.test.ts` přitom výslovně očekává,
  že viewer může starý týdenní návrh spustit; to odporuje aktuálnímu rozhodnutí
  v `DOMAIN_DECISIONS.md`, podle něhož viewer pouze čte. Při opravě změnit i
  tento test a zachovat oddělenou kontrolu potvrzení.
- `VERIFIED` — Přihlášený průchod na izolované PostgreSQL se syntetickým
  zaměstnancem a záměrně nulovým testovacím obsazením vytvořil prázdný návrh,
  zobrazil chybějící návaznosti, zablokoval potvrzení a po obnovení stránky
  návrh znovu načetl. V databázi byl jeden návrh a žádný potvrzený rozpis.
  Neověřuje to kvalitu návrhu s reálným obsazením ani celý tok potvrzení.
- `VERIFIED` / oprava nutná — Ve stejném průchodu tabulka uloženého nastavení
  obsazení obsahovala nula záznamů, formulář však předvyplnil výchozí hodnoty
  a označil je za uložený týdenní profil. `getCompleteStaffingSettings()`
  chybějící hodnoty doplňuje výchozími hodnotami, takže současný text může
  vzbudit dojem schváleného nastavení. Zobrazit skutečný zdroj a vyřešit
  potvrzení chybějících hodnot před dalším praktickým použitím.
- `VERIFIED` — Na větvi `c7218af` prošlo všech sedm migrací na nově vytvořené
  izolované PostgreSQL 16. Testy včetně databázových a lokálního plánovače:
  484 úspěšných, jeden přeskočený integrační test Gemini. Databáze obsahovala
  pouze syntetické testovací záznamy a testovací kontejner byl ukončen.
  Stejná kontrola byla 4. 11. zopakována na sjednoceném `main` (`5cd5d80`)
  se stejným výsledkem; testovací databáze byla opět izolovaná.
- `VERIFIED` / vymezený souběh — Na `2974130` prošly znovu všechny migrace a
  oba testy `monthly-prisma.integration.test.ts` v nové izolované PostgreSQL
  16. Dva současně potvrzované syntetické návrhy téhož měsíce skončily jedním
  potvrzením, jedním konfliktem a jedinou auditní událostí; opakované potvrzení
  vítěze bylo idempotentní. Test dále odmítl viewer a zastaralou manažerskou
  roli změněnou v databázi. Používá přímé volání úložiště a prázdné testovací
  směny; nedokazuje všechny souběhy ani kompletní průchod přes prohlížeč.
  Samostatný historický průchod s obsazeným návrhem a potvrzením popisuje
  `DOMAIN_SPECIFICATION.md`; při tomto auditu nebyl zopakován.
- `VERIFIED` / cílené plánovací testy — Na `bc2a1d6` prošlo 54 testů měsíční
  a týdenní validace a načítání návazností a 21 Python testů solveru. Mezi
  pokrytými příklady jsou 35hodinový odpočinek, směny přes hranici měsíce a
  chybějící historie. Nejde o důkaz správnosti všech kombinací pravidel ani
  o pracovněprávní posudek.
- `VERIFIED` / vstupy absencí — Na `bbbfbe6` prošlo 22 cílených testů
  měsíčního formuláře a vstupního kontraktu. Testované scénáře zahrnují
  částečnou absenci přes hranici měsíce, překryvy a přednost schválené absence
  před dostupností. Kód solveru vylučuje schválenou absenci a výslovnou
  nedostupnost; nezávislá kontrola při chybějící dostupnosti vrací neověřený
  nález. Přímý syntetický běh solveru se dvěma zaměstnanci a schválenou absencí
  přes hranici měsíce přiřadil požadovanou směnu druhému zaměstnanci. Tyto
  kontroly samy neověřují celý průchod rozhraním ani všechny kombinace.
- `VERIFIED` / částečný měsíc v jednotkových testech — Na `b9e069b` prošlo
  24 testů měsíční orchestrace, úložiště a endpointu spuštění. Pokrývají
  mimo jiné nové načtení rosteru a blokaci potvrzení při změně podkladů.
  Databázové závislosti těchto cílených testů jsou nahrazené mocky; nejde o
  nové ověření souběžné změny rosteru na skutečné databázi.
- `VERIFIED` / GitHub CI — Na `e8ba5cf` prošel běh 41869577350: lint,
  typecheck, Vitest, validace Prisma schématu a build. Workflow samostatně
  nespouští Python testy solveru ani integrační testy s databází.
- `VERIFIED` / GitHub CI — Stejné kontroly prošly také na `21a36b7` v běhu
  41872633722 po poslední změně kódu. Omezení pokrytí Pythonu a databáze trvá.
- `VERIFIED` / historický nález, později opravený — Již vydaná relace po resetu a následné změně
  hesla znovu umožní přístup. Integrační test použil syntetický účet a
  izolovanou PostgreSQL: stejná relace dostala z chráněného API před resetem
  `200`, při vynucené změně `403` a po změně hesla opět `200`. Reset byl
  napodoben přímou změnou testovacího účtu v databázi; změnu hesla provedla
  aplikační služba. Tento stav zachycuje původní audit z 4. 11. 2026; opravu
  a nové ověření shrnuje bod 2 v aktuálním To‑Do níže.
- `IMPLEMENTED` / `OPEN QUESTION` — Měsíční běh odmítá externí Gemini a
  OR-Tools nedostává volné pokyny ani skutečná jména. Text pokynů se však
  ukládá se vstupem návrhu do databáze, i když jej OR-Tools nevyhodnocuje.
  Před praktickým použitím určit přístup, dobu uchování a mazání těchto údajů.
  Překladač pokynů není zapojený; před jeho použitím je nutné samostatně
  schválit ochranu a rozsah předávaného textu.
- `VERIFIED` (omezený lokální test) — Deset po sobě jdoucích chybných pokusů
  o přihlášení syntetickým účtem nevrátilo `429`; následné správné přihlášení
  v lokálním režimu uspělo. Jde o test bez reverzní proxy a nedokazuje stav
  jiného nasazení. V aplikačním kódu autentizace nebyla nalezena samostatná
  ochrana proti opakovaným pokusům; před širším použitím navrhnout a ověřit
  odpovídající omezení, monitoring a ochranu účtů.
- `VERIFIED` — `npm audit --omit=dev` na `main` nahlásil 4. 11. 2026 nula
  známých zranitelností provozních závislostí. Úplný `npm audit` nahlásil
  16 položek střední závažnosti v řetězci vývojových nástrojů, souvisejících
  s `minimatch` (GHSA-g3hv-75wg-m249). Navržená automatická oprava zahrnuje
  zásadní změny verzí; řešení vyžaduje samostatné ověření kompatibility.
- `PLANNED` — Dokončit kontrolu návazností, částečného měsíce, souběhu a migrací
  v cílovém lokálním prostředí. Posoudit necommitnuté změny starého pracovního
  stromu; neslučovat je naslepo ani neodstraňovat zálohy.
- `PLANNED` — Sladit aktuální dokumentaci, doplnit Python a izolované databázové
  kontroly do automatizace a oddělit historické záznamy od aktuálního stavu.
- `PLANNED` — Ověřit manažerský tok v prohlížeči se syntetickými daty včetně
  přístupnosti, návrhu, potvrzení, návazností a opětovného načtení; vyřešit
  správu a jednotlivé mazání rozpisů uvedené výše.
- `OPEN QUESTION` — Uzavřít zbývající pravidla a způsob práce s pokyny AI;
  lokální OR-Tools volný text nevyhodnocuje. Produkční provoz zůstává mimo
  aktuálně ověřený rozsah.

### To-Do: postup podle auditu před závěrečným testováním

Podle auditu postupujeme po malých, samostatně ověřených částech. Položku
označíme za hotovou až po opravě a doloženém ověření jejího rozsahu.

1. **P0 — Starší API a ochrana rozpisů.**
   - [x] Vyžadovat roli managera pro zápis přes týdenní `/run` a `/replacement`;
     viewer zůstává pouze pro čtení.
   - [x] Zabránit přepsání existujícího záznamu podle klientem ovlivnitelného ID,
     zejména pokud už je rozpis potvrzený; zachovat zamýšlenou práci s novými
     návrhy.
   - [x] Přidat regresní testy viewer/manager a test kolize ID nad izolovanou
     PostgreSQL.
   - `VERIFIED` (4. 11. 2026) — Cílené i úplné Vitest testy, lint, typecheck,
     Prisma validace a build prošly. Samostatný integrační test nad jednorázovou
     PostgreSQL 16 na `localhost:55439/planning_monthly_test` potvrdil, že
     opakovaný ani křížový zápis nepřepíše potvrzený týdenní záznam; zůstal
     zachovaný plán a jediná auditní událost. Testovací databáze byla po ověření
     zastavena a odstraněna.
2. **P0 — Zneplatnění starých přihlášení.**
   - [x] Po resetu hesla, změně hesla, změně role nebo deaktivaci účtu odmítnout
     dříve vydanou relaci.
   - [x] Po vlastní změně hesla vyžadovat nové přihlášení; starý token bez
     verze relace odmítnout.
   - `VERIFIED` (4. 11. 2026) — Přidána `AppUser.sessionVersion` (výchozí 0).
     Reset hesla, jeho vlastní změna, změna role a aktivního stavu verzi zvýší.
     Databázové JWT se při každém obnovení porovná s aktuální verzí; chybějící
     nebo zastaralý token se odmítne. Po vlastní změně hesla se uživatel odhlásí
     a přihlásí znovu. Cílené auth testy: 21 prošlo; celý Vitest: 490 prošlo,
     8 přeskočeno; lint, typecheck, Prisma validace a build prošly. Integrační
     test nad jednorázovou PostgreSQL 16 ověřil reset, nové dočasné heslo,
     povinnou změnu hesla, změnu role i deaktivaci. Databáze byla po testu
     zastavena a odstraněna.
3. **P0 — Jediné atomické potvrzení.**
   - [x] Zajistit, aby souběžné potvrzení týdenního rozpisu i operativní náhrady
     vytvořilo právě jedno potvrzení a jednu auditní událost.
   - [x] Ověřit vítězný zápis v databázových integračních testech nad izolovanou
     PostgreSQL.
   - `VERIFIED` (4. 11. 2026) — Týdenní i náhradové potvrzení používá podmíněný
     databázový zápis podle `confirmedAt IS NULL`; auditní událost vznikne jen
     při úspěšné změně. Poražená souběžná transakce načte a vrátí vítězný uložený
     výsledek jako již potvrzený. Dvě integrační zkoušky s řízenou bariérou
     ověřily, že obě transakce nejprve načtou nepotvrzený záznam: před opravou
     testy reprodukovaly dvě vítězná potvrzení, po opravě zůstalo právě jedno
     potvrzení a jedna auditní událost v každém toku. Cílené databázové testy:
     3 prošly; celý Vitest: 490 prošlo, 10 přeskočeno; lint, typecheck, Prisma
     validace a build prošly. Izolovaná PostgreSQL 16 byla odstraněna.
4. **P1 — Pravdivé zdroje obsazení.**
   - [ ] Odlišit uložený profil od výchozích hodnot a určit, jak manažer schvaluje
     chybějící nebo předvyplněné hodnoty.
   - [ ] Prověřit další použití výchozího profilu.
5. **P1 — Pravidla a limity plánování.**
   - [ ] Uzavřít potřebná doménová rozhodnutí a ověřit návaznosti, nepokryté dny,
     absence a částečný měsíc.
   - [ ] Sjednotit limit 200 zaměstnanců mezi vstupní kontrolou a solverem;
     ověřit časové limity na schválených syntetických scénářích.
   - [ ] Ošetřit neexistující i nejednoznačné místní časy při změně času.
6. **P1 — Správa rozpisů.**
   - [ ] Navrhnout a implementovat seznam rozpisů s možností smazat jednotlivý
     rozpis.
   - [ ] Před mazáním potvrzených rozpisů stanovit zachování historie, auditu a
     podkladů pro návazné plánování.
7. **P1 — AI a citlivý text.**
   - [ ] Rozhodnout o souladu současného lokálního plánovače s potvrzeným záměrem
     AI a o bezpečném zpracování pokynů.
   - [ ] Před praktickým použitím určit přístup, uchování a mazání volného textu;
     dokud to není schválené, neposílat skutečná jména, rozpisy ani pokyny externí
     AI.
8. **P1 — Kvalita a přístupnost.**
   - [ ] Doplnit Python testy solveru a databázové integrační testy do CI s
     izolovanou testovací databází.
   - [ ] Opravit zjištěné problémy s klávesnicí, popisky, fokusem, chybou
     neexistujícího návrhu a ztrátou rozepsaných vstupů; ověřit čtečkou obrazovky.
   - [ ] Posoudit vývojové závislosti a ověřit kompatibilní aktualizace.
9. **P2 — Závěrečné ověření MVP.**
   - [ ] Provést syntetický průchod návrh → kontrola → potvrzení → obnovení,
     včetně rolí, souběhu, návazností a správy rozpisů.
   - [ ] Reálná data, produkční služby a další nasazení řešit až v samostatně
     odsouhlaseném rozsahu.
