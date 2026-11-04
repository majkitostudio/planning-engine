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
- Jeden starší pracovní strom obsahuje necommitnuté změny; záloha Git stash a
  nesledované výstupy v hlavní složce zůstávají zachovány. Část záznamů
  pracovních stromů ukazuje na cesty z jiného prostředí a vyžaduje ověření.
- Hlavní README a rozcestník dokumentace byly sladěny s odstraněním ručních
  úprav z manažerské obrazovky; další historické souhrny vyžadují kontrolu.
- GitHub CI v aktuálním workflow samostatně nespouští Python testy solveru ani
  databázové integrační testy. Jejich pokrytí a bezpečné testovací prostředí
  je potřeba doplnit před závěrečným ověřením MVP.

### Další kontrola a postup před uzavřením MVP

- `VERIFIED` — Na větvi `c7218af` prošlo všech sedm migrací na nově vytvořené
  izolované PostgreSQL 16. Testy včetně databázových a lokálního plánovače:
  484 úspěšných, jeden přeskočený integrační test Gemini. Databáze obsahovala
  pouze syntetické testovací záznamy a testovací kontejner byl ukončen.
- `NOT VERIFIED` — Přezkoumat zneplatnění již vydaných relací po změně nebo
  resetu hesla. Aktualizace relace načítá aktuální účet, ale neporovnává verzi
  hesla; dopad je potřeba potvrdit samostatným integračním testem a vyřešit.
- `NOT VERIFIED` — Prověřit ochranu přihlášení před opakovanými pokusy a pokrytí
  autentizace, oprávnění a práce s osobními údaji při bezpečnostní kontrole.
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
