# MVP Deployment — konsolidovaný seznam řízení

> Vytvořeno 6. 11. 2026 jako pracovní seznam pro řízení dokončení MVP a nasazení.
> Autoritativní zdroje: `docs/ROADMAP.md`, `docs/PRE_PUBLISH_CHECKLIST.md`,
> `docs/DEPLOYMENT.md`, `docs/LEADERSHIP_DEMO_TODO.md`, `AGENTS.md`.
> Stavové popisky (`VERIFIED`, `IMPLEMENTED`, `PLANNED`, `NOT VERIFIED`,
> `OPEN QUESTION`) zachovávají význam z `docs/README.md`.

> Aktualizace 6. 11. 2026: na žádost uživatele byl odstraněn lokální OR-Tools
> solver a probíhá sjednocení UI napříč všemi stránkami. Rozhodnutí je zaznamenáno v
> [`adr/0008-cloudflare-only-and-unified-ui.md`](adr/0008-cloudflare-only-and-unified-ui.md).

## 0. Aktuální stav projektu (ověřeno lokálně 6. 11. 2026)

- Historický stav před aktuálními změnami: `main` = `origin/main`, commit `ef86167`.
  Aktuální pracovní strom obsahuje necommitnuté změny; vzdálená větev nebyla
  po těchto změnách znovu ověřena.
- Lokální kontroly: `npm run typecheck` ✅, `npm run lint` ✅, `npm run build` ✅.
- Vercel projekt: `planning-engine` (`prj_ta5MeXt3XUN0NwZhAMWSNADxRYiF`),
  tým `majkitostudio`. Poslední deployment `READY` (production) je na starším
  commitu `649a25b` — je potřeba redeploy na aktuální `HEAD`.
- Produkční aliasy: `planning-engine-majkito.vercel.app`,
  `planning-engine-kappa.vercel.app`.
- Env proměnné na Vercelu: všechny požadované klíče nastavené
  (`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`,
  `PLANNING_AUTH_MODE=database`, `PLANNING_PERSISTENCE=prisma`,
  `PLANNING_MONTHLY_PROVIDER`, `CLOUDFLARE_ACCOUNT_ID`,
  `CLOUDFLARE_API_TOKEN`) pro `production` i `preview`.
- Hosting: Vercel Hobby + stávající Neon Free + Cloudflare Workers AI Free
  (`VERIFIED` rozhodnutí 6. 11. 2026).
- AI plánovač: Cloudflare Workers AI ověřen reálným voláním (101 přiřazení,
  93 s, stav validace `invalid` s 14 nálezy, 102 neověřených kontrol). Kvalita
  pokrytí je `PARTIAL` — předmět dalšího ladění a posouzení manažerem.

## Část A — Hotové fáze (ověřené)

### P0 — vše hotové a ověřené
- [x] Sjednocení projektu do `main` a úklid pracovních stromů/větví (`VERIFIED` 6. 11. 2026).
- [x] Starší API a ochrana rozpisů (manager-only zápis, ochrana potvrzeného záznamu).
- [x] Zneplatnění starých přihlášení (`sessionVersion`).
- [x] Dočasné blokování chybných databázových přihlášení (10 pokusů, souběh).
- [x] Jediné atomické potvrzení (souběžné potvrzení, jedna auditní událost).

### P1 — hotové
- [x] Pravdivé zdroje obsazení (uložený vs. výchozí profil, schválení uložením).
- [x] Správa rozpisů (seznam, odstranění, audit, návaznost, opětovné potvrzení).
- [x] AI a citlivý text — rozhodnuto: Cloudflare Workers AI, skutečná jména i
  volný text povoleny, nulové uchovávání, žádné trénování.
- [x] Reálné volání Cloudflare Workers AI ověřeno (smyslený listopad 2026, 8 zaměstnanců).
- [x] Podpora polovičních úvazků (`IMPLEMENTED`, mimo pilot).
- [x] Fond práce zaměstnance (volitelný vstup; AI jej může zohlednit, validace
  jeho splnění samostatně neověřuje).
- [x] Lokální OR-Tools a jeho Python solver odstraněny; AI-only online tok.
- [~] UI/UX sjednocení: sdílené tokeny, Zaměstnanci a Návaznost směn upraveny;
  další stránky a finální mobilní vizuální kontrola zbývají.
- [x] Přístupnost — klávesnice/popisky/fokus mají doložené testy a prohlížečové ověření.
- [x] Automatické ukládání rozepsaného zadání v zařízení (per účet a měsíc).
- [x] CI: izolovaná PostgreSQL integrační testy; Python solver job odstraněn.
- [x] Migrace (včetně `20261105120000_add_planning_employee_contract_type`) aplikovány.
- [~] Dokumentace: AGENTS, README a aktuální shrnutí roadmapy aktualizovány;
  starší kontrakty, checklisty a demo scénář ještě obsahují historické pokyny
  k lokálnímu solveru a vyžadují označení/opravu.

