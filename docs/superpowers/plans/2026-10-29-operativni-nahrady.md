# Operativní náhrady směn — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Přidat první syntetický operativní tok, ve kterém manager označí výpadek celé směny, dostane tři konkrétní AI varianty, jednu vybere, nechá ji deterministicky ověřit a teprve potom ji potvrdí jako novou verzi týdne.

**Architecture:** Operativní náhrada bude samostatná vrstva nad již potvrzeným týdenním plánem. Stávající `validatePlan()` zůstane nezávislou kontrolou výsledného celého týdne; AI bude navrhovat varianty, zatímco změny, pokrytí a validační výsledek se dopočítají deterministicky. První pilot zůstane syntetický a použije simulovaný provider i existující JSON snapshot/perzistenční mechanismus, bez nových produkčních doménových tabulek.

**Tech Stack:** Next.js App Router, TypeScript, React, Vitest, existující Prisma snapshoty a auditní události.

**Spec:** `docs/superpowers/specs/2026-10-29-operativni-nahrady-design.md`

## Global Constraints

- První řez je jeden týden, pondělí–neděle, pouze plné úvazky a syntetická data.
- Výpadek se týká jedné celé směny; dílčí nástup uprostřed směny není podporován.
- AI navrhne tři odlišné varianty, pokud jsou dostupné; nedostatek variant se přizná.
- AI ani validace samy neschvalují a před potvrzením se nesmí změnit potvrzený rozpis.
- Každá varianta musí mít viditelný dopad na změny a pokrytí.
- Vybraná varianta se potvrdí pouze jako kompletní a `ready_for_review`.
- Limity se připraví jako konfigurovatelný profil. Právní baseline je pouze
  zdroj evidence; bez právního a interního potvrzení se výsledek označí jako
  `NOT VERIFIED`. Role, dovednosti a další limity se nesmí domýšlet.
- Každá řešená směna musí dosáhnout interního minima 7 lidí. Priorita návrhu je
  nejprve pokrytí, potom ověřená tvrdá pravidla, potom nejmenší počet dalších
  dotčených lidí; celý řetěz dopadů musí být viditelný.
- Změna schváleného volna je vysoce dopadová varianta. Systém ji může navrhnout,
  ale nesmí ji automaticky převést ani tvrdit, že nahradí právní/HR postup.
- První implementace používá simulovaný provider; Gemini se připojí až po stabilizaci kontraktu.
- Nepřidávat Outlook, CRM, roster, produkční autentizaci, produkční PostgreSQL ani částečné úvazky.

## Review Focus

- Výpadek musí vyřadit původní přiřazení jen v pracovním návrhu a před potvrzením nesmí změnit uložený plán — test v `replacement-service.test.ts` a route test.
- Kandidát na náhradu nesmí mít překryv ani schválenou absenci — testy hraničních variant v `replacement-service.test.ts`.
- Každá varianta musí zobrazit deterministické změny a dopad na pokrytí, i když AI vrátí obecný text — test výpočtu variant.
- Nejsou-li tři odlišné použitelné varianty, výsledek musí být označený jako neúplný/neověřený a nesmí jít potvrdit — simulovaný provider a confirmation test.
- Zastaralý `baseProposalId` nebo opakované potvrzení nesmí přepsat novější verzi — persistence/route test.

---

### Task 0: Uzavřít rozhodovací bránu před implementací

**Files:**
- Modify: `docs/DOMAIN_DECISIONS.md`
- Modify: `docs/DOMAIN_SPECIFICATION.md`
- Modify: `docs/PLANNING_CONTRACT.md`

**Interfaces:**
- Consumes: schválené volby v design dokumentu a odpovědi managera.
- Produces: `VERIFIED`/`OPEN QUESTION` stav pro OQ2, OQ9–OQ11, OQ20 a OQ22 a konkrétní hodnoty OQ10, které mohou vstoupit do typů a testů.

- [ ] **Step 1: Zapsat konfigurační profil** podle právního baseline a interních
      pravidel: maximální hodiny/směny, odpočinky, přesčasy a další tvrdá pravidla.
- [ ] **Step 2: Zapsat odpovědi managera** k přesnému stavu incidentu, rozlišení
      dovolené/plánovaného volna/náhradního volna a rozsahu auditu.
- [ ] **Step 3: Zkontrolovat, že žádná hodnota v profilu není odvozena pouze z
      pracovního práva nebo historického emailu bez právního a interního potvrzení.**
- [ ] **Step 4: Spustit `git diff --check`** a ověřit, že dokumentace rozlišuje
      `VERIFIED`, `SOURCE EVIDENCE`, `PROPOSAL`, `OPEN QUESTION`, `PLANNED` a
      `NOT VERIFIED`.

Implementace doménových limitů je `BLOCKED`, dokud tento krok nedodá konkrétní hodnoty; ostatní syntetická příprava může pokračovat pouze bez tvrzení, že tyto limity jsou ověřené.

### Task 1: Doménový kontrakt operativní náhrady

