# Planning Engine — předání kontextu pro Claude

Tento dokument je orientační mapa projektu pro další analýzu a spolupráci. Zachycuje stav místního checkoutu k **9. 11. 2026** a historii dostupnou v lokální větvi `main` / `origin/main`. Nejde o nové schválení architektury ani o tvrzení, že je aplikace připravená pro produkci. Aktuální dokumentaci od 9. 11. 2026 udržuje rozcestník [`docs/README.md`](README.md); tento commitový přehled je časový snímek.

## Co projekt řeší

Planning Engine je nekomerční ukázková aplikace pro jednoho manažera call centra. Cílem je, aby manažer zadal lidi, potřebné obsazení směn, absence, dostupnost a případné pokyny a dostal použitelný návrh rozpisu na celý kalendářní měsíc. Hlavní produktový výsledek je automaticky sestavený návrh; nechceme pouze převést ruční skládání kombinací na manažera. Manažer přezkoumá návrh a sám ho potvrdí.

Aktuální pilot míří na zaměstnance na plný úvazek a jeden celý kalendářní měsíc. Týdenní tabulka je pohled do měsíčního plánu. Projekt je rozpracovaný technický základ s demo UI, ne hotový nebo produkčně ověřený systém.

## Jak je aplikace poskládaná

```text
Manažer a měsíční vstupy
        ↓
Měsíční API a orchestrátor
        ↓
Vybraný poskytovatel návrhu (dnes Cloudflare AI; také explicitní simulace)
        ↓
Nezávislá deterministická validace celého návrhu
        ↓
Uložený návrh a jeho stav / zjištění
        ↓
Kontrola manažerem → výslovné potvrzení → persistence a audit
```

Poskytovatel sestavuje návrh; nenahrazuje validátor ani rozhodnutí manažera. Návrh, návrh s ověřenými kontrolami a potvrzený rozpis jsou různé stavy. Chybějící podklady znamenají `not_verified`, nikoli automaticky chybný plán ani úspěšnou kontrolu. Neúplný či neověřený návrh se nesmí potvrdit. Provider se při chybě nebo vyčerpané kvótě tiše nemění; simulovaný scénář lze spustit pouze výslovně a musí být označen jako simulace.

### Současné vrstvy kódu

| Oblast | Kde ji hledat | Účel |
| --- | --- | --- |
| Aplikační stránky a API | `app/`, zejména `app/api/planning/monthly/` | Next.js App Router, měsíční návrh, opětovná kontrola a potvrzení. Starší týdenní API zůstává, ale samostatná týdenní obrazovka byla odstraněna. |
| Manažerské UI | `components/plan/` | Měsíční formulář, tabulka rozpisu, běhy a pracovní plocha. |
| Doménový model a pravidla | `lib/planning/domain/` | Typy, vstupy a deterministické kontroly včetně měsíčních návazností. |
| Měsíční plánovací tok | `lib/planning/monthly-planning.ts`, `monthly-runtime.ts`, `provider-factory.ts` | Provider-neutral kontrakt, spuštění, validace návrhu a volba poskytovatele. |
| AI adaptéry | `lib/ai/cloudflare-planning-provider.ts`, `lib/ai/gemini-planning-provider.ts` | Cloudflare je současný měsíční provider; Gemini zůstává starší adaptér. Přítomnost adaptéru sama o sobě nedokazuje kvalitu plánů. |
| Ukázkové výsledky | `lib/planning/simulated/` | Pevné demo scénáře; nejsou to výsledky živého plánování. |
| Ukládání a audit | `lib/planning/monthly-prisma-store.ts`, `lib/planning/monthly-history-service.ts`, `prisma/` | Měsíční běhy, potvrzené rozpisy, historie a provozní databázové modely. |
| Přihlášení a role | `auth.ts`, `proxy.ts`, `lib/auth/` | Lokální MVP přihlášení a role. Produkční zabezpečení není ověřeno; Entra zůstává budoucí možnost. |
| Rozhodnutí a aktuální stav | `AGENTS.md`, `docs/DOMAIN_DECISIONS.md`, `docs/DOMAIN_SPECIFICATION.md`, `docs/ROADMAP.md`, `docs/adr/` | Pravidla projektu, stav ověření a zaznamenaná rozhodnutí. Při rozporu je nejdřív potřeba porovnat aktuální kód, dokumentaci a testy. |

