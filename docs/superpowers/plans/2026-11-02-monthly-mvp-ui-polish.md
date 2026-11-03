# Plán úprav měsíčního MVP a sjednocení rozhraní

> **Pro agenty:** Při implementaci použij `superpowers:executing-plans` a postupuj po jednom úkolu. Zachovej stávající necommitnuté změny. Nepřidávej produkční databázi, další manažerský účet ani nové integrační služby.

**Cíl:** Zjednodušit plánovací obrazovku na schválený měsíční tok, zavřít skupinu „Budoucí funkce“ po přihlášení a postupně sjednotit viditelné části aplikace podle schváleného směru.

**Přístup:** Nejdřív zmapovat skutečné UI a jeho odchylky, potom provést malé nezávisle ověřitelné změny: chování navigace, odstranění starého týdenního vstupu, sdílené vizuální prvky a nakonec jednotlivé obrazovky. Týdenní tabulka může zůstat jako způsob zobrazení výřezu měsíčního plánu; nesmí se zaměnit se samostatným týdenním plánovacím tokem.

**Technologie:** Next.js App Router, React, TypeScript, existující CSS a Vitest. Nepřidávat UI testovací framework ani další závislost bez doložené potřeby.

**Podklady:** Uživatelské zadání z 2. 11. 2026; schválené měsíční MVP v [`docs/superpowers/specs/2026-10-30-mesicni-mvp-design.md`](../specs/2026-10-30-mesicni-mvp-design.md), rozhodnutí v [`docs/DOMAIN_DECISIONS.md`](../../DOMAIN_DECISIONS.md), vizuální reference [`docs/design/mvp-final.png`](../../design/mvp-final.png) a aktuální projektové instrukce v `AGENTS.md`.

## Pevná pravidla

- MVP vytváří jeden návrh pro celý zvolený kalendářní měsíc a zaměstnance na plný úvazek.
- AI zůstává hlavní plánovací logikou; deterministická validace ji nezávisle kontroluje.
- Volný text je pokyn pro AI, ne nové tvrdé pravidlo.
- Návrh se neuloží jako potvrzený bez výslovného potvrzení manažerem. Chybějící historie znamená neověřené kontroly a neúplný návrh nelze potvrdit.
- Zachovat existující napojení databáze a manažerský účet. Nezakládat jejich náhrady. Před zápisovým průchodem ověřit, že cílové prostředí, měsíc a data jsou pro ověření určené. Pokud je databáze produkční, nepoužívat ji bez výslovného schválení. Nepoužívat skutečná zaměstnanecká data.
- Před prací znovu zkontrolovat `git status`. Zachovat již existující změny `README.md`, `docs/DOMAIN_DECISIONS.md`, `docs/DOMAIN_SPECIFICATION.md`, `docs/PLANNING_CONTRACT.md`, `docs/README.md`, `docs/ROADMAP.md`, `design-qa.md`, `docs/design/mvp-final.png`, `docs/superpowers/specs/2026-10-30-mesicni-mvp-design.md` a `output/playwright/`; nepřepisovat ani neodstraňovat je bez konkrétní potřeby v rozsahu úkolu.

## Zaměření závěrečné kontroly

- Volba jiného týdne v rámci měsíčního rozpisu nesmí spustit ani zobrazit samostatné týdenní vytvoření plánu.
- Odstranění týdenního vstupu nesmí odstranit týdenní zobrazení potřebné k prohlížení řádků měsíčního plánu.
- Skupina „Budoucí funkce“ je po přihlášení zavřená, otevře se pouze akcí uživatele a zůstane ovladatelná klávesnicí i na mobilu.
- Sdílené vizuální opravy nesmí zhoršit čitelnost, focus stavy, responsivitu ani stavové rozdíly `SIMULATED`, `NOT VERIFIED` a připravenost ke kontrole.
- Měsíční návrh s chybějící historií či neúplným pokrytím nesmí projít potvrzením.

---

### Úkol 1: Zmapovat obrazovky a přesně určit starý týdenní vstup

**Soubory:**
- Prohlédnout: `components/plan/plan-workspace.tsx`, `components/app-shell.tsx`, `app/globals.css`, `design-qa.md`, `docs/design/mvp-final.png`.
- Snímky pořizovat do již existujícího `output/playwright/`; nevytvářet další kořenový QA dokument.

