# Návaznost směn a pokyny pro měsíční plán — architektonický a implementační plán

**Stav:** Návrh pro rozhodnutí, nikoli schválené chování nebo dokončená implementace. Tento dokument je samostatným zadáním pro Codex; aktuální kód a projektové instrukce mají při provádění přednost před historickými plány.

**Cíl:** Manažer vloží návazný rozpis z firemního rosteru, zkontroluje jej a použije jako podklad pro měsíční plán. Postupně může zadat běžným jazykem podporované preference, které se prokazatelně promítnou do návrhu.

**Architektura:** Lokální převod vložené tabulky → náhled a výslovně schválené podklady → měsíční OR-Tools plánovač → nezávislá kontrola → srozumitelný výsledek pro manažera. AI je zamýšlený pomocník při porozumění pokynům a vysvětlení; aktuálně není součástí běhu OR-Tools. Její zapojení a ochrana dat se řeší ve zvláštní etapě.

**Technologie:** Stávající Next.js, TypeScript, PostgreSQL/Prisma, lokální Python OR-Tools a Vitest; nepřidávat integraci s rosterem ani nové knihovny bez důvodu.

## Hranice a rozhodnutí před implementací

- Měsíční návrh pro celý kalendářní měsíc a týdenní pohled zůstávají aktuálním pravidlem. **OTEVŘENÉ:** Má manažer vložit již hotovou první polovinu měsíce a doplánovat jen zbytek, nebo se celý měsíc stále sestavuje znovu? Nenavrhovat ani neimplementovat částečný měsíc jako schválené chování bez odpovědi. Vložená historie mimo měsíc tento problém sama neřeší.
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
4. Nový návrh použije vhodné jednoznačné podklady. Při chybějících, rozporných či nepokrytých údajích ukáže přesný důvod; nevyrobí si náhradní směny.
5. Nezávislá validace použije stejné zdroje, ale pravidla kontroluje samostatně. Při pozdější změně podkladů se návrh znovu zkontroluje i na serveru před případným potvrzením.

## Etapa A — formát a bezpečný převod

**Cíl:** Zjistit skutečný formát kopírování a převést jej bez tichého domýšlení. Nevyžaduje přístup k zápisu do rosteru.

**Soubory:** nové `lib/planning/roster-import.ts` a `lib/planning/roster-import.test.ts`; další soubory jen dle zjištěného formátu.

- [ ] Na uživatelem otevřené stránce ověřit způsob kopírování a hlavičky bez stahování, předávání nebo ukládání reálných osobních údajů. Příklady pro testy přepsat výhradně na smyšlené osoby. Pokud kopírování neposkytne jednoznačná data, zaznamenat omezení a navrhnout náhradní ruční vstup.
- [ ] Definovat strukturu náhledu: období, řádky se spárovaným ID, den a stav `shift` s přesnými časy / `off` / `unknown`, zdrojová buňka pouze v paměti náhledu a seznam chyb. Formát data převzít jen z ověřené hlavičky, rok nehádat.
- [ ] Nejprve napsat testy a spustit je s očekávaným selháním: více dnů a zaměstnanců; výslovné volno; prázdná buňka jako neznámá; různé časové intervaly; neplatné datum; duplicitní řádek; jméno s diakritikou; žádná shoda a více shod. Automatické párování jen při jednoznačné shodě; ostatní rozhodne manažer.
- [ ] Implementovat čistý převod a spustit `npm test -- --run lib/planning/roster-import.test.ts`. Předat přesné původní časy; nepřevádět neznámé nebo zkrácené směny na schválené časy bez rozhodnutí manažera.

## Etapa B — uložení podkladů a zdroje pravdy

**Cíl:** Výslovně ověřené podklady bezpečně uchovat a rozhodovat o úplnosti po osobách a dnech.

**Soubory:** `prisma/schema.prisma`, nová Prisma migrace, nové `lib/planning/roster-history-store.ts` a odpovídající testy; `lib/planning/domain/month-history.ts`, `lib/planning/monthly-history-service.ts` a jejich testy.

