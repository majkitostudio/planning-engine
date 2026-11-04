# Návaznost směn a pokyny pro měsíční plán — architektonický a implementační plán

**Stav:** Uživatel schválil provedení plánu; jednotlivé kroky níže rozlišují dokončené, ověřené a dosud otevřené části. Tento dokument je zadáním pro Codex; aktuální kód a projektové instrukce mají při provádění přednost před historickými plány.

**Cíl:** Manažer vloží návazný rozpis z firemního rosteru, zkontroluje jej a použije jako podklad pro měsíční plán. Postupně může zadat běžným jazykem podporované preference, které se prokazatelně promítnou do návrhu.

**Architektura:** Lokální převod vložené tabulky → náhled a výslovně schválené podklady → měsíční OR-Tools plánovač → nezávislá kontrola → srozumitelný výsledek pro manažera. AI je zamýšlený pomocník při porozumění pokynům a vysvětlení; aktuálně není součástí běhu OR-Tools. Její zapojení a ochrana dat se řeší ve zvláštní etapě.

**Technologie:** Stávající Next.js, TypeScript, PostgreSQL/Prisma, lokální Python OR-Tools a Vitest; nepřidávat integraci s rosterem ani nové knihovny bez důvodu.

## Hranice a rozhodnutí před implementací

- **ROZHODNUTO:** Manažer může doplánovat jen část měsíce. Například vloží hotový začátek listopadu a aplikace navrhne zbytek. Existující celoměsíční tok zůstává dostupný a týdenní tabulka je pohledem na měsíc. Vložené směny mimo zvolený úsek návrhu se nesmějí tiše přepisovat; návaznosti i měsíční výsledek se kontrolují jako celek.
- **ROZHODNUTO:** Střídání ranních a odpoledních směn je přání, nikoli povinné pravidlo. Aplikace se jej snaží splnit při zachování závazných pravidel a požadovaného obsazení a přizná výjimky.
- Příklad: pro listopad lze vložit známý konec října. To pomůže s návazností na začátku listopadu, ale samo nedoloží začátek prosince ani dřívější část listopadu jako závaznou pro návrh.
- Výchozí dostupnost vybraných zaměstnanců zůstává zachována; schválená absence a výslovná nedostupnost mají přednost. Údaje z rosteru nepovažovat za změnu pravidel dostupnosti nebo za novou absenci.
- Úplnost podkladů nepředpokládat: neznámý údaj není volno. Platný, neúplný a neověřený stav se nesmějí sloučit. Zachovat serverové ověření, blokátory a výslovné rozhodnutí manažera; změna textu či skrytí tlačítka není zrušení pravidel.
- Podklady z rosteru jsou citlivé. Neposílat skutečná jména ani volný text externí AI bez schválené ochrany dat; názvy, časové údaje či samotná pseudonymizace nejsou zárukou anonymity. Žádné reálné údaje v testech, logu, commitu ani příkladech.
- Toto není požadavek na produkční nasazení, novou autentizaci ani automatickou synchronizaci s firemním rosterem. Uživatel požádal o následné ověřování v používané aplikaci; automatické testy a vývojové příklady přesto nesmějí zapisovat smyšlené údaje do skutečných zaměstnaneckých záznamů.

## Výchozí stav ověřený v kódu

- `components/app-shell.tsx` zobrazuje hlavní navigaci; formulář a výsledek jsou v `components/plan/monthly-planning-panel.tsx`.
- `lib/planning/monthly-history-service.ts` načítá potvrzené týdenní a měsíční záznamy. `lib/planning/domain/month-history.ts` skládá podklady za sedm dní na každé straně měsíce a nejasné překryvy označuje jako neúplné.
- `lib/planning/monthly-ortools-provider.ts` předává lokálnímu plánovači anonymní technické identifikátory a strukturované podklady, nikoli text pokynů. `scripts/monthly_solver.py` sestavuje řešení, jehož kontrolu provádí `lib/planning/domain/month-validation.ts`.
- `lib/ai/gemini-planning-provider.ts` obsahuje alternativní AI provider; aktuální měsíční endpoint vybírá jednoho poskytovatele, nikoli propojení AI a OR-Tools. Kvalita AI výstupů pro reálný provoz není ověřena.
- Zpětná vazba k obrazovkám je evidovaná v `docs/ROADMAP.md` v části To-Do; není tímto dokumentem označena za hotovou.