**Files:**
- Modify: `lib/planning/domain/types.ts`
- Modify: `lib/planning/domain/index.ts`
- Modify: `lib/planning/domain/validation.ts`
- Test: `lib/planning/domain/replacement-types.test.ts`
- Test: `lib/planning/domain/validation.test.ts`

**Interfaces:**
- Consumes: `ConfirmedPlan`, `ExistingAssignment`, `PlanningInput`, `ProposedAssignment` a schválená pravidla.
- Produces: `ShiftIncident`, `ReplacementRequest`, `ReplacementOption`, `ReplacementRunResult` a stabilní validační kódy pro výpadek a zastaralý základ.

- [ ] **Step 1: Napsat testy kontraktu** pro incident na jednom datu a jedné směně, vazbu na zaměstnance, vazbu na `baseProposalId` a přesně celé přiřazení.
- [ ] **Step 2: Napsat testy odmítnutí** incidentu mimo týden, na neznámého zaměstnance, na neznámou směnu a nad neexistujícím základem.
- [ ] **Step 3: Doplnit typy** bez přidávání neověřených limitů do `PlanningRules`. Typy musí oddělit AI návrh od deterministicky dopočtených `changes`, `coverage` a `validation`.
- [ ] **Step 4: Doplnit validační kódy a čistou kontrolu** tak, aby incident pouze upravil pracovní návrh a neměnil `ConfirmedPlan`.
- [ ] **Step 5: Spustit** `npm test -- lib/planning/domain/replacement-types.test.ts lib/planning/domain/validation.test.ts`.

### Task 2: Deterministický výpočet kandidátů a dopadu

**Files:**
- Create: `lib/planning/replacement-service.ts`
- Test: `lib/planning/replacement-service.test.ts`
- Modify: `lib/planning/orchestrator.ts` pouze pokud bude potřeba znovu použít sdílené výpočty změn/pokrytí

**Interfaces:**
- Consumes: `ReplacementRequest`, potvrzený týden, `PlanningInput` a tři AI návrhy.
- Produces: `createReplacementOptions(input, request, drafts)` a `evaluateReplacementOption(input, option)` s deterministickými `changes`, `coverage` a `validation`.

- [ ] **Step 1: Napsat failing test** pro výměnu původního zaměstnance za kandidáta bez překryvu; ověřit odebrané a přidané přiřazení i změnu pokrytí.
- [ ] **Step 2: Napsat testy blokátorů** pro schválenou absenci, překryv a neúplné pokrytí.
- [ ] **Step 3: Napsat test**, že se vyhodnocuje celý výsledný týden, nikoli pouze cílová směna; tím se zachytí dopad přesunů na jiné dny.
- [ ] **Step 4: Implementovat čistý výpočet** variant a znovu použít `validatePlan()` místo paralelní kopie pravidel.
- [ ] **Step 5: Implementovat stav**, který při méně než třech odlišných návrzích vrátí přiznaný nedostatek a nedovolí potvrzení.
- [ ] **Step 6: Spustit** `npm test -- lib/planning/replacement-service.test.ts`.

### Task 3: Provider-neutral kontrakt a simulovaný provider

**Files:**
- Modify: `lib/planning/ai-provider.ts`
- Create: `lib/planning/simulated/replacement-scenarios.ts`
- Modify: `lib/planning/simulated/provider.ts`
- Modify: `lib/planning/provider-factory.ts`
- Test: `lib/planning/simulated/replacement-provider.test.ts`
- Test: `lib/planning/ai-provider.test.ts` nebo nejbližší existující test kontraktu

**Interfaces:**
- Consumes: `ReplacementRequest` a týdenní vstup.
- Produces: provider-neutral `generateReplacements()` vracející strukturované tři návrhy bez výpočtu jejich autoritativního dopadu.

- [ ] **Step 1: Napsat test** pro syntetický scénář s jedním výpadkem a třemi odlišnými návrhy.
- [ ] **Step 2: Napsat testy neplatného výstupu** pro duplicitní variantu, neznámého zaměstnance a změnu jiného než celého přiřazení; samostatně ověřit, že méně než tři návrhy není chyba struktury, ale přiznaný neúplný výsledek blokovaný pro potvrzení.
- [ ] **Step 3: Rozšířit provider-neutral kontrakt** o samostatnou operaci náhrady; nesmí se zaměnit s běžným `generatePlan()`.
- [ ] **Step 4: Přidat simulované fixture** pro variantu bez vedlejší změny, variantu s přesunem dalšího zaměstnance a variantu, která vytvoří nový nedostatek.
- [ ] **Step 5: Spustit** `npm test -- lib/planning/simulated/replacement-provider.test.ts lib/planning/ai-provider.test.ts`.

Gemini se v tomto kroku nemění na produkční integraci. Jeho rozšíření bude samostatný navazující krok po stabilizaci kontraktu a simulovaných testů.

### Task 4: API, potvrzení, nová verze a minimální audit