## Potvrzené plánovací vstupy a pravidla

- Ranní směna: **07:45–16:30** ve všední dny i o víkendu.
- Odpolední směna: **13:15–21:00** ve všední den, **12:45–21:00** o víkendu.
- Pracovní den znamená kalendářní den s alespoň jednou směnou. Po šesti pracovních dnech za sebou musí následovat nejméně 35 hodin souvislého odpočinku.
- Kdo pracuje o víkendu, má mít v témže týdnu dva dny volna. Týden je pondělí až neděle; dny volna nemusí být po sobě.
- Absence a výslovná nedostupnost brání přiřazení. Překryvy směn jsou neplatné. Potřebné obsazení je vstup manažera, nikoli univerzální historická konstanta.
- Dostupná historie předchozího a následujícího období je důležitá pro návaznosti. Pokud chybí, dotčené kontroly zůstávají neověřené.
- Pracovní fond je neblokující kontrola/optimalizační hledisko, ne potvrzené tvrdé pravidlo. Přestávky ani právní výpočet odpracované doby nejsou samostatně modelované.
- Volný text je pokyn či preference, ne automaticky tvrdé ověřitelné pravidlo. Střídání ranní/odpolední má podporu jako preference S6; obecné porozumění libovolnému textu není prokázáno.

Podrobnosti a otevřené otázky jsou v `docs/DOMAIN_SPECIFICATION.md` a `docs/DOMAIN_DECISIONS.md`. Nepřidávej pravidla podle intuice.

## Vývojová mapa z commitů