- [ ] Nejprve sepsat testy pro úplnost: den s výslovným volnem se započte jako známý, chybějící buňka nikoli; nový zaměstnanec nesmí získat zpětně vymyšlené volno; přesun času ani duplicita nesmějí projít tiše.
- [ ] Navrhnout model převzatého období a jednotlivých záznamů tak, aby uchovával rozsah, osobu, datum, známý stav, přesné časy, zdroj, autora, čas uložení a verzi. Neudržovat surový text rosteru déle, než je potřebné k náhledu. Nesměšovat převzetí podkladů s potvrzením rozpisu.
- [ ] Určit pravidlo konfliktů: při překryvu dvou rozdílných zdrojů žádný tiše nevyhrává; podklad je nejednoznačný, manažer dostane možnost věc opravit. Stejný či opakovaný import nesmí vytvářet zavádějící duplicity. Nemazat historii potvrzených plánů.
- [ ] Rozšířit načítání návazností o jednoznačné uložené podklady, zachovat existující potvrzené rozpisy a znovu prověřit podklady při obnově, nové kontrole i pokusu o potvrzení. Změnit kontrakt návazností, jen pokud věrně zachová přesné časy; jiné než potvrzené typové intervaly nesmějí být tiše nahrazeny.
- [ ] Ověřit testy `npm test -- --run lib/planning/domain/month-history.test.ts lib/planning/monthly-history-service.test.ts` a `npm run db:validate`. Migrace a transakční zápisy ověřovat pouze v prostředí výslovně určeném pro bezpečné ověření; nemigrovat existující skutečnou databázi bez výslovného schválení cíle.

## Etapa C — stránka a srozumitelná návaznost

**Soubory:** `components/app-shell.tsx`, nová stránka `app/(app)/navaznost-smen/page.tsx`, nový `components/roster-history-panel.tsx`, navazující API v `app/api/planning/` a testy podle existujících konvencí.

- [ ] Přidat stránku do hlavní navigace. Vytvořit vstupní pole pro vložení, výběr období, čitelný náhled a opravu nespárovaných či nerozpoznaných údajů. Čtení a ukládání omezit podle stávajícího přístupu a serverově vynutit práva manažera pro zápis.
- [ ] Přidat souhrn počtu známých/neznámých dní a jednoznačný krok uložení podkladů. Změna zaměstnance, data nebo času musí zneplatnit starý náhled; zrušení nesmí nic zapsat.
- [ ] V měsíčním formuláři ukázat, které potřebné okolní podklady jsou k dispozici a které chybí. Vysvětlit, že budoucí rozpis nemusí být známý; nikdy nenabízet vymyšlení historie jako její doložení.
- [ ] Ověřit oprávnění, chybný vstup, neúplný náhled, znovunačtení a konflikt dvou importů. Browser ověření provést se smyšlenými daty pouze způsobem, který nezasáhne skutečná data; pokud to nelze bezpečně zajistit, uvést omezení.

## Etapa D — preference střídání a nezávislé vyhodnocení

**Soubory:** `lib/planning/domain/month-input.ts`, `lib/planning/monthly-form.ts`, `lib/planning/monthly-ortools-provider.ts`, `scripts/monthly_solver.py`, `lib/planning/domain/month-validation.ts`, příslušné testy.

- [ ] Před zavedením chování rozhodnout s manažerem význam: střídání mezi následujícími pracovními směnami i přes volno, nebo pouze v sousedních dnech; zda jde o povinnost, nebo preferenci. **Doporučení:** preference, která ustupuje platným pravidlům a obsazení; toto doporučení není schválené pravidlo.
- [ ] V testech popsat zvolený význam na malém měsíci: střídání je možné; pokrytí vyžaduje výjimku; mezera kvůli volnu; přechod měsíce se známou i chybějící historií. Ověřit, že povinné absence, odpočinek a obsazení mají přednost a výjimka je zobrazena.
- [ ] Přidat výslovný strukturovaný vstup preference a odpovídající optimalizační cíl do lokálního solveru; absence zadání musí zachovat dnešní chování. Výsledek `FEASIBLE` při časovém limitu nesmí být nazván optimálním; `UNKNOWN` není důkaz neproveditelnosti.
- [ ] Nezávisle spočítat a zobrazit porušení preference bez osobních údajů v logu; pokud pro vyhodnocení chybí okolní směna, označit pouze dotčený úsek jako neověřený. Textové pokyny nepovažovat za vyhodnocené, dokud tuto vazbu skutečně nepoužijí.
- [ ] Spustit relevantní Vitest testy a `.venv\Scripts\python.exe -m unittest discover -s scripts -p monthly_solver_test.py`; přidat test pro konflikt, přesnou návaznost a dostupnost solveru.

## Etapa E — AI jako prostředník

**Soubory:** samostatný serverový překladač pokynů a testy v `lib/planning/`; případné změny měsíčního endpointu a formuláře. Konkrétního poskytovatele nepovažovat předem za schváleného pro reálná data.

