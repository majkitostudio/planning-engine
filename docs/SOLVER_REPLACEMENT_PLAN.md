# Plán výměny hlavního solveru

**Rozhodnutí uživatele:** 9. 11. 2026 obnovit OR-Tools jako hlavní solver měsíčního rozpisu.

**Stav:** `IN_PROGRESS` — model, serverová funkce a výslovně volitelný provider jsou implementovány; zbývá plné ověření aplikace, perzistence a schválené produkční nasazení.

**Cíl:** jeden spolehlivý měsíční tok: manažer zadá podklady, solver sám hledá návrh, aplikace jej nezávisle ověří a manažer výslovně potvrdí.

## Aktuální To-Do

- [ ] Uzavřít omezený solverový kontrakt pro celý měsíc a plné úvazky; zachovat neznámé podklady a vlastní časy historie.
- [ ] Obnovit CP-SAT model s explicitními neobsazenými místy a jediným cílem minimalizovat jejich součet, bez historických měkkých vah.
- [ ] Synteticky ověřit pravidla, návaznosti, DST, chybové stavy, částečné návrhy, nezávislou validaci a výkon 100+ zaměstnanců.
- [ ] Před přepnutím samostatně schválit a ověřit skutečný měsíční model v Preview včetně velikosti, cold startu, souběhu a limitů.
- [ ] Podle výsledků bezpečně napojit explicitní provider, neutrální stavy a UI, bez fallbacku; zachovat historii a manažerské potvrzení.
- [ ] Izolovaně ověřit celý tok včetně odmítnutí částečného návrhu; spustit kontroly, projít diff a vytvořit související commity.

## Co se mění a co zůstává

Mění se hlavní zdroj přiřazení směn: místo současného Cloudflare Workers AI se má použít OR-Tools CP-SAT. Cloudflare kód a historické běhy se během přechodu zachovají, aby byl přechod vratný a historie zůstala čitelná. Po přepnutí se Cloudflare nesmí použít jako skrytá záloha.

Zůstávají měsíční UI a API, strukturované vstupy, samostatná validace, stavové blokátory, manažerské potvrzení, ukládání potvrzených plánů a audit. AI nemá přiřazovat směny. Možná budoucí interpretace pokynů do strukturovaných vstupů je mimo tento plán a vyžaduje vlastní rozhodnutí.

## Zásadní technické rozhodnutí před implementací

Původní OR-Tools běh spouštěl Python jako lokální podproces z TypeScriptu. To může fungovat na vývojářově počítači, ale samo o sobě nefunguje jako hostingový návrh pro online aplikaci. Nezačínejme přepisovat solver, dokud malý technický pokus neprokáže, že jej lze v cílovém prostředí sestavit a spustit v přijatelném čase.

Preferovaná první možnost k ověření je Vercel Python Function, protože cílem projektu zůstává Vercel Hobby. Vercel oznámil Python runtime jako obecně dostupný 15. 10. 2026; samostatný Vercel Services způsob, jak společně nasazovat Next.js a oddělený Python backend jako více služeb jednoho projektu, zůstává beta. Aktuální Vercel projekt je nastavený jako Next.js, proto nejprve ověřit, zda lze syntetickou Python funkci sestavit a vystavit bez přepnutí typu projektu nebo změny jeho nastavení. Pokud by bylo nutné přejít na Services, zastavit se před jakoukoli změnou projektového nastavení a nejprve ji samostatně schválit. Dostupnost OR-Tools wheelu, sestavení, studený start a konkrétní časové/velikostní limity ověřit v cílovém projektu. Funkci volá pouze server a přijímá jen omezený strukturovaný vstup. OR-Tools zveřejňuje oficiální Python instalaci, ale kompatibilitu konkrétní verze wheelu je třeba ověřit.