**Files:**
- Create: `app/api/planning/replacement/route.ts`
- Create: `app/api/planning/replacement/confirm/route.ts`
- Modify: `lib/planning/confirm-service.ts`
- Modify: `lib/planning/persistence.ts`
- Modify: `lib/planning/api-types.ts`
- Test: `tests/planning-replacement-routes.test.ts`
- Test: `lib/planning/persistence.test.ts`
- Test: `lib/planning/confirm-service.test.ts`

**Interfaces:**
- Consumes: `ReplacementRequest`, vybraná `ReplacementOption`, `PlanningActor` a aktuální snapshot.
- Produces: API pro vytvoření návrhu náhrady a samostatné potvrzení nové verze týdne.

- [ ] **Step 1: Napsat route testy** pro anonymní přístup, viewer přístup, neplatný incident, neznámý `baseProposalId` a chybějící provider/persistence.
- [ ] **Step 2: Napsat test**, že vytvoření návrhu uloží pouze pracovní snapshot a nezmění `confirmedPlan` výchozího běhu.
- [ ] **Step 3: Napsat testy potvrzení** pro `valid + complete`, `invalid`, `not_verified`, méně než tři varianty a opakované potvrzení.
- [ ] **Step 4: Implementovat endpointy** s existující ochranou manager/viewer; potvrzení musí znovu načíst snapshot a ověřit jeho základ.
- [ ] **Step 5: Rozšířit existující JSON snapshot a auditní `details`** o incident, `baseProposalId`, vybranou variantu, původní a nový rozpis. Nevytvářet nové produkční doménové tabulky.
- [ ] **Step 6: Spustit** `npm test -- tests/planning-replacement-routes.test.ts lib/planning/persistence.test.ts lib/planning/confirm-service.test.ts`.

### Task 5: Syntetické UI pro operativní náhradu

**Files:**
- Create: `components/plan/replacement-panel.tsx`
- Modify: `components/plan/plan-workspace.tsx`
- Modify: `components/plan/planning-result.tsx` pouze pro zobrazení vybrané varianty a blokátorů
- Test: nejbližší dostupné UI/smoke testy; pokud přímý UI test není v projektu zavedený, provést zdokumentovaný browser smoke

**Interfaces:**
- Consumes: replacement API view model, syntetický týden a existující `PlanningRunView`.
- Produces: výběr směny, formulář výpadku, tři karty variant, zobrazení dopadu, výběr varianty a tlačítko potvrzení.

- [ ] **Step 1: Napsat UI acceptance checklist**: aktuální obsazení, výpadek, tři varianty, změny, pokrytí, validace a jasný stav „bez potvrzení se nic nemění“.
- [ ] **Step 2: Implementovat zadání výpadku** pouze pro podporovaný syntetický týden a celou směnu.
- [ ] **Step 3: Implementovat karty variant** tak, aby zobrazovaly kandidáta, všechny změny, pokrytí, kompromisy a `NOT VERIFIED` omezení.
- [ ] **Step 4: Implementovat výběr a potvrzení**; žádná varianta se nesmí potvrdit bez serverové revalidace.
- [ ] **Step 5: Provést browser smoke** pro validní, neúplnou a neověřenou variantu a ověřit, že původní rozpis zůstává před potvrzením beze změny.

### Task 6: Gemini, dokumentace a finální ověření

**Files:**
- Modify: `lib/ai/gemini-planning-provider.ts` až po stabilizaci simulovaného kontraktu
- Modify: `docs/DOMAIN_SPECIFICATION.md`
- Modify: `docs/PLANNING_CONTRACT.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/README.md`
- Modify: `lib/planning/README.md`
- Test: rozšíření Gemini unit/integration testů pouze při výslovném zapojení provideru

**Interfaces:**
- Consumes: hotový simulovaný kontrakt, schválené OQ a výsledky integračních testů.
- Produces: pravdivý stav dokumentace (`IMPLEMENTED` versus `VERIFIED`) a případné provider-neutral Gemini rozšíření.

- [ ] **Step 1: Aktualizovat stav dokumentace** podle skutečných změněných souborů a skutečně spuštěných testů; neoznačit Gemini ani produkční kvalitu jako ověřené bez důkazu.
- [ ] **Step 2: Pokud se zapojí Gemini, napsat test neplatného strukturovaného výstupu** a test tří variant; bez lokální konfigurace ponechat integrační test přeskočený.
- [ ] **Step 3: Spustit celý ověřovací balík:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, `npm run db:validate`.
- [ ] **Step 4: Spustit `git diff --check` a `git status --short`** a potvrdit, že vznikly pouze zamýšlené změny.
- [ ] **Step 5: Připravit stručný report** s přesným seznamem ověřených testů, přeskočených kontrol a otevřených OQ.

## Handoff

Po schválení OQ brány má implementace probíhat po úkolech 1–6. Doporučený
způsob je `subagent-driven-development`, protože kontrakt, doménová validace,
API a UI mají oddělené testovatelné hranice; každý úkol může být samostatně
zkontrolován před pokračováním.
