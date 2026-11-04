# Aktuální stav a další kroky — Plánovací Engine

> Stav aktualizován 4. 11. 2026 při postupném sjednocování větví. Historické
> testy níže jsou výslovně označeny; aktuální kontroly jsou v závěru dokumentu.
> Význam stavových popisků
> vysvětluje [`docs/README.md`](README.md#stavové-popisky).

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
| Obnovení uložené verze po načtení stránky | `IMPLEMENTED`; ověření aktuálního toku v tomto auditu `NOT VERIFIED` |
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
- Porovnání stromu `cline/9dbfe`: upravené testovací soubory jsou totožné s
  `main` a změny exportů a importu již `main` obsahuje. Nesledovaný starší
  `ai-provider.ts` se od současného liší; jeho převzetí by odstranilo novější
  rozhraní náhrad. Navíc starší verze odmítá prázdné ID alternativy, současná
  strukturální kontrola dovoluje libovolný řetězec. `OPEN QUESTION` — ověřit
  požadavek na neprázdné ID a případně jej ošetřit cíleně s testem; starý
  soubor ani pracovní strom při auditu nemažou ani nepřepisují.
  Syntetické přímé volání `isPlanDraft()` potvrdilo přijetí alternativy s
  prázdným ID; dopad na běžný uživatelský tok nebyl samostatně ověřen.
- Hlavní README a rozcestník dokumentace byly sladěny s odstraněním ručních
  úprav z manažerské obrazovky; další historické souhrny vyžadují kontrolu.
- GitHub CI v aktuálním workflow samostatně nespouští Python testy solveru ani
  databázové integrační testy. Jejich pokrytí a bezpečné testovací prostředí
  je potřeba doplnit před závěrečným ověřením MVP.

### Další kontrola a postup před uzavřením MVP

- `VERIFIED` / přístupnost — Při šířce prohlížeče 390 × 844 px šlo otevřít
  mobilní menu a přejít na Návaznost směn. Po přechodu se menu vizuálně zavřelo,
  ale stisk `Tab` přesunul fokus na skrytý odkaz Zaměstnanci; fokus nebyl na
  obrazovce viditelný. Zajistit správné vyloučení zavřené navigace z pořadí
  klávesnice a návrat fokusu; ověřit též čtečku obrazovky a další průchody.
  Přihlášení, prázdný formulář a stránka návazností byly vizuálně zkontrolovány;
  databáze byla záměrně nedostupná a jejich datové operace se netestovaly.
- `VERIFIED` / UX oprava — Při odkazu prohlížeče na již neexistující návrh
  server vrátil `404`; stránka nabídla opětovné načtení, po kterém se stejná
  chyba zopakovala. Rozlišit chybějící návrh od dočasné chyby spojení a
  nabídnout bezpečný postup pro pokračování bez automatického mazání dat.
  Ověřeno v izolovaném prohlížeči a prázdné testovací databázi.
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
  podle dodaného identifikátoru. Potvrzené záznamy nebyly v pokusu měněny;
  dopad kolize na ně vyžaduje samostatný test. Opravit oprávnění a ochranu
  identit existujících záznamů, potom pokrýt role a kolize integračním testem.
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
- `VERIFIED` / oprava nutná — Již vydaná relace po resetu a následné změně
  hesla znovu umožní přístup. Integrační test použil syntetický účet a
  izolovanou PostgreSQL: stejná relace dostala z chráněného API před resetem
  `200`, při vynucené změně `403` a po změně hesla opět `200`. Reset byl
  napodoben přímou změnou testovacího účtu v databázi; změnu hesla provedla
  aplikační služba. Aktualizace relace neporovnává verzi hesla. Prověřit a
  implementovat zneplatnění starých relací včetně testu celého přihlášení.
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

### Doporučené pořadí dokončení před závěrečným testováním

1. Zabezpečit oprávnění a ukládání starších API a zneplatnění starých relací;
   doplnit nezávislé testy viewer/manager a souběhu.
2. Opravit označení zdroje obsazení a vyjasnit, jak manažer potvrzuje chybějící
   nebo výchozí hodnoty. Zkontrolovat ostatní místa používající výchozí profil.
3. Uzavřít potřebná doménová rozhodnutí, následně prověřit návaznosti,
   nepokryté dny, absenci, časový limit solveru a částečný měsíc.
4. Navrhnout a implementovat správu rozpisů včetně jednotlivého mazání a
   dohodnutého zachování historie, auditu a návazností.
5. Rozhodnout o bezpečném použití AI a vysvětlování pokynů; současný lokální
   plánovač volný text nevyhodnocuje.
6. Doplnit kontroly Pythonu a izolované databáze do CI, posoudit vývojové
   závislosti a dokončit kontrolu přístupnosti a chybových stavů.
7. Provést závěrečný syntetický průchod návrh → kontrola → potvrzení →
   obnovení, včetně souběhu a rolí; reálná data a další nasazení řešit až v
   samostatně odsouhlaseném rozsahu.