Zdroje k ověření v první bráně: [oznámení obecné dostupnosti Pythonu na Vercel](https://vercel.com/blog/backends-on-vercel-python-containers-and-daemons), [Vercel Python runtime](https://vercel.com/docs/functions/runtimes/python), [Vercel Services](https://vercel.com/docs/services), [limity funkcí Vercel](https://vercel.com/docs/functions/limitations), [nastavení trvání funkce](https://vercel.com/docs/functions/configuring-functions/duration), [instalace OR-Tools](https://developers.google.com/optimization/install) a [význam stavů CP-SAT](https://developers.google.com/optimization/cp/cp_solver/).

Pokud tento pokus nevyhoví, zastavíme vývoj online adaptéru a porovnáme samostatný hostovaný solver s jiným cílovým hostingem. Nevrátíme se automaticky k lokálnímu subprocessu ani k AI plánování.

## Fáze práce a podmínky pokračování

### 1. Zachytit nové rozhodnutí a uzavřít rozsah

- V pracovních pravidlech je již zaznamenáno, že rozhodnutí z 9. 11. nahrazuje starší rozhodnutí o AI jako hlavním solveru.
- Při implementaci zkontrolovat měsíční vstupní kontrakt, validátor, databázové snapshoty, chybové stavy a aktuální volání provideru. Neodstraňovat historická data ani Cloudflare adaptér.
- Solver dostává jen strukturovaná data potřebná k plánování. Žádná jména, volný text ani tajné údaje se neposílají do logů nebo solveru.
- Výslovně oddělit `FEASIBLE` od `OPTIMAL`; matematické optimum není požadavek produktu.

**Pokračovat, když:** kódové místo pro měsíční provider i kontrakt vstupů/výstupů jsou ověřeny a rozsah nevyžaduje nové doménové předpoklady.

### 2. Technický pokus hostingu OR-Tools

Vytvořit nejmenší izolovaný syntetický Python solver a zavolat jej přes cílový serverový runtime. Pokus má zodpovědět, zda instalace OR-Tools funguje v podporované verzi Pythonu; zda se sestaví a vejde do limitů funkcí; zda cold start i teplý běh splní zvolený čas; zda fungují timeout, souběžná volání a omezení vstupního/tělového objemu; zda lokální vývoj a preview dávají opakovatelný výsledek.

- Použít pouze syntetické zaměstnance a směny, bez produkční DB a bez skutečných osobních dat.
- Server-server volání, autentizace mezi aplikací a solverem, limity velikosti vstupu, timeout a bezpečné chybové odpovědi jsou podmínkou.
- Logovat pouze korelační ID, trvání, velikosti, stav solveru a neosobní počty; nikdy vstupy/rozpis.
- Ověřit aktuální nastavení Vercel Hobby, Python verzi, build a runtime limity v cílovém projektu. Dokumentační limit nepovažovat za důkaz úspěšného deploye.
- Neprovádět produkční nasazení ani zápis do databáze v rámci tohoto pokusu. Preview/deploy je samostatný schvalovaný krok podle `AGENTS.md`.

**Výsledek syntetického pokusu (9. 11. 2026):** v propojeném Vercel projektu nastaveném na Next.js proběhl Preview build minimální Next.js aplikace s izolovanou Python funkcí. Funkce běžela na Pythonu 3.14.9, načetla OR-Tools 9.15.6755 a na pevném tříproměnném syntetickém CP-SAT modelu vrátila `OPTIMAL`. První HTTP požadavek trval celkem 547 ms, z toho 86 ms uvnitř solveru; druhý 328 ms celkem a 1,27 ms uvnitř solveru. Neautorizované volání vrátilo 404. Preview neobsahovalo Planning Engine UI, databázový kód ani zaměstnanecká data a nemělo přidaný trvalý projektový tajný údaj.

Tím je ověřena dostupnost Python funkce, instalace OR-Tools a její základní běh v izolovaném Preview na tomto Vercel projektu. Není tím ověřen celý měsíční model, velikost jeho balíčku, souběžné požadavky, škála 100+ zaměstnanců, mezní timeouty, přenos reálného měsíčního DTO ani napojení funkce do aplikace.

**Brána 1 — základní runtime:** minimální instalace, sestavení a běh OR-Tools ve Vercel Preview prošly; lze pokračovat k obnově skutečného měsíčního modelu. Před jeho přepnutím do hlavní aplikace ještě změřit velikost kompletní funkce, cold start, souběh, limity času a běh na syntetickém měsíci s cílovým počtem lidí. Pokud tyto kontroly neprojdou, předložit varianty hostování a nákladů k rozhodnutí; nepřepínat na neověřenou variantu.

### Porovnání původního solveru se současným kódem (9. 11. 2026)

Ověřen zdroj `scripts/monthly_solver.py` a adaptér v rodiči `f6d616d` proti současnému `month-input.ts`, `month-validation.ts` a měsíční orchestraci. Samotné porovnání neznamená obnovení solveru.

- Starý model požaduje úplný seznam obsazení a přesný počet přiřazení na každou směnu. Současný vstup připouští chybějící požadavky; validátor je označuje jako neověřené. Návrat musí bezpečně rozlišit chybějící podklad od zadané nuly a neúplného obsazení.
- Starý model řeší jeden celý měsíc i historický částečný rozsah a částečné úvazky; nový pilot vyžaduje celý měsíc a plné úvazky. Starý adaptér spouští lokální podproces a není hotovým online řešením.
- Starý model používá odchylku fondu a opakování typu směny jako vážený měkký cíl. Současný validátor uvádí pracovní fond a střídání v samostatných informativních nálezech; samy neblokují potvrzení. Historické váhy proto nejsou schváleným výchozím nastavením.
- Starý adaptér z okolní historie vynechává směny bez typu a označuje danou stranu jako neúplnou. Současný validátor umí kontrolovat také vlastní přesné časy; nový model a adaptér musí tyto podklady zohlednit bez předstírání úplnosti.
- Starý solver slučuje `OPTIMAL` a `FEASIBLE` do `feasible`. Nový výstup musí oba stavy zachovat a `UNKNOWN` ani provozní chybu nevydávat za `INFEASIBLE`.
- Současný validátor blokuje potvrzení při nedostatečném obsazení a při neověřených nezbytných podkladech. Cílené existující syntetické testy validátoru, měsíční orchestrace a rout prošly lokálně: 3 soubory, 44 testů. Nejde o test obnoveného solveru ani celého databázového toku.
- Historický Python solver a jeho testy byly z rodiče `f6d616d` spuštěny mimo pracovní strom na lokálním Pythonu 3.14 s OR-Tools 9.15.6755: prošlo 28 historických testů. Ověřují starý model, nikoli požadované nové chování, výkon nebo online integraci.
- Při opětovné kontrole aktuálního kódu bylo potvrzeno, že chybějící dostupnost přiřazeného člověka je `not_verified`, nikoli známá dostupnost, a že nezadaný požadavek na obsazení není totéž co zadaná nula. Měsíční orchestrace dosud používá AI-specifické chyby a runtime zatím volbu `ortools` nepodporuje.
- Doplněny syntetické regresní testy současného nezávislého validátoru pro jarní a podzimní změnu času v Praze. Společný cílený běh validátoru a měsíční orchestrace prošel: 2 soubory, 37 testů. Tyto testy nejsou testem solveru ani důkazem připravenosti nasazení.
- Lokální výchozí Python 3.15 nemá dostupný wheel OR-Tools 9.15.6755; tato verze byla pro další izolované pokusy nainstalována mimo repozitář pod Pythonem 3.14. Instalace není ověření měsíčního modelu ani online provozu.
- První samostatný Python CP-SAT model minimalizuje součet neobsazených míst, nepoužívá měkké váhy a zachovává stavy `OPTIMAL` a `FEASIBLE`. Neznámé požadavky, dostupnost přiřazených a úplnost návazností vrací zvlášť; ještě není propojen s TypeScript kontraktem ani nezávislým validátorem. Při implementaci byla opravena historická mez kontroly šestice začínající sedm dní před měsícem.
- Jedno lokální syntetické měření pro 100 zaměstnanců, 30 dní a 20 lidí na každou směnu: 2,11 s včetně sestavení modelu, `OPTIMAL`, 1 200 přiřazení, nulový součet nedostatků. Není to měření Preview, souběhu, nejhoršího případu ani důkaz použitelné kvality rozpisu; další testy jsou nutné.
- Lokální syntetické porovnání Python modelu s nezávislým TypeScript validátorem zahrnuje úplné pokrytí, částečný návrh, chybějící požadavek, dostupnost a historii a vlastní čas před měsícem. Částečný i neověřené návrhy validátor odmítl k potvrzení; porovnávají se také jednotlivé nedostatečně obsazené směny. Python test navíc prověřuje oba přechody času přímo v modelu přes hranici měsíce. Přidán CI job pro Python 3.14, modelové testy a toto porovnání; vzdálený CI běh zatím nebyl ověřen.
- Opakovatelný lokální benchmark `scripts/benchmark_monthly_solver.py` (Python 3.14, pouze syntetika): 100 lidí, 30 dní, veškerá dostupnost a 20 lidí na směnu, vstup JSON 542 689 B. Tři samostatné běhy 2,206–2,307 s, dva souběžné procesy celkem 3,294 s, všechny `OPTIMAL`, bez nedostatku. Při 45 lidech na směnu a desetisekundovém limitu hledání vrátil solver po 10,613 s `FEASIBLE` a 548 neobsazených míst; optimum nebylo prokázáno. Jde o jednotlivá lokální měření, nikoli online zátěžový test ani ověření kvality rozdělení práce.
- Při fakticky nulovém limitu hledání vrátil model `UNKNOWN`, ale celé volání trvalo 0,655 s: limit CP-SAT nezahrnuje sestavení modelu. Online adaptér proto musí mít samostatný celkový deadline včetně přenosu a sestavení a nesmí vypršení zaměnit za neproveditelnost. Modelové testy navíc kontrolují skutečné `UNKNOWN` a izolaci čtyř souběžných vláken; žádný z těchto testů nenahrazuje ověření souběhu v Preview.
- Se souhlasem uživatele proběhl další izolovaný Vercel Preview s aktuálním měsíčním modelem a výhradně uvnitř funkce vytvořenou syntetikou. Pro 100 lidí a 20 míst na směnu vrátil dva běhy `OPTIMAL`, 1 200 přiřazení bez nedostatku: celkově 3,175 a 2,909 s, z toho solver včetně sestavení 2,696 a 2,538 s. Dva souběžné požadavky trvaly společně 5,245 s a oba vrátily `OPTIMAL` bez nedostatku. Při limitu hledání téměř nula vrátil model `UNKNOWN` (0,808 s celkem); při 45 místech na směnu a desetisekundovém limitu `FEASIBLE` s 554 neobsazenými místy (10,958 s celkem). Nepřihlášený požadavek dostal 404. Preview neobsahovalo aplikační UI ani databázový kód; jeho testovací funkce nepřijímala měsíční DTO zvenčí.
- Toto měření stále neověřuje přenos DTO, limity těla, meziserverovou autentizaci skutečného adaptéru, velikost samotného Python balíčku ani studený start autorizovaného řešení: první požadavek byl neautorizovaný. Nejde ani o důkaz kvality rozdělení směn nebo celého aplikačního toku. Funkční Preview mělo stav `READY`; předcházející sestavený pokus bez nastaveného přístupového klíče zůstává uzavřený. Neproběhlo produkční nasazení ani databázový zápis.
- Následný izolovaný Preview ověřil i přenos syntetického měsíčního JSON (542 689 B): jednotlivý POST trval 3,251 s a vrátil `OPTIMAL` s 1 200 přiřazeními; dva souběžné POSTy trvaly společně 5,592 s a oba vrátily tentýž souhrnný výsledek. Testovací endpoint bez klíče vrátil 404, při chybném JSON 400 a při překročení zkušebního limitu 1 000 000 B 413. Jde o izolovaný testovací endpoint, nikoli hotový aplikační adaptér ani bezpečnostní audit. Velikost Python balíčku a autorizovaný studený start nadále nebyly změřeny.
- Přidán TypeScript překlad `monthly-ortools-contract.ts`: z požadavku vynechává jména, identifikátory absencí i volný text, mapuje zaměstnance na tokeny a kontroluje přiřazení před jejich překladem zpět. Zachovává stav solveru a vlastní časy historie; jeho testy pokrývají odmítnutí nepodporovaného rozsahu, úvazku a chybných identit či přiřazení. Samotný kontrakt nevolá síť; nezávislá validace výsledku zůstává nezbytná.
- Dalším krokem vznikl síťový klient, provider a ověřovaná Python HTTP funkce. Výběr `ortools` je nyní v kódu výslovný, při chybě konfigurace nepřepíná na jiného providera; existující výchozí nastavení se nezměnilo. Návrh obsahuje stav i verzi `monthly-cpsat-v1`, stále prochází nezávislou validací a sám nepotvrzuje rozpis. Test měsíční API cesty s nahrazenou HTTP odpovědí prověřuje zamítnutí částečného návrhu i neuložení výsledku `UNKNOWN`.
- Poslední izolovaný Preview použil skutečnou serverovou funkci s Pythonem 3.14 a syntetickým vstupem pro 100 lidí. První autorizovaný požadavek trval 4,249 s, další 2,922 s a dva souběžné 5,342 s; všechny vrátily `OPTIMAL` s 1 200 přiřazeními. Neautorizovaný požadavek dostal 404, vadný JSON 400 a nadměrné tělo 413. Skutečný TypeScript klient a nezávislý validátor nad výsledkem vrátili `valid`, bez nálezů a s možností manažerského potvrzení. V předchozím sestavení Vercel uvedl velikost Python funkce 80 314 957 B a runtime Python 3.14; údaj o velikosti není rozbor rozbaleného balíčku. Test nebyl plným průchodem UI ani databází.
- Režim se aktivuje pouze nastavením `PLANNING_MONTHLY_PROVIDER=ortools`, HTTPS adresy v `PLANNING_ORTOOLS_URL` a společného serverového klíče v `PLANNING_ORTOOLS_TOKEN`. Žádný klíč není součástí repozitáře. Před skutečným zapnutím je nutné v cílovém prostředí ověřit konfiguraci nasazení, přístup mezi funkcemi a celý tok včetně perzistence. Produkční nastavení ani databáze nebyly měněny.
- Lokálně prošlo 605 TypeScript testů (12 přeskočeno), lint, typecheck, build a Prisma validace; Python 3.14 provedl 16 modelových a HTTP testů a samostatné porovnání s validátorem pokrylo 6 scénářů. Tyto kontroly nenahrazují databázový ani prohlížečový průchod. Docker daemon ani příkazy lokálního PostgreSQL při kontrole nebyly dostupné; integrační databázové testy a úplný přihlášený tok proto nebyly spuštěny. První pokus o porovnání validátoru chybně použil Python 3.15; po výslovném výběru 3.14 prošel.
- Po spuštění Dockeru vznikla nová izolovaná testovací PostgreSQL na `localhost:55439`; aplikovalo se 11 existujících migrací pouze do ní a prošlo 9 existujících databázových integračních testů. Nový opt-in integrační test `tests/monthly-ortools-live.integration.test.ts` se skutečným syntetickým solverem v Preview a testovací náhradou manažerské session ověřil zablokování částečného návrhu, potvrzení platného návrhu, opětovné načtení zdroje a verze a jediný auditní záznam.
- Samostatně proběhl skutečný lokální průchod prohlížečem s přihlášeným syntetickým manažerem, izolovanou PostgreSQL a solverem v Preview. Nejprve nedostatečně obsazený návrh zobrazil problémy a zakázané potvrzení. Poté byly do testovací databáze vloženy syntetické úplné návaznosti a jednoduchý scénář s jedním zaměstnancem a pěti požadovanými směnami prošel validací, výslovným potvrzením a obnovením stránky; rozpis zůstal potvrzený a označený OR-Tools. V databázi byl jeden potvrzovací audit se správnou verzí modelu; konzole prohlížeče neobsahovala chyby. Jde o izolovaný jednoduchý scénář, nikoli důkaz kvality rozdělení práce, produkčního zabezpečení nebo provozu na reálných datech.

### 3. Obnovit a upravit CP-SAT model

Původní zdroj je dohledatelný v rodiči commitu `f6d616d` (commit `31c634d` přidal měsíční solver; `f6d616d` jej odstranil). Před kopírováním porovnat tehdejší model se současným měsíčním kontraktem. Obnovit pouze aktuálně potřebný celý kalendářní měsíc a plné úvazky; starou podporu částečných úvazků a částečných měsíců nepřenášet do pilotu bez nové dohody.

**Tvrdé podmínky modelu** mají odpovídat schváleným pravidlům a současnému validátoru: přiřadit jen dostupné zaměstnance; respektovat schválené absence a dostupnost; zabránit kolizím; pokrýt zadané požadavky pokud možno; dodržet 35 hodin odpočinku po šesti po sobě jdoucích pracovních dnech; při víkendové práci zajistit dva dny volna v týdnu pondělí–neděle; zohlednit dostupnou historii za hranicemi měsíce. Ověřovat přesné intervaly směn a přechody letního/zimního času.

**Neúplné obsazení:** starý solver vyžadoval přesně požadovaný počet lidí na každé směně, takže nedostatek kapacity mohl vést k `INFEASIBLE` a zahodit užitečnou část návrhu. Nový model musí umožnit neobsazená místa jako explicitní nedostatek a vrátit částečný rozpis, který UI označí jako nepotvrditelný. Pokrytí má být upřednostněno před soft preferencemi, ale konkrétní optimalizační váhy je nutné stanovit transparentně a bez domýšlení. Před implementací vah ověřit současný UI/datový kontrakt pro chybějící obsazení.

Staré měkké váhy střídání směn a odchylky pracovního fondu byly implementační volbou, nikoli potvrzeným pravidlem. Nepřebírat je automaticky. Nejprve doložit, jak se výsledek bude řadit; pokud produktové priority nejsou potvrzené, používat pouze schválené tvrdé podmínky a omezené nehodnocené/konfigurovatelné preference.

Solver musí rozlišovat alespoň:

| Stav | Význam pro aplikaci |
| --- | --- |
| `OPTIMAL` | Nalezeno a pro danou matematickou formulaci prokázáno optimum. Neznamená to automaticky praktickou dokonalost. |
| `FEASIBLE` | Nalezen platný výsledek v rámci modelu; optimum nebylo prokázáno. |
| `INFEASIBLE` | Solver prokázal, že tvrdý model v zadané podobě nemá řešení. Vysvětlit pouze ověřené příčiny; nepředstírat přesnou diagnózu bez důkazů. |
| `UNKNOWN` / timeout | Solver výsledek neurčil v limitu. Není to důkaz neproveditelnosti. |
| chyba vstupu / nedostupný solver / chyba běhu | Samostatné provozní stavy, které se nesmí maskovat jako `INFEASIBLE` ani přepnout na jiný provider. |

Omezit zbytečné závislosti původního Python prostředí; připnout kompatibilní verzi OR-Tools a Pythonu až podle brány 1. Ověřit determinismus při stejném vstupu, seed a limitu, aniž bychom slibovali identický plán napříč verzemi/runtime.

### 4. Připojit provider do měsíčního toku

- Přidat měsíční OR-Tools adaptér za existující provider-neutral kontrakt. Upstream požadavek, solverový DTO a výstup aplikace mají být oddělené.
- Přenášet zaměstnancům neprůhledné ID/tokeny; TypeScript vrstva mapuje je zpět až po ověření, že odpověď neobsahuje neznámé, opakované nebo chybné ID, datum či typ směny.
- Nastavit výslovný režim `PLANNING_MONTHLY_PROVIDER=ortools`; chybná konfigurace, timeout nebo nedostupnost vrátí jasnou chybu, bez tichého přechodu na Cloudflare nebo simulaci.
- Upravovat provider typy, runtime factory, API route, UI stav a provider label společně. Zachovat čtení historických běhů s `cloudflare` i `ortools`; nové běhy musí správně zapisovat zdroj a verzi modelu.
- Převést chyby z AI-specifických tříd na neutrální stavy plánovacího běhu. Rozhraní nemá označovat OR-Tools výstup jako AI výsledek.
- Zajistit, že provider pouze navrhne plán; nezapisuje potvrzený rozpis ani neobchází validátor a manažerské potvrzení.

### 5. Testy modelu, adaptéru a provozních hranic

Automatizované syntetické scénáře mají pokrýt alespoň:

- malý celý měsíc s dosažitelným pokrytím, absence a časově omezenou nedostupnost;
- šest pracovních dnů + 35 hodin odpočinku, víkendové směny a pondělí–neděle;
- nedostatek kapacity, aby se vrátil částečný návrh s chybějícími místy, ne mylná nemožnost;
- skutečný rozpor tvrdých pravidel, chybějící hraniční historii, časový limit a solver `UNKNOWN`;
- měsíce s různou délkou, přechod DST, neplatný nebo přetečený vstup;
- poškozenou odpověď, neznámé/duplicitní ID, timeout, nedostupnost runtime, neoprávněné volání a žádný tichý fallback;
- stejný vstup v opakovaném běhu, souběžná volání a škálu nejméně 100 zaměstnanců. Starý limit 200 zaměstnanců nepovažovat za schválený produktový strop.

Přidat Python závislosti a odpovídající Python job do CI tak, aby verze CI odpovídala ověřenému runtime. Samostatně spustit Python modelové testy, TypeScript unit/integration testy, lint, typecheck, build a Prisma validaci. Každý výsledek uvést podle toho, co skutečně pokrývá; testovaný solver sám neověřuje autentizaci, databázi ani celý uživatelský tok.

### 6. Integrované ověření celé cesty

V izolovaném lokálním prostředí a syntetickými daty projít celý tok jako přihlášený manažer:

1. zadání vstupů pro celý měsíc,
2. vyžádání návrhu z OR-Tools,
3. zobrazení návrhu, nedostatků a solverového stavu,
4. nezávislá validace s blokací `invalid` i `not_verified`,
5. výslovné potvrzení manažerem,
6. uložení snapshotu, potvrzeného plánu a auditu,
7. obnovení stránky a ověření, že data přetrvala a zdroj běhu je správně zaznamenán.

Otestovat i částečný návrh a jeho odmítnutí při potvrzení. Neprovádět to proti produkční Neon databázi ani skutečným zaměstnaneckým datům bez zvláštního schválení.

### 7. Porovnání, cutover a následný úklid

- Spustit OR-Tools a stávající Cloudflare provider na stejných syntetických scénářích pouze pro porovnání, ne pro dvojí běh s produkčními daty.
- Posoudit úplnost pokrytí, porušení po validaci, procento `FEASIBLE`/timeoutů, dobu běhu, chybové stavy a srozumitelnost částečných výsledků. Porovnání není hlasování modelů; autoritativní bude schválený OR-Tools tok.
- Cutover je přijatelný až po úspěchu bran 1–6, schváleném popisu soft preferencí a ověřeném preview průchodu. Poté nastavit OR-Tools jako explicitní výchozí měsíční provider.
- Cloudflare adaptér ponechat do potvrzení stability a čitelnosti historických běhů. Jeho odstranění, produkční migrace, nasazení a případné změny databáze jsou samostatné kroky podle `AGENTS.md`.

## Hlavní dotčené soubory při budoucí implementaci

Nejde o tvrzení, že všechny změny v nich jsou nutné; ověřit aktuální strom před prací.

| Oblast | Pravděpodobné místo |
| --- | --- |
| Python solver a testy | `scripts/monthly_solver.py`, `scripts/monthly_solver_test.py`, `scripts/requirements-monthly-solver.txt` — obnovení/úprava podle historie a současného kontraktu |
| TypeScript adaptér | `lib/planning/monthly-ortools-provider.ts` — obnovení a přizpůsobení online hostingu |
| Provider kontrakt a výběr | `lib/planning/monthly-planning.ts`, `monthly-runtime.ts`, `runtime-types.ts` |
| API a UI | `app/api/planning/monthly/`, `components/plan/` |
| Validace | `lib/planning/domain/month-validation.ts` a sousední testy |
| Persistování | `lib/planning/monthly-prisma-store.ts` a historie snapshotů |
| CI/runtime konfigurace | `.github/workflows/`, `vercel.json`, závislosti a případně funkční config |

## Kritéria dokončení výměny

Výměna je dokončena teprve tehdy, když OR-Tools běží v ověřeném cílovém online prostředí, je vybraný bez tichého fallbacku, umí vracet i poctivě označený částečný návrh, nezávislý validátor jej stále kontroluje, UI sděluje neúplnost a nejistotu, manažerské potvrzení zůstává povinné a syntetický celý tok od přihlášeného vstupu až po obnovení uloženého potvrzeného plánu projde.

Požadovaný výsledek není „solver vždy něco vrátí“ ani matematické optimum. Je to srozumitelný a přezkoumatelný návrh, bezpečné rozlišení neúplných podkladů, nedostatku kapacity, dokázané neproveditelnosti a timeoutu a žádné nechtěné potvrzení.