## Cílový tok

1. Manažer zvolí období, zkopíruje z rosteru příslušný výřez a vloží jej na stránku **Návaznost směn**.
2. Aplikace zobrazí rozpoznané dny, zaměstnance, konkrétní směny, výslovné volno a nejasnosti. Manažer opraví párování a potvrdí, jaké dny a osoby podklady opravdu pokrývají; aplikace odmítne rozpory a nezakryje nerozpoznané buňky.
3. Uložení znamená schválení převzatých **podkladů**, nikoli potvrzení nového návrhu nebo změnu docházky. V historii zůstává zdroj a rozsah záznamu.
4. Manažer zvolí celý měsíc nebo jeho část. Při doplánování části zůstanou převzaté směny ve zbývající části měsíce zachované; návrh je použije jako pevný podklad a nové směny vytvoří pouze ve zvoleném úseku. Při chybějících, rozporných či nepokrytých údajích ukáže přesný důvod; nevyrobí si náhradní směny.
5. Nezávislá validace použije stejné zdroje, ale pravidla kontroluje samostatně. Při pozdější změně podkladů se návrh znovu zkontroluje i na serveru před případným potvrzením.

## Etapa A — formát a bezpečný převod

**Cíl:** Zjistit skutečný formát kopírování a převést jej bez tichého domýšlení. Nevyžaduje přístup k zápisu do rosteru.

**Soubory:** nové `lib/planning/roster-import.ts` a `lib/planning/roster-import.test.ts`; další soubory jen dle zjištěného formátu.

- [x] Ověřit uživatelem poskytnutý export bez vypisování nebo ukládání skutečných osobních údajů. Export je UTF-8 se středníky; hlavička uvádí číslo dne a českou zkratku dne v týdnu, nikoli měsíc ani rok. Příklady pro testy jsou výhradně syntetické.
- [x] Definovat strukturu náhledu: období zvolí manažer a hlavička se proti němu ověří; řádky se spárovaným ID; stavy `shift` s přesnými časy / `off` / `unknown`; zdrojová buňka je pouze v paměti náhledu.
- [x] Napsat syntetické testy pro více dnů, volno, prázdné a nepodporované buňky, vlastní intervaly, neplatný čas, diakritiku a jednoznačné/nejednoznačné párování. Duplicitní řádek export zastaví.
- [x] Implementovat převod CSV a spustit `npm test -- --run lib/planning/roster-import.test.ts`. Neznámé stavy (včetně dovolené a nemoci) se automaticky nepřevádějí na volno ani schválenou absenci.

## Etapa B — uložení podkladů a zdroje pravdy

**Cíl:** Výslovně ověřené podklady bezpečně uchovat a rozhodovat o úplnosti po osobách a dnech.

**Soubory:** `prisma/schema.prisma`, nová Prisma migrace, nové `lib/planning/roster-history-store.ts` a odpovídající testy; `lib/planning/domain/month-history.ts`, `lib/planning/monthly-history-service.ts` a jejich testy.

- [x] Testy pokrývají výslovné volno, neznámou buňku, nového zaměstnance, přesné časy, shodné překryvy a rozporné zdroje.
- [x] Prisma model a migrace uchovávají období, osobu, datum, známý stav, přesné časy, zdroj, autora, čas uložení a verzi. Surový text rosteru se do databáze neposílá.
- [x] Shodné překryvy se sloučí, konfliktní záznamy zůstanou neúplné, opakovaný identický import je idempotentní a potvrzené rozpisy se nemažou.
- [x] Načítání návazností používá nejnovější verzi stejného rozsahu, zachovává starší potvrzené plány a při validaci přenáší přesné časy. Kontrola se opakuje i při potvrzení.
- [x] Spuštěny `npm test -- --run lib/planning/domain/month-history.test.ts lib/planning/monthly-history-service.test.ts` a `npm run db:validate`; transakce jsou pokryté unit testy. Migrace nebyla aplikována na databázi, protože nebyl určen bezpečný cílový systém.