- [ ] Spustit aplikaci v již nakonfigurovaném projektovém prostředí a pořídit aktuální snímky hlavního měsíčního toku a všech položek `NAV_ITEMS` v desktopovém i úzkém zobrazení.
- [ ] Porovnat plánovací obrazovku se schválenou referencí; ostatní obrazovky hodnotit podle sdílených principů, ne jako kopii tabulky rozpisu.
- [ ] Zapsat nálezy jako `blokující / výrazné / kosmetické` do průběžného checklistu tohoto úkolu a určit, které sdílené komponenty se opakují.
- [ ] Ověřit v běžícím UI, co uživatel myslí „záložkou týdenní rozpis“. Ve zdrojovém `TABS` v `plan-workspace.tsx` není doslovná záložka tohoto jména; existuje starý týdenní běh s `PlanningResult` a týdenní tabulka `RosterTable`.
- [ ] Před dalšími úkoly potvrdit, že cílem odstranění je starý samostatný týdenní vstup/výsledek, nikoli týdenní výřez měsíční tabulky.

**Hotovo, když:** Existuje aktuální seznam konkrétních UI nálezů a je jasné, který uživatelský prvek představuje starý týdenní tok. Pokud se v běžícím UI nepotvrdí, nic se nemaže naslepo.

### Úkol 2: Zavřít „Budoucí funkce“ po přihlášení

**Soubory:**
- Upravit: `components/app-shell.tsx`.
- Ověřit: přihlašovací návratová cesta a navigace z `app/prihlaseni/page.tsx`, `components/login-form.tsx` a layoutu aplikace.

- [ ] Přidat ověření výchozího stavu skupiny po úspěšném přihlášení na běžnou úvodní stránku.
- [ ] Změnit odvozování `futureOpen`, které dnes skupinu otevírá na všech cestách kromě `/planovani`, aby skupina po přihlášení začínala zavřená.
- [ ] Zachovat ruční otevření a zavření, ovládání `<details>/<summary>` klávesnicí a přístup na aktivní stránku při navigaci.
- [ ] Ověřit, že změna trasy uživateli neočekávaně nepřepne skupinu; přímý odkaz na stránku uvnitř skupiny musí stále ukazovat dostupný aktivní odkaz.

**Ověření:** Browser průchod: přihlášení → skupina zavřená → otevření myší i klávesnicí → přechod na stránku uvnitř skupiny → návrat. Pokud repozitář nemá komponentové testovací prostředí, nepřidávat kvůli tomu závislost; zdokumentovat browser ověření.

### Úkol 3: Odstranit pouze samostatný týdenní plánovací vstup

**Soubory k prověření:**
- `components/plan/plan-workspace.tsx`
- `components/plan/planning-result.tsx`
- `components/plan/roster-table.tsx`
- `app/api/planning/run/route.ts`, `app/api/planning/confirm/route.ts`
- `tests/planning-routes.test.ts`, `tests/planning-authenticated-flow.test.ts`

- [ ] Podle výsledku Úkolu 1 odstranit z hlavního toku jen starý týdenní ovládací prvek a jeho výsledek, pokud jsou tím hledaným „týdenním rozpisem“.
- [ ] Zachovat měsíční formulář, tabulku měsíčního rozpisu, navigaci mezi měsíci a týdenní výřez, kterým se prohlíží část měsíce.
- [ ] Před odstraněním serverového API nebo služby vyhledat všechny jejich volající. Pokud mají samostatné testy či jiné použití, ponechat je mimo UI místo mazání z rozsahu.
- [ ] Odstranit pouze nyní nepoužívané importy, stav a obslužné funkce v dotčeném UI; nedělat související refaktoring.
- [ ] Ověřit `npm run typecheck`, `npm run lint` a `npm run test`; zachovat průchod existujících route testů, pokud API zůstalo.

**Hotovo, když:** Hlavní pracovní tok je měsíční, žádná cesta v UI nespustí samostatné týdenní plánování a tabulkové zobrazení měsíce zůstává dostupné.

