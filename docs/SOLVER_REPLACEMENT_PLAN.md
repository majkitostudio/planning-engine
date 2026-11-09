# Plán výměny hlavního solveru

**Rozhodnutí uživatele:** 9. 11. 2026 obnovit OR-Tools jako hlavní solver měsíčního rozpisu.

**Stav:** `PLANNED` — implementace návratu ještě nezačala.

**Cíl:** jeden spolehlivý měsíční tok: manažer zadá podklady, solver sám hledá návrh, aplikace jej nezávisle ověří a manažer výslovně potvrdí.

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

**Brána 1 — hosting:** pokračovat s Vercel Python Function pouze po opakovatelném úspěšném sestavení a běhu v cílovém preview s přijatelnou rezervou času a velikosti. Pokud neprojde, předložit varianty hostování a nákladů k rozhodnutí; neimplementovat plný solver do neověřeného runtime.

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