Repozitář podle GitHubu obsahuje 249 commitů. Níže jsou hlavní milníky, ne úplný seznam. Odkazy míří přímo na konkrétní commit v [GitHub repozitáři](https://github.com/majkitostudio/planning-engine). Jde o historii vývoje; starší implementace nejsou automaticky aktuální rozhodnutí.

| Datum a commit | Co se udělalo | Proč / co to změnilo |
| --- | --- | --- |
| 20.–21. 10. — [`e337855`](https://github.com/majkitostudio/planning-engine/commit/e337855), [`4fa9191`](https://github.com/majkitostudio/planning-engine/commit/4fa9191) | Základ Next.js/TypeScriptu a návrh domény plánovače call centra. | Nejprve se ustavil technický základ a pojmenoval problém a vstupy, které má plánovač řešit. |
| 22.–25. 10. — [`6a87839`](https://github.com/majkitostudio/planning-engine/commit/6a87839), [`7a57454`](https://github.com/majkitostudio/planning-engine/commit/7a57454) | Vzniklo doménově nezávislé plánovací jádro, řízení pravidel, hlubší validace vstupů a dvouvrstvá kontrola návrhu s testy. | Cílem bylo oddělit společný běh pravidel od konkrétní domény a chytat nekonzistentní vstupy ještě před plánováním. |
| 27.–28. 10. — [`0a46b0b`](https://github.com/majkitostudio/planning-engine/commit/0a46b0b), [`5d72f97`](https://github.com/majkitostudio/planning-engine/commit/5d72f97) | Přibylo plánovací API se simulovaným providerem a Gemini adaptér s omezeným doménovým promptem. | Rozhraní poskytovatele umožnilo porovnávat zdroj návrhu; simulace dala stabilní demo chování bez závislosti na modelu. |
| 28. 10. — [`a0f26bc`](https://github.com/majkitostudio/planning-engine/commit/a0f26bc), [`6c2213b`](https://github.com/majkitostudio/planning-engine/commit/6c2213b) | Přidáno přihlášení, persistence, potvrzování manažerem a auditní zobrazení. | Rozpis se nemá aplikovat pouhým generováním; systém začal rozlišovat návrh a explicitně potvrzenou změnu. |
| 29.–30. 10. — [`0a421bd`](https://github.com/majkitostudio/planning-engine/commit/0a421bd), [`7e19ebc`](https://github.com/majkitostudio/planning-engine/commit/7e19ebc), [`37f22d2`](https://github.com/majkitostudio/planning-engine/commit/37f22d2) | Vytvořeny kontrakty a deterministické vyhodnocení operativních náhrad směn a konfigurovatelné obsazení. | Rozšíření reagovalo na potřebu pracovat s konkrétními provozními výpadky a proměnlivou potřebou obsazení. Náhrady jsou oddělený tok od měsíčního plánovače. |
| 1.–2. 11. — [`40a0bf6`](https://github.com/majkitostudio/planning-engine/commit/40a0bf6), [`1b44712`](https://github.com/majkitostudio/planning-engine/commit/1b44712), [`4979cc0`](https://github.com/majkitostudio/planning-engine/commit/4979cc0) | Měsíční plánovací pilot, správa zaměstnanců pro měsíční plánování a odstranění samostatného týdenního UI. | Produkt se přesunul k celému měsíci jako hlavnímu výsledku; týdenní zobrazení se stalo jen pohledem do něj. |
| 3. 11. — [`31c634d`](https://github.com/majkitostudio/planning-engine/commit/31c634d), [`6163d63`](https://github.com/majkitostudio/planning-engine/commit/6163d63) | Přidán lokální měsíční OR-Tools plánovač a preference rotace směn. | OR-Tools tehdy tvořil deterministickou cestu k sestavení návrhu; řešič mohl hledat kombinace podle strukturovaných pravidel a preferencí. |
| 4. 11. — [`269aa32`](https://github.com/majkitostudio/planning-engine/commit/269aa32), [`b36655e`](https://github.com/majkitostudio/planning-engine/commit/b36655e) | Doplněn import historie rozpisů a kontroly hranic měsíce; krátce vznikla i podpora částečného plánování. | Návaznosti přes hranice období jsou nutné pro smysluplné kontroly odpočinku. Částečné plánování bylo později vyřazeno z aktuálního pilotu. |
| 4. 11. — [`c99c1a1`](https://github.com/majkitostudio/planning-engine/commit/c99c1a1) | Přidán izolovaný překladač pokynů do uzavřeného strukturovaného záměru. | AI interpretace byla ohraničena; překladač nebyl zapojen jako autoritativní plánovač ani do běžného UI toku. |
| 5. 11. — [`1070054`](https://github.com/majkitostudio/planning-engine/commit/1070054), [`806df40`](https://github.com/majkitostudio/planning-engine/commit/806df40) | Pracovní fond označen jako neblokující kontrola; rozšířeno ověřování lokálního řešiče a CI. | Oddělily se tvrdé podmínky od měkčích hledisek a přibyly reprodukovatelné syntetické kontroly. Tyto testy nedokazují provozní kvalitu ani produkční připravenost. |
| 6. 11. — [`cecb725`](https://github.com/majkitostudio/planning-engine/commit/cecb725), [`649a25b`](https://github.com/majkitostudio/planning-engine/commit/649a25b) | Přidán Cloudflare Workers AI provider a zaznamenáno skutečné volání služby. | Zvolen online směr pro tehdejší cílový hosting. Skutečné volání prokazuje integraci, nikoli kvalitu všech sestavených rozpisů. |
| 6. 11. — [`f6d616d`](https://github.com/majkitostudio/planning-engine/commit/f6d616d) | Sjednoceno UI a odstraněn lokální OR-Tools provider, jeho Python skript, závislosti a CI větev. | Přijaté ADR 0008 zvolilo Cloudflare AI pro online měsíční návrhy a nechtělo udržovat druhou lokální cestu s odlišným během a UI. Historické rozpisy vytvořené OR-Tools zůstaly čitelné. |
| 7. 11. — [`5830d13`](https://github.com/majkitostudio/planning-engine/commit/5830d13), [`c886214`](https://github.com/majkitostudio/planning-engine/commit/c886214), [`05021a2`](https://github.com/majkitostudio/planning-engine/commit/05021a2) | Zpřesněn import rozpisů, praktický cíl plánování a rozsah pilotu. | Výsledkem má být použitelný samostatně sestavený rozpis celého měsíce pro plné úvazky. Když se řešení nenajde, aplikace má popsat známé překážky a nejistoty, ne přesouvat hledání na manažera ani tvrdit neproveditelnost bez důkazu. |

## Současný směr a co zůstává otevřené

- V projektu je jako přijaté rozhodnutí z 6. 11. zaznamenáno Cloudflare AI jako měsíční provider a odstranění lokálního OR-Tools: [`docs/adr/0008-cloudflare-only-and-unified-ui.md`](adr/0008-cloudflare-only-and-unified-ui.md).
- `AGENTS.md` stanovuje, že AI je hlavní plánovací logika. Jakákoli změna její role nebo návrat OR-Tools vyžaduje nové výslovné rozhodnutí a sladění ADR s projektovými instrukcemi.
- Aktuální reálný Cloudflare běh byl zaznamenán, ale kvalita návrhu pro spolehlivé běžné použití je stále `PARTIAL` / `NOT VERIFIED`. Jeden skutečný běh není důkaz opakovatelné kvality.
- Cílový hosting je v dokumentaci Vercel Hobby + stávající Neon Free; produkční připravenost, zabezpečení, databázový provoz a celková kvalita plánování nejsou potvrzené.
- Částečný měsíc a částečné úvazky jsou mimo pilot. Některé starší části kódu, schématu a dokumentace proto mohou popisovat historickou či širší funkčnost, ne současný produktový rozsah.

## Stav pracovního stromu při sepsání

Lokální `main` a místní reference `origin/main` ukazovaly na `05021a2` z 7. 11. 2026. V pracovním stromu byly necommitnuté úpravy `app/globals.css`, `components/plan/monthly-roster-table.tsx`, `components/plan/plan-workspace.tsx`, `lib/ai/cloudflare-planning-provider.ts` a souvisejících testů. Přítomny byly také čtyři nové PNG soubory pojmenované `employees-*.png`; jejich obsah nebyl pro tuto mapu kontrolován. Tyto změny nejsou zahrnuté v uvedené historii a tato mapa je nijak nepřepisuje.

## Doporučené první čtení pro Claude

1. Přečti `AGENTS.md` a zkontroluj `git status` i `git diff`; zachovej stávající místní práci.
2. Projdi `README.md`, `docs/README.md`, `docs/DOMAIN_DECISIONS.md`, `docs/DOMAIN_SPECIFICATION.md`, `docs/ROADMAP.md` a ADR 0008.
3. Při otázce na chování ověř aktuální kód a testy. Historické commity vysvětlují, jak se směr měnil, ale nenahrazují dnešní rozhodnutí.
4. Neměň plánovací pravidla podle odhadu. Když se zdrojový kód, testy a rozhodovací dokumenty rozcházejí, popiš rozpor a nejprve zjisti, které rozhodnutí platí.
5. Nepředpokládej produktová ani doménová rozhodnutí, která nejsou zapsaná v aktuálních zdrojích pravdy.

Kontroly dostupné v projektu jsou uvedené v `package.json` a CI. Pro toto shrnutí nebyly spouštěny testy ani měněn aplikační kód.
