# Příprava dema pro vedení — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upravit texty a viditelné popisky současného dema tak, aby během krátké živé ukázky jasně vysvětlily přínos AI návrhu, samostatné kontroly a potvrzení managerem.

**Architecture:** Zůstaneme u současných obrazovek a komponent. Změny budou pouze v prezentační vrstvě Reactu; plánovací jádro, API, scénáře, ukládání i autentizace se nemění.

**Tech Stack:** Next.js App Router, TypeScript, React, existující CSS komponenty.

**Spec:** `docs/superpowers/specs/2026-10-28-leadership-demo-design.md`

## Global Constraints

- Demo používá syntetická data a nesmí se vydávat za produkční systém.
- První verze zůstává týdenní a pracuje pouze s plnými úvazky.
- Neměnit potvrzené časy směn ani plánovací pravidla.
- Nepřidávat Outlook, CRM, roster, produkční databázi ani produkční přihlášení.
- Zachovat tři scénáře `complete`, `partial` a `unverified` a jejich současné chování.
- Komunikace v UI má být jednoduchá a bez zbytečného technického žargonu.

## Review Focus

- Nový návštěvník musí pochopit rozdíl mezi návrhem, kontrolou a potvrzením — ověřit hlavní cestou dema.
- Demo nesmí naznačovat, že pracuje s reálnými lidmi nebo provozními daty — ověřit viditelné upozornění na přehledu i plánování.
- Částečný a neověřený scénář musí zůstat jasně odlišitelné od kompletního návrhu — ověřit všechny tři scénáře.
- Technické označení simulace nesmí zmizet tam, kde je důležité pro pravdivost — ověřit štítky u běhu a výsledku.
- Ovládání plánování a potvrzení se nesmí změnit — ověřit lint, typecheck, testy a build.

---

### Task 1: Zpřehlednit příběh na přehledu

**Files:**
- Modify: `app/(app)/page.tsx`

**Interfaces:**
- Consumes: existující `STEPS`, `DEMO_STATS`, `DEMO_ALERTS` a odkazy na `/planovani`.
- Produces: textový úvod a pět kroků, které popíšou jeden týden, vstupy, AI návrh, kontrolu a rozhodnutí managera.

- [ ] **Step 1: Upravit text úvodu a demonstračního upozornění**

  Úvod má vysvětlit týdenní plánování a hodnotu ukázky. Upozornění má říct,
  že jména, čísla a směny jsou syntetické, že ukázka nepoužívá Outlook ani
  roster a že nejde o produkční systém. Zachovat viditelný status `DEMO`.

- [ ] **Step 2: Upravit pět kroků pracovního postupu**

  Krok 1 má popsat výběr týdne, krok 2 vstupní data, krok 3 návrh AI, krok 4
  výsledek a kontrolu a krok 5 rozhodnutí managera. Odstranit formulace typu
  „orchestrátor“, „fixture“ a „IMPLEMENTED / DEMO“, pokud nejsou pro návštěvníka
  přínosné; pravdivý status dema zachovat jednodušší formulací.

- [ ] **Step 3: Ověřit diff**

  Run: `git diff --check`

  Expected: bez chyb formátování.

### Task 2: Zjednodušit pracovní plochu plánování

**Files:**
- Modify: `components/plan/plan-workspace.tsx`

**Interfaces:**
- Consumes: existující `PlanWorkspace`, podporovaný týden, runtime notice a scénáře.
- Produces: srozumitelný popis stránky, jasné upozornění na ukázková data a lidské popisky ovládacích prvků bez změny chování.

- [ ] **Step 1: Opravit a zjednodušit popis stránky**

  Opravit překlep „vznika“ na „vzniká“ a popsat, že AI připraví návrh pro
  vybraný týden z dostupných vstupů.

- [ ] **Step 2: Upravit upozornění a popisky běhu**

  Zachovat jasnou informaci, že jména, počty a přiřazení jsou smyšlené a že
  výsledek není platný ani schválený rozpis. V postranním panelu vysvětlit
  simulovaný režim jako připravenou ukázku; technický štítek režimu zůstane
  dostupný jako doplňující status.

- [ ] **Step 3: Ověřit, že se nemění ovládání**

  Kontrolou diffu potvrdit, že zůstává výběr týdne, výběr scénáře, spuštění,
  zobrazení výsledku a potvrzení návrhu beze změny.

### Task 3: Zpřehlednit výsledek návrhu

**Files:**
- Modify: `components/plan/planning-result.tsx`

**Interfaces:**
- Consumes: existující `PlanningRunView`, `PlanningFailureView`, scénáře a callbacky.
- Produces: lidsky čitelné prázdné stavy, ovládací popisky a vysvětlení potvrzení bez změny datového modelu.

- [ ] **Step 1: Upravit prázdný stav a výběr scénáře**

  Text má návštěvníkovi říct, že si vybírá připravený ukázkový případ a po
  spuštění uvidí návrh nad tabulkou. Technické slovo „fixture“ v hlavním textu
  nepoužívat.

- [ ] **Step 2: Upravit viditelné rozlišení návrhu, kontroly a potvrzení**

  Zachovat samostatné statusy návrhu, úplnosti, validace a potvrzení. Popisek
  tlačítka a doprovodný text mají jasně říct, že potvrzení je rozhodnutí
  managera a bez něj se návrh nepoužije. Technické detaily zůstanou schované
  v existujícím rozbalovacím panelu.

- [ ] **Step 3: Zachovat pravdivé statusy scénářů**

  Neodstraňovat označení `SIMULATED` ani `GEMINI (NOT VERIFIED)`. U kompletního,
  částečného a neověřeného scénáře ověřit, že se stále zobrazí jejich současný
  stav a případná blokace potvrzení.

### Task 4: Celkové ověření ukázky

**Files:**
- No new files.

- [ ] **Step 1: Spustit statické kontroly**

  Run: `npm run lint`

  Expected: bez chyb a warningů.

  Run: `npm run typecheck`

  Expected: úspěšné dokončení.

- [ ] **Step 2: Spustit testy a build**

  Run: `npm run test`

  Expected: všechny běžné testy projdou; případný výslovně přeskočený integrační
  test uvést ve výsledku.

  Run: `npm run build`

  Expected: produkční build projde.

- [ ] **Step 3: Projít hlavní demo cestu**

  Otevřít přehled, přejít na plán směn, ponechat podporovaný týden, spustit
  kompletní scénář, projít návrh a potvrdit ho. Poté zopakovat běh pro částečný
  a neověřený scénář a ověřit, že potvrzení zůstává blokované tam, kde má.

- [ ] **Step 4: Zkontrolovat finální stav**

  Run: `git diff --check && git status --short`

  Expected: pouze zamýšlené změny v prezentační vrstvě a žádné nevyžádané soubory.