- [ ] Vymezit malý seznam podporovaných významů, počínaje střídáním z etapy D. AI vrací pouze navržený strukturovaný význam, nikoli kód nebo samovolně vytvořené tvrdé pravidlo. Neznámý či nejednoznačný pokyn vrátí jako nevyhodnocený nebo dotaz.
- [ ] Manažer před spuštěním vidí, co aplikace pochopila a zda jde o přání či povinnost; může význam opravit. Preference se předá solveru jen po odsouhlasení správného výkladu. Nezávislá kontrola ověří podporovanou preferenci samostatně, nikoli na základě tvrzení AI.
- [ ] Před externím voláním dořešit cílovou službu, rozsah dat, ochranu, oprávnění a výslovné schválení. Stávající nahrazování jmen aliasy není zárukou odstranění všech osobních informací z volného textu. Při nedostupnosti AI nesmí aplikace předstírat splnění pokynu ani tiše přepnout poskytovatele.
- [ ] Testovat záměnu jmen, vymyšlené pravidlo, nejednoznačný pokyn, nepodporovaný požadavek, chybný výstup a nedostupnost služby; žádná reálná data nebo volné texty neposílat externí AI během vývoje bez výslovného schválení.

## Etapa F — úpravy rozhraní podle anotací

**Zdroj úkolů:** `docs/ROADMAP.md`, část „To-Do: Zjednodušit rozhraní pro manažera“; relevantní soubory zahrnují `components/plan/monthly-planning-panel.tsx`, `components/plan/plan-workspace.tsx`, `components/employees-manager.tsx`, `app/(app)/page.tsx` a stránku nastavení.

- [ ] Nahradit kódy stavů a názvy vnitřních nástrojů krátkými srozumitelnými výsledky, konkrétními problémy a chybějícími podklady; manažer musí vidět, zda se pokyn skutečně použil.
- [ ] Podle anotací odstranit ruční úpravu návrhu z obrazovky, výběr simulovaného scénáře a ukázkové přehledy; upřesnit podobu odstranění ovládání potvrzení tak, aby zůstaly zachovány nezávislé serverové blokátory a žádná změna se nepotvrdila automaticky.
- [ ] Opravit čitelnost tlačítek a vzhled správy zaměstnanců. Odstranit označené technické texty z přehledu a nastavení. Návrh věty „Dostupnost: dle zadaných pravidel a pokynů“ použít pouze pokud pravdivě odpovídá skutečnému vyhodnocení pokynů; do té doby srozumitelně popsat dostupnost a omezení pokynů.
- [ ] Ověřit ovládání klávesnicí, čitelnost a zobrazení na šířkách odpovídajících anotacím. Nemanipulovat se skutečnými zaměstnanci ani s potvrzením rozpisu.

## Závěrečné ověření a předání

- [ ] Spustit `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run db:validate` a relevantní Python testy; zaznamenat skutečné výsledky a přeskočené testy.
- [ ] Prověřit simulované vstupy z rosteru, nejednoznačné párování, překrývající se zdroje, neznámé versus volno, časovou návaznost, nedostupnost AI a solveru, chybějící budoucí podklady a ochranu potvrzení.
- [ ] Aktualizovat jeden relevantní autoritativní dokument pro každé změněné rozhodnutí a odkazy na něj; rozlišit `PLANNED`, `IMPLEMENTED` a `VERIFIED`. Zkontrolovat diff a neznámé výstupy, zachovat existující nesledované podklady.
- [ ] Commitovat samostatné ucelené a ověřené kroky podle projektových pravidel. Neprovádět produkční migraci, export, přenos osobních údajů externí AI, potvrzení reálného rozpisu ani nasazení bez příslušného výslovného schválení.

## Rozhodnutí k potvrzení před závislou prací

1. **Rozsah měsíce:** doplánování posledních 14–15 dní při zachování vložené první části, nebo návrh celého měsíce s historií mimo měsíc? Částečný měsíc ovlivní vstupy, obsazení, pravidla, kontrolu, výsledek a potvrzení.
2. **Střídání:** co znamená při vloženém volnu a zda je povinné, či přednostní přání. Dokud není rozhodnuto, nezavádět tvrdé pravidlo.
3. **Neznámá budoucnost:** jaký manažerský postup umožnit, když rozpis po plánovaném měsíci ještě neexistuje. Zachovat neověřený stav a stávající omezení potvrzení, dokud není schváleno bezpečné řešení.
4. **Data a AI:** zda a za jakých konkrétních podmínek smí být externí služba použita. Bez toho pracovat pouze lokálně a s umělými příklady.

Provedení zadání má probíhat po etapách, samostatně a bez nasazování dalších agentů, pokud je uživatel výslovně nevyžádá. Rozhodnutí 1–4 blokují pouze kroky, které na nich závisejí; nebrání předchozí analýze a nezávislým úpravám.
