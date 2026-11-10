# Mapa projektu

Stručný přehled současné aplikace, ověřených doménových pravidel a toho, jak se projekt vyvíjel. Tento dokument nahrazuje roztroušené roadmapy, rozhodovací záznamy a archiv; časová osa je orientační a nenahrazuje aktuální kód.

## Co aplikace dělá

Plánovací Engine je nekomerční ukázková aplikace pro jednoho manažera call centra. Má sestavit použitelný rozpis na celý kalendářní měsíc. Manažer zadává zaměstnance, absence, dostupnost, potřebné obsazení a případné pokyny. Hlavním výsledkem má být samostatně vytvořený návrh, ne seznam kombinací, které musí manažer ručně hledat.

Projekt není hotový ani produkčně ověřený. Rozhodnutí z 9. 11. 2026 říká vrátit OR-Tools jako hlavní solver. Výměna je **IN_PROGRESS**: model a explicitně volitelný provider jsou implementovány a jednoduchý syntetický tok s perzistencí prošel; výchozí a produkční nastavení nebylo přepnuto. Cílovým hostováním zůstávají Vercel Hobby a stávající Neon Free.

## Tok aplikace

1. Manažer připraví vstupy pro celý měsíc.
2. Měsíční API předá vstupy vybranému provideru/solveru a uloží běh návrhu.
3. Nezávislá deterministická validace zkontroluje přiřazení, pravidla a dostupné návaznosti přes hranice týdne a měsíce.
4. Aplikace zobrazí návrh a výsledky kontrol. Neověřený či neplatný návrh nelze potvrdit.
5. Manažer návrh výslovně potvrdí; až pak se uloží potvrzený rozpis a auditní událost.

Samotné generování návrhu nic nemění na potvrzeném rozpisu. „Návrh“, „ověřený návrh“ a „potvrzené změny“ jsou samostatné stavy. Když solver nic nenajde nebo vyprší čas, není to samo o sobě důkaz, že řešení neexistuje.

## Hlavní části kódu

| Oblast | Umístění | Úloha |
| --- | --- | --- |
| Rozhraní | `components/plan/` | Měsíční formulář, tabulka rozpisu, průběh návrhu, kontrola a potvrzení. |
| Měsíční API | `app/api/planning/monthly/` | Spouští návrh a obsluhuje jeho kontrolu/potvrzení. Ověř přesné routy v aktuálním stromu. |
| Měsíční běh | `lib/planning/monthly-planning.ts`, `monthly-runtime.ts`, `runtime-types.ts` | Vstupní kontrakt, výběr režimu a orchestrace provideru. |
| Vstupy a pravidla | `lib/planning/domain/month-input.ts`, `month-validation.ts` | Normalizace měsíčních vstupů a nezávislá deterministická kontrola. |
| Měsíční provider | `lib/ai/cloudflare-planning-provider.ts` | Aktuálně implementovaný adaptér Workers AI; jeho produkční kvalita není prokázána. |
| Demo provider | `lib/planning/simulated/monthly-provider.ts` | Pevné fixture scénáře, nikoli skutečné plánování. |
| Persistování | `lib/planning/monthly-prisma-store.ts`, `prisma/` | Ukládání běhů, potvrzených plánů a souvisejících událostí. |
| Starší API a jádro | `app/api/planning/`, `lib/planning/` | Zůstaly i starší týdenní kontrakty, generické plánovací jádro a pravidla; týdenní obrazovka už není hlavním tokem. |
| Historický solver | Commit `f6d616d` odstranil měsíční OR-Tools soubory | Původní implementace je v historii Gitu; technické poznatky a její omezení shrnuje plán výměny. |

Umístění se může měnit; při implementaci vždy ověř aktuální soubory a volání. `IMPLEMENTED` samo o sobě neznamená, že cesta byla ověřena v celé aplikaci.

## Aktuální rozsah a pravidla

- Plánuje se jeden celý kalendářní měsíc; týdenní tabulka je pouze pohled do měsíce. Pilot je zaměřený na zaměstnance na plný úvazek.
- Potvrzené časy: ranní 07:45–16:30 každý den; odpolední ve všední den 13:15–21:00; víkendová odpolední 12:45–21:00.
- Pracovní den znamená kalendářní den s alespoň jednou směnou.
- Po šesti po sobě jdoucích pracovních dnech musí následovat alespoň 35 hodin nepřetržitého odpočinku.
- Pokud zaměstnanec pracuje o víkendu, má mít v témže týdnu pondělí–neděle dva dny volna; nemusí být sousední.
- Obsazení směn je konfigurovatelný vstup. Staré číselné hodnoty v testech nebo historii nejsou univerzální pravidlo.
- Schválená absence a výslovná nedostupnost vylučují přiřazení; překrývající se směny jsou neplatné.
- Částečný návrh lze zobrazit a prodiskutovat, ale nelze ho potvrdit. Chybějící historii na hranici měsíce zobraz jako upozornění a povol potvrzení jen tehdy, pokud není jiný neověřený nález ani problém. Rozpor v dostupných zdrojích a prokazatelné porušení pravidla zůstávají blokující.
- Volný text sám není deterministicky ověřená podmínka. Není schváleno konkrétní soft skóre ani matematická optimalita; nepřenášej historické váhy solveru jako produktové pravidlo.