## Etapa C — stránka a srozumitelná návaznost

**Soubory:** `components/app-shell.tsx`, nová stránka `app/(app)/navaznost-smen/page.tsx`, nový `components/roster-history-panel.tsx`, navazující API v `app/api/planning/` a testy podle existujících konvencí.

- [x] Přidat stránku do hlavní navigace. Podporuje vložení i výběr staženého CSV, výběr období, náhled, opravy párování a ruční kontrolu neznámých buněk. Zápis je omezen na manažera serverově.
- [x] Přidat počty směn/volna/neznámých buněk a samostatné uložení podkladů. Změna měsíce nebo vloženého textu zneplatní náhled; opravy párování, stavu a času jsou výslovnou součástí zkontrolovaného náhledu. Zrušení nic nezapisuje.
- [x] V měsíčním formuláři ukázat stav sedmi okolních dnů; neznámou budoucnost ponechat neověřenou a odkázat na stránku návaznosti.
- [x] Testy ověřují oprávnění, chybný vstup, neúplný náhled, znovunačtení a konfliktní/opakované importy. Prohlížeč ověřil náhled syntetického CSV bez ukládání; uložený průchod zůstává `NOT VERIFIED`, protože v prostředí není dostupná databáze.

### Doplnění části měsíce

- [x] Rozšířit měsíční vstup o výslovný souvislý rozsah návrhu uvnitř zvoleného měsíce. Bez zadaného rozsahu zachovat celý měsíc. Prověřit vstup, API, uložení verze, zobrazení a obnovu návrhu.
- [x] Převzaté směny mimo rozsah předat plánovači jako pevné podklady; návrh je nesmí měnit. Údaje uvnitř rozsahu se nesmějí tiše přepsat: při překryvu s již vloženými směnami předložit manažerovi konflikt a požadovat jeho vyřešení.
- [x] Nezávisle zkontrolovat celý výsledný měsíc včetně přechodu mezi převzatou a doplánovanou částí a hranic měsíce. Neznámý zbytek měsíce nezobrazovat jako ověřené volno; potvrzení se řídí stávajícími bezpečnostními podmínkami.
- [x] Testy: doplánování posledních 14–15 dní, zachování vložené první části, chybějící vstup, konflikt s existující směnou, odpočinek a víkendové volno přes hranici částí, nedostatečné obsazení a chybějící okolní historie. Ověřit, že původní tok pro celý měsíc funguje beze změny.

## Etapa D — preference střídání a nezávislé vyhodnocení

**Soubory:** `lib/planning/domain/month-input.ts`, `lib/planning/monthly-form.ts`, `lib/planning/monthly-ortools-provider.ts`, `scripts/monthly_solver.py`, `lib/planning/domain/month-validation.ts`, příslušné testy.

- [x] Zavést střídání jako schválenou preferenci, která ustupuje závazným pravidlům a obsazení. Uživatel rozhodl porovnávat sousední pracovní směny i přes volno.
- [x] Testy pokrývají střídání, nutnou výjimku, dny volna a návaznost přes hranici měsíce; závazné kontroly mají přednost.
- [x] Strukturovaný přepínač a měkký cíl jsou v lokálním solveru; nezadaná preference zachová dnešní chování.
- [x] Validace nezávisle vyhodnocuje typy směn; vlastní čas z historie nepřevádí na ranní/odpolední a zobrazí neblokující nález.
- [x] Spuštěny Vitest i Python testy solveru; `FEASIBLE`/`UNKNOWN` jsou odlišeny.

## Etapa E — AI jako prostředník

**Soubory:** samostatný serverový překladač pokynů a testy v `lib/planning/`; případné změny měsíčního endpointu a formuláře. Konkrétního poskytovatele nepovažovat předem za schváleného pro reálná data.