### P2 — částečně hotové
- [x] Online nasazení na Vercel Hobby + stávající Neon (`VERIFIED` 6. 11. 2026):
  preview i production nasazeny, migrace aplikovány, Cloudflare AI ověřeno,
  klíče nastaveny ve Vercelu.

## Část B — Otevřené položky (podle priority)

### B1. P1 — Pravidla a limity plánování (stav po průzkumu 6. 11. 2026)
- [~] Návaznosti (roster history, before/after 7 dnů): `IMPLEMENTED`, lokálně
  `VERIFIED` (jednotkové + integrační testy), produkční DB `NOT VERIFIED`.
  Otevřené: nejasné souběžné verze historie zůstávají neúplné (záměrně
  konzervativní).
- [~] Nepokryté dny: řešeny jako validační problém (`COVERAGE_UNDERSTAFFED` blokuje
  potvrzení); samostatný report seznamu nepokrytých směn `NOT IMPLEMENTED`.
- [x] Částečný měsíc (`planningRange`) odstraněn z aktuálního MVP UI i runtime
  spolu s lokálním OR-Tools. Historické uložené návrhy zůstávají čitelné.
- [~] Absence přes hranici měsíce: `IMPLEMENTED` implicitně (boundary se bere z
  potvrzených rozpisů; absence jen in-month dostupnost). Chybějící podklady →
  unverified.
- [ ] Uzavřít doménové rozhodnutí o neúplném plánu jako platném (`OPEN QUESTION`).
- [ ] Ověřit výkon na schválených syntetických scénářích; technický limit 200
  zaměstnanců nepovažovat za doloženou provozní kapacitu.
- [ ] Určit dobu uchování a mazání volného textu v databázi (`OPEN QUESTION`).

### B2. P1 — Kvalita a přístupnost (stav po průzkumu 6. 11. 2026)
- [ ] Ověřit mobilní ovládání a fokus skutečnou čtečkou obrazovky (`NOT VERIFIED`,
  vyžaduje lidského testera — nelze autonomně).
- [x] Vývojové závislosti posouzeny: `npm audit --omit=dev` = 0 zranitelností
  provozních deps. 8 středních nálezů ve vývojové závislosti `minimatch`
  (řetězec `eslint-config-next`); automatická oprava = breaking downgrade na
  eslint-config-next v15. Kompatibilní oprava není ověřená — ponecháno.
  Rozhodnutí: přijatelné riziko (jen dev tooling, ne provoz).

### B3. P2 — Závěrečné ověření MVP (stav po průzkumu 6. 11. 2026)
- [ ] Syntetický průchod návrh → kontrola → potvrzení → obnovení — blokováno
  chybějícími schválenými testovacími vstupy (viz B4). Jednotlivé části
  historicky ověřeny; souvislý průchod zůstává otevřený.
- [ ] Cílové nasazení ověřit end-to-end na náhledovém nasazení: přihlášení,
  migrace, plánování, potvrzení na smyšlených datech; produkční úroveň záloh
  a monitoringu zůstává `NOT VERIFIED`.
- [ ] Kvalita AI pokrytí (`PARTIAL`) — ladění promptů/cíle pokrytí, posouzení
  manažerem na více měsících.
- [~] Design audit potvrdil nejednotné hlavičky, formuláře, prázdné/loading stavy
  a neplatný přepínač Demo/Production. Zaměstnanci, Návaznost směn a část
  společných stavů jsou upraveny; zbývají další stránky a mobilní vizuální kontrola.
- [x] Lokální ověření 6. 11. 2026 po aktuálních změnách: 573 testů prošlo,
  11 přeskočeno (75 souborů prošlo, 6 přeskočeno), lint ✅, typecheck ✅, build ✅.

### B4. Otevřené doménové otázky a testovací vstupy (stav po průzkumu 6. 11. 2026)
- [ ] Vyřešit zbývající `OPEN QUESTION` položky (pravidla a způsob práce s
  pokyny AI; volný text není deterministicky ověřovaný tvrdý požadavek).
- [ ] Produkční autentizace (Entra ID) zůstává `PLANNED`, není pro MVP potřeba.
- **Dostupné vstupy:**
  - 23 spárovaných aktivních zaměstnanců (říjen 2026, 25.–31.), 625 známých
    směn/volných dnů; 6 zaměstnanců má chybějící říjnové hranice.
  - Syntetický staffing profil v DB: Po–Pá 15/7, So–Ne 7/3 (testovací).
  - Schválený (manager, 30. 10. 2026) profil: Po–Pá 23/8, So–Ne 12/9 — v DB
    není nastaven, je třeba jej výslovně uložit (14 hodnot).
  - Demo data: `lib/demo-data.ts` (10 syntetických), `lib/planning/simulated/`
    (3 scénáře, 6 zaměstnanců).