### Úkol 4: Sjednotit sdílené vizuální prvky

**Soubory:**
- Upravit podle nálezů: `app/globals.css`, opakovaně použité prvky v `components/ui/` a navigační styly v `components/app-shell.tsx`.

- [ ] Seskupit opakující se odchylky z auditu podle typografie, mezer, barev, rámečků, tlačítek, formulářů, upozornění a tabulek.
- [ ] Opravit nejdřív společné tokeny a komponenty; lokální stránkové výjimky ponechat jen tam, kde mají účel.
- [ ] Zachovat schválenou hierarchii měsíčního rozpisu, neutrální vzhled, čitelné směny, prázdná volna bez „V“ a viditelná stavová označení.
- [ ] Po každé skupině změn zkontrolovat hlavní rozpis a nejméně jednu další obrazovku, která stejný prvek používá.
- [ ] Spustit `npm run lint`, `npm run typecheck` a `npm run test`.

**Hotovo, když:** Sdílené komponenty působí jednotně bez regresí v obsahu, čitelnosti a ovládání.

### Úkol 5: Opravit stránky po malých skupinách

**Soubory:** stránky pod `app/(app)/` a jejich komponenty pod `components/`; rozsah každého podúkolu určit podle nálezů z Úkolu 1.

- [ ] Opravit nejprve `/planovani`, protože je hlavním tokem MVP; porovnat desktop, mobil, prázdný stav, chybu načítání a rozbalený formulář.
- [ ] Pokračovat skupinami stránek podle společných prvků (Přehled/Zaměstnanci; Požadavky/Dovolené; Pravidla/Analýzy/Audit; Nastavení/Správa účtů).
- [ ] V každé skupině změnit pouze konkrétní doložené odchylky, zachovat role a existující akce a po skupině zkontrolovat odkazy, formuláře, focus a úzké zobrazení.
- [ ] Aktualizovat jeden autoritativní dokument pouze tehdy, pokud se skutečně změní popsané chování.

**Ověření:** Pro každou skupinu spustit `npm run lint`, `npm run typecheck` a relevantní testy; provést browser kontrolu dotčených stránek.

### Úkol 6: Hlavní měsíční průchod přes existující napojení

**Soubory a prostředí:** `components/plan/monthly-planning-panel.tsx`, `components/plan/monthly-roster-table.tsx`, `/api/planning/monthly/*`, měsíční integrační a route testy v `lib/planning/` a `tests/`.

- [ ] Použít existující napojení databáze a existující manažerský účet; nezakládat další databázi ani účet.
- [ ] Před zápisovým průchodem ověřit cílové prostředí a vybraný měsíc. Pokud je databáze produkční, nepokračovat bez výslovného schválení; neprovádět potvrzení, které by přepsalo nebo ovlivnilo skutečný provozní rozpis.
- [ ] Projít zadání měsíce, vstupy, návrh, kontroly přes hranice týdnů/měsíců, chybějící historii, blokaci neúplného návrhu, potvrzení manažerem a opětovné načtení uloženého výsledku.
- [ ] Zaznamenat skutečný výsledek a vady v roadmapě. `SIMULATED` výsledek nepovažovat za ověření kvality AI návrhu.

**Hotovo, když:** Souvislý průchod prokáže pouze konkrétní ověřené části; žádná část se neoznačí `VERIFIED` bez odpovídajícího výsledku.

### Úkol 7: Závěrečná kontrola a dokumentace

- [ ] Spustit `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` a `npm run db:validate`.
- [ ] Zkontrolovat desktopovou a mobilní podobu všech dotčených stránek, klávesnicové ovládání navigace, chybové a prázdné stavy a konzoli prohlížeče.
- [ ] Zkontrolovat `git status` a celý diff; ponechat změny uživatele a odstranit jen nově vzniklé prokazatelně nepoužívané soubory.
- [ ] Aktualizovat `docs/README.md` a `docs/ROADMAP.md` podle skutečně dokončených a ověřených částí.
- [ ] Rozdělit práci do samostatných commitů: týdenní vstup, navigace, sdílený vzhled, stránky a hlavní ověřovací průchod. Každý commit má obsahovat jen související ověřenou změnu.