- [ ] Vymezit malý seznam podporovaných významů, počínaje střídáním z etapy D. AI vrací pouze navržený strukturovaný význam, nikoli kód nebo samovolně vytvořené tvrdé pravidlo. Neznámý či nejednoznačný pokyn vrátí jako nevyhodnocený nebo dotaz.
- [ ] Manažer před spuštěním vidí, co aplikace pochopila a zda jde o přání či povinnost; může význam opravit. Preference se předá solveru jen po odsouhlasení správného výkladu. Nezávislá kontrola ověří podporovanou preferenci samostatně, nikoli na základě tvrzení AI.
- [ ] Před externím voláním dořešit cílovou službu, rozsah dat, ochranu, oprávnění a výslovné schválení. Stávající nahrazování jmen aliasy není zárukou odstranění všech osobních informací z volného textu. Při nedostupnosti AI nesmí aplikace předstírat splnění pokynu ani tiše přepnout poskytovatele.
- [ ] Testovat záměnu jmen, vymyšlené pravidlo, nejednoznačný pokyn, nepodporovaný požadavek, chybný výstup a nedostupnost služby; žádná reálná data nebo volné texty neposílat externí AI během vývoje bez výslovného schválení.

## Etapa F — úpravy rozhraní podle anotací

**Zdroj úkolů:** `docs/ROADMAP.md`, část „To-Do: Zjednodušit rozhraní pro manažera“; relevantní soubory zahrnují `components/plan/monthly-planning-panel.tsx`, `components/plan/plan-workspace.tsx`, `components/employees-manager.tsx`, `app/(app)/page.tsx` a stránku nastavení.

- [x] Nahradit kódy stavů a názvy vnitřních nástrojů krátkými srozumitelnými výsledky, konkrétními problémy a chybějícími podklady; manažer vidí, zda plánovač pokyny vyhodnotil. Tvrzení AI je výslovně označeno jako nezávisle neověřené.
- [x] Odstranit ruční úpravu návrhu z obrazovky, výběr simulovaného scénáře a ukázkové přehledy. Zůstává jedno výslovné potvrzení manažerem; serverové blokátory jsou zachované a automatické potvrzení neexistuje.
- [x] Zlepšit čitelnost tlačítek a správy zaměstnanců, odstranit technické texty z přehledu a nastavení a pravdivě uvést, že lokální plánovač pokyny nevyhodnocuje.
- [x] Ověřit ovládání klávesnicí, čitelnost a zobrazení při 390×844 a 1280×900 px. Náhled rosteru se ovládá klávesnicí; test používal jen syntetická data a nic neukládal ani nepotvrzoval.

## Závěrečné ověření a předání

- [x] Spustit `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run db:validate` a relevantní Python testy; zaznamenat skutečné výsledky a přeskočené testy do autoritativní specifikace.
- [x] Prověřit simulované vstupy z rosteru, nejednoznačné párování, překrývající se zdroje, neznámé versus volno, časovou návaznost, nedostupnost AI a solveru, chybějící budoucí podklady a ochranu potvrzení. Testy používají syntetická data; databázový průchod zůstává `NOT VERIFIED`.
- [x] Aktualizovat jeden relevantní autoritativní dokument pro každé změněné rozhodnutí a odkazy na něj; rozlišit `PLANNED`, `IMPLEMENTED` a `VERIFIED`. Zkontrolovat diff a neznámé výstupy, zachovat existující nesledované podklady.
- [ ] Commitovat samostatné ucelené a ověřené kroky podle projektových pravidel. Neprovádět produkční migraci, export, přenos osobních údajů externí AI, potvrzení reálného rozpisu ani nasazení bez příslušného výslovného schválení.

## Rozhodnutí k potvrzení před závislou prací

1. **Střídání přes volno:** porovnávat následující pracovní směny i přes den volna, nebo pouze směny v sousedních dnech? Charakter přání už je rozhodnutý.
2. **Neznámá budoucnost:** jaký manažerský postup umožnit, když rozpis po plánovaném měsíci ještě neexistuje. Zachovat neověřený stav a stávající omezení potvrzení, dokud není schváleno bezpečné řešení.
3. **Data a AI:** zda a za jakých konkrétních podmínek smí být externí služba použita. Bez toho pracovat pouze lokálně a s umělými příklady.

Provedení zadání má probíhat po etapách, samostatně a bez nasazování dalších agentů, pokud je uživatel výslovně nevyžádá. Otevřená rozhodnutí blokují pouze kroky, které na nich závisejí; nebrání předchozí analýze a nezávislým úpravám.