- **Chybí (manuální krok manažera):**
  - Listopadové absence a dostupnost (zadat v aplikaci).
  - Fond práce a omluvené hodiny (volitelné, ale neověřené bez nich).
  - Doplnit chybějící říjnové hranice pro 6 zaměstnanců + prosincovou návaznost
    (bez toho nelze listopadový návrh potvrdit, OQ23).
  - Nastavit schválený staffing profil 23/8, 12/9.
  - Testovací viewer účet pro demo (Fáze 3).
  - 7 listopadových návrhů v DB, žádný potvrzený.

## Část C — Deployment MVP: kroky a stav

Zdroj: `docs/DEPLOYMENT.md`, `docs/PRE_PUBLISH_CHECKLIST.md` §0 a §2.

### C0. Provozní rozhodnutí (ověřeno)
- [x] Nekomerční projekt, rozpočet 0 Kč.
- [x] Jediná databáze: stávající Neon Free (žádná další).
- [x] Vercel Hobby + Neon Free + Cloudflare Workers AI Free.
- [x] Pilot pouze plné úvazky.
- [x] Týden pro pravidlo víkendového volna = pondělí–neděle.
- [x] Externí AI povolena se skutečnými jmény a volným textem.

### C1. Záloha a migrace (částečně hotové)
- [ ] V Neonu pořídit snapshot nebo ověřit dostupný bod obnovy (`PLANNED`,
  vyžaduje výslovné potvrzení uživatele — zápis do produkční DB).
- [ ] Lokálně nastavit `DATABASE_URL_UNPOOLED` na přímé připojení k Neonu.
- [ ] Spustit `npm run db:migrate:deploy` a ověřit `npx prisma migrate status`.
  - Pozn.: migrace se nespouští při každém buildu.
- [x] Migrace typu úvazku ověřena na schválené aktivní DB (`up to date`).

### C2. Účty
- [ ] Vytvořit manažerský účet jednorázově přes `npm run db:bootstrap-manager`
  (heslo nevkládat do chatu/dokumentace).
- [ ] Vytvořit viewer účet v aplikaci na stránce Správa účtů.
  - `BLOCKED` v `LEADERSHIP_DEMO_TODO.md` Fáze 3: vyžaduje potvrzení zápisu
    do jediné stávající Neon DB.

### C3. Vercel (stav)
- [x] Repozitář importován jako Next.js projekt, propojen (`.vercel/project.json`).
- [x] Node.js na `26.x` (`.nvmrc`).
- [x] Všechny env proměnné nastaveny (production + preview).
- [ ] Redeploy na aktuální `HEAD` (`ef86167`) — produkční deployment je stále
  na `649a25b`. **Externí operace — vyžaduje výslovné potvrzení uživatele.**
- [ ] Po redeploy ověřit: přihlášení manager/viewer, načtení stránek, jeden dotaz
  do DB, vytvoření návrhu na smyšlených datech, žádné tajné klíče v prohlížeči,
  denní kvóta Cloudflare stačí na jeden měsíční návrh.

### C4. Ověření AI plánovače (odděleně, kvůta)
- [ ] Spustit `RUN_CLOUDFLARE_INTEGRATION=1 npx vitest run lib/ai/cloudflare-planning-provider.integration.test.ts`
  na smyšleném měsíci (8 zaměstnanců) — ověří strukturovaný výstup, přiřazení
  v měsíci, nezávislá validace. Samotný úspěch neznamená dostatečnou kvalitu
  pokrytí pro provoz.

### C5. Co tento postup neřeší (zůstává `NOT VERIFIED`)
- Produkční zálohy, monitoring, obnova po havárii, SLA.
- Komerční použití (vyžadovalo by Vercel Pro).
- Více databází, týmů, manažerů.
- Produkční úroveň autentizace (Entra ID je `PLANNED`).

## Část D — Doporučené pořadí dalších kroků (MVP → deployment)

1. **Dokončit otevřené P1/P2 položky** (B1, B2, B3) — zejména souvislý
   syntetický průchod a ověření čtečkou obrazovky.
2. **Připravit schválené testovací vstupy** (B4) — bez nich nelze provést plný
   manažerský průchod.
3. **Záloha Neon + migrace** (C1) — po výslovném potvrzení uživatele.
4. **Bootstrap účtů** (C2) — po potvrzení zápisu do DB.
5. **Redeploy na aktuální HEAD** (C3) — po potvrzení uživatele (externí operace).
6. **Smoke test na preview/production** (C3, C4) — přihlášení, návrh, potvrzení,
   obnovení.
7. **Aktualizovat dokumentaci** stavu nasazení (ROADMAP, PRE_PUBLISH_CHECKLIST).

## Poznámky

- Tento soubor je přehled; autoritativní zdroje zůstávají uvedené dokumenty.
- Push/deploy/PR jsou externí operace a vyžadují výslovné potvrzení uživatele
  (viz `AGENTS.md`).
- Nikdy nevypisovat tajné klíče, tokeny, hesla ani obsah `.env`.
