# Aktuální stav a další kroky — Plánovací Engine

> Stav aktualizován 3. 11. 2026 po automatických kontrolách a průchodu nad
> izolovanou databází se syntetickými záznamy. Význam stavových popisků
> vysvětluje [`docs/README.md`](README.md#stavové-popisky).

## Stav měsíčního MVP

Schváleným směrem je jeden návrh pro celý kalendářní měsíc; týdenní tabulka je
jeho pohled. Lokální OR-Tools plánovač vytváří přiřazení, aplikace je
nezávisle kontroluje a manažer je může ve vybraném týdnu upravit. Každá ruční
úprava se znovu kontroluje za celý měsíc. Návrh se nikdy nestává potvrzeným bez
samostatné akce manažera.

Schváleným záměrem je AI jako hlavní plánovací logika. Současná implementace
s lokálním OR-Tools a bez vyhodnocení textových pokynů se od něj liší; její
existence sama nedokládá schválení změny záměru. Viz `DOMAIN_DECISIONS.md`.

| Oblast | Aktuální stav |
| --- | --- |
| Měsíční formulář, lokální OR-Tools provider a uložení návrhu | `IMPLEMENTED`; syntetický integrační průchod `VERIFIED` |
| Nezávislá měsíční validace | `IMPLEMENTED`; v testovacím měsíci zůstala část pravidel `NOT VERIFIED` kvůli chybějícím návaznostem a otevřenému výkladu víkendového volna |
| Ruční změna směn a nová kontrola | `IMPLEMENTED`; synteticky ověřeno odebrání směny, odhalení podobsazení a následná oprava |
| Obnovení poslední uložené verze po načtení stránky | `IMPLEMENTED`; ověřeno ve stejném prohlížeči |
| Potvrzení rozpisu | Zůstalo zablokované; žádný testovací návrh nebyl potvrzen |
| Textové pokyny v režimu OR-Tools | Nevyhodnocují se; UI tuto skutečnost přiznává. Pokyny se solveru ani externí AI neposílají. |
| Gemini provider | Zůstává dostupný pro ostatní nakonfigurované toky; není hlavním plánovačem měsíčního MVP. Kvalita produkčního plánování zůstává `NOT VERIFIED`. |
| Produkční autentizace, databáze a provoz | `NOT VERIFIED`; mimo tento lokální průchod |

### Ověřený syntetický průchod

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

### Automatické kontroly

| Kontrola | Výsledek |
| --- | --- |
| `npm run test` s aktivním lokálním OR-Tools prostředím | 59 testovacích souborů prošlo, 2 přeskočeny; 382 testů prošlo, 3 přeskočeny |
| `npm run lint` | prošel |
| `npm run typecheck` | prošel |
| `npm run build` | prošel |
| `npm run db:validate` | prošel |
| Python testy plánovače | 10 testů prošlo |

## Známá omezení a další rozhodnutí

### Rozhraní manažera — `IMPLEMENTED`, ověřeno částečně

- Výsledek návrhu používá srozumitelné stavy a konkrétní nálezy; zobrazuje,
  zda plánovač pokyny vyhodnotil. U AI je její popis označen jako neověřené tvrzení.
- Ruční úpravy návrhu a volba ukázkového scénáře jsou z manažerské obrazovky
  odstraněny. Zůstává jedno výslovné tlačítko manažerského potvrzení; serverové
  blokátory i zákaz automatického potvrzení zůstávají.
- Ukázkové přehledy jsou odstraněny, tlačítka zaměstnanců mají čitelný styl a
  přehled i nastavení neukazují technické názvy režimů či interních proměnných.
- Prohlížečově ověřeno při 390×844 a 1280×900 px a dostupnost odkazu přeskočení
  při ovládání klávesnicí. Bez databáze nebyl proveden průchod s uloženými daty;
  tento provozní tok zůstává `NOT VERIFIED`.

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