Tyto body zachycují schválené požadavky, ne potvrzení, že všechny jsou správně implementovány. Rozsah pracovněprávních pravidel je omezen; tento projektový přehled není právní výklad.

## Stav řešení

- **Implementováno:** měsíční UI/API, Cloudflare adaptér, deterministický validátor, simulovaný provider, oddělené potvrzení a perzistence v Prisma režimu.
- **Částečně ověřeno:** některé izolované kontroly, syntetické běhy a dřívější lokální ověření databázového toku. Každý důkaz platí jen pro konkrétní prostředí a scénář.
- **Neověřeno:** opakovatelná kvalita aktuálního Cloudflare návrhu, plný online provoz celé cesty, produkční bezpečnost a připravenost pro běžné použití.
- **Rozpracováno:** návrat OR-Tools jako hlavního měsíčního solveru. Model, online HTTP hranice a klient prošly syntetickým ověřením a celý jednoduchý přihlášený tok prošel i ve Vercel Preview s oddělenou testovací databází; produkční zapnutí zůstává neprovedené. Podrobnosti jsou v plánu výměny.
- **Otevřeno:** zda bude AI někdy pouze převádět text do potvrditelných strukturovaných vstupů. Nesmí rozhodovat o přiřazení směn.

Stav je snímek dokumentačního úklidu z 9. 11. 2026. Před tvrzením o aktuálním stavu kontroluj implementaci, pracovní strom a odpovídající ověření.

## Stručná historie rozhodnutí

Historii lze dohledat přes uvedené commity a `git log`; starší jednotlivé zápisy ADR, audity, checklisty a archiv byly sloučeny do tohoto přehledu. Výčet vysvětluje směr, ale nezaručuje, že dnešní kód stále odpovídá původnímu commitu.

| Období | Co se změnilo a proč |
| --- | --- |
| 20.–21. 10. 2026 | Vytvořen Next.js/TypeScript základ a první návrh plánovače pro call centrum; projekt začal jako měsíční rozpisový nástroj. |
| 22.–25. 10. | Odděleno obecné plánovací jádro od domény; vznikl seznam rozhodnutí a validace vstupů i návrhu. Cílem bylo nepřivázat pravidla k UI/provideru. |
| 27.–29. 10. | Přidána API/orchestrace, simulované scénáře, Gemini adaptér, autentizace, role, perzistence, audit a konfigurace obsazení. Návrh zůstal oddělen od potvrzení manažerem. |
| 1.–2. 11. | Měsíční plánování se stalo hlavním tokem; přidána správa zaměstnanců a samostatné týdenní UI bylo odstraněno. Týdenní pohled zůstal uvnitř měsíce. |
| 3. 11. (`31c634d`) | Přidán OR-Tools CP-SAT měsíční solver v Pythonu a TypeScript adaptér. Strukturované vstupy vedly k deterministickému rozpisu; dřívější běh vytvořil návrh, ale chybějící historii hranice měsíce označil jako neověřenou. |
| 4.–5. 11. | Rozšířena kontrola historie a hranic měsíce, částečných vstupů, CI, syntetických scénářů, zabezpečení a provozních částí. Některé dřívější funkce později přestaly patřit do rozsahu pilotu. |
| 6. 11. (`cecb725`, `f6d616d`) | Zvolen Cloudflare Workers AI jako online měsíční plánovač a sjednoceno UI; lokální Python solver byl odstraněn, aby projekt neměl dvě paralelní hlavní implementace a lokální subprocess závislost. To vyřešilo záměr online volání, ne důkaz spolehlivosti AI plánování. |
| 7. 11. (`c886214`, `05021a2`) | Upřesněn cíl: manažer chce použitelný samostatně sestavený rozpis celého měsíce. Nevyžaduje se matematické optimum; neúspěch najít návrh se nesmí vydávat za důkaz nemožnosti. Pilot zúžen na celý měsíc a plné úvazky. |
| 9. 11. 2026 | Uživatel změnil směr: OR-Tools se má vrátit jako hlavní solver. Vznikl izolovaný model a proběhla dílčí syntetická měření; napojení a ověření celého online toku zbývá. |

Při starém OR-Tools pokusu byla optimalizační váha rotace směn a odchylky pracovního fondu pouze implementační volbou. Nesmí se znovu použít bez samostatného potvrzení. Starý solver také vynucoval přesné obsazení, což neodpovídá požadavku zobrazit neúplný, nepotvrditelný návrh; plán návratu tuto změnu výslovně řeší.

## Související dokument

- [Plán obnovení OR-Tools](SOLVER_REPLACEMENT_PLAN.md)
