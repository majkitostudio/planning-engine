# Pre‑publish checklist — Plánovací Engine

Souhrn položek, které je potřeba (podle existující dokumentace) vyřešit
před vydáním / produkčním nasazením aplikace. Tento soubor je jen přehled;
autoritativní zdroje jsou uvedené dokumenty.

## 0. Provozní rozhodnutí (`VERIFIED`, 6. 11. 2026)

Tato rozhodnutí uživatele mění dřívější předpoklady. Platí pro další práci.

- **Projekt je nekomerční** — studentský/ukázkový projekt pro jednoho manažera,
  ne oficiální zakázka; neočekává se platba za něj. Produktové zadání call
  centra se tím nemění, mění se obchodní status projektu.
- **Rozpočet je 0 Kč.** Volba hostingu i AI se řídí nejnižšími možnými náklady.
- **Jediná databáze:** stávající připojený Neon projekt na bezplatném tarifu.
  Další databáze, izolované ani vývojové se nezakládají.
- **Smyšlená demo data** mohou být vložena do této databáze, musí být označená
  a po ověření je lze znovu odstranit.
- **Pilot pouze pro plné úvazky** (`VERIFIED`, 6. 11. 2026).
- **Týden pro pravidlo víkendového volna je pondělí–nedělí** (`VERIFIED`).
- **Externí AI je povolená** a smí dostávat skutečná jména, směny, absence
  i volný text (`VERIFIED`, 6. 11. 2026). Dřívější omezení bylo nedorozumění.
- **Online MVP pro manažera** = funkční web s přihlášením, který vytváří rozpis.
  Vydání je odloženo, dokud nebude připravený a ověřený AI plánovač
  (rozhodnutí uživatele „3C“).
- **Slučování pracovních stromů** má proběhnout co nejdřív, ale nejprve je
  potřeba společně projít, které změny do vydání patří. Nic se nemaže naslepo.

### Zvolené prostředí a AI (`VERIFIED`, 6. 11. 2026)

- **Vercel Hobby** je zvolený hosting. Je zdarma a pro Next.js nejpřímější;
  projekt je podle potvrzení uživatele nekomerční. Při budoucí změně na
  komerční projekt by bylo nutné přejít na Pro (20 USD/měsíc).
- **Neon Free** (stávající databáze) je zvolená a jediná databáze: 100 CU-hodin
  na projekt a měsíc, 1 GB úložiště, 5 GB síťového přenosu; po 5 minutách
  nečinnosti se výpočet uspí a první dotaz ho probudí. Data se limitem nesmažou.
- **Cloudflare Workers AI Free** je zvolený měsíční AI plánovač: 10 000
  „neuronů“ denně, podle dokumentace nulové uchovávání vstupů a výstupů
  a žádné trénování na zákaznickém obsahu.
- **Skutečná jména a volný text smějí do externí AI** (`VERIFIED`, 6. 11. 2026).
- **Gemini zdarma nelze použít pro aplikaci dostupnou v EHP.** Podmínky Google
  vyžadují placenou službu pro API klienty zpřístupněné uživatelům v EHP,
  Švýcarsku nebo UK; placené Gemini by rozpočet 0 Kč nesplnilo. Starší adaptér
  zůstává v kódu, ale není měsíčním plánovačem.

### Zvažované záložní možnosti

- **Groq Free:** přibližně 1 000 požadavků a 200 000 tokenů denně, 8 000 tokenů
  za minutu. Podle smlouvy nesmí vstupy ani výstupy používat k trénování; lze
  zapnout nulové uchovávání. Nižší minutový limit je pro měsíční návrh těsný.
- **Ostatní bezplatné hostování:** Render Free se po 15 minutách uspí a sám
  uvádí, že není pro produkční aplikace; Railway Free dává jen 1 USD kreditu
  měsíčně; Netlify Free používá 300 kreditů měsíčně a produkční nasazení stojí
  15 kreditů. Jsou to záložní varianty, ne první volba.
- **Cloudflare Workers Free** jako hosting Next.js vyžaduje adaptér OpenNext
  a současný OR-Tools spouští Python přes `child_process`, který Workers
  nepodporují. Nebylo by to nasazení beze změny.

## 1. `docs/LEADERSHIP_DEMO_TODO.md` (příprava na prezentaci vedení)

### Fáze 0 — Stabilizace (před prezentací)
- [ ] Ověřit nový start `npm run dev` bez chyby — `BLOCKED`: server na portu 3000 už běžel; další `npm run dev` skončil kvůli existujícímu Next dev serveru. Stávající server odpovídá, ale nebyl zastaven ani nahrazen.
- [ ] Ověřit přihlášení managera a vieweru — `BLOCKED`: existující browser session zobrazuje roli managera, ale credentials nebyly znovu zadány; samostatný viewer účet/session vyžaduje databázi. Cílová databáze nebyla bezpečně určena pro zápis.
- [x] Ověřit načtení všech stránek bez HTTP 500 — `VERIFIED` přes HTTP 200: `/`, `/planovani`, `/navaznost-smen`, `/zamestnanci`, `/pozadavky`, `/pravidla`, `/dovolene`, `/nastaveni`, `/audit`, `/uzivatele`, `/analyzy`, `/prihlaseni`, `/zmena-hesla`.
- [ ] Ověřit, že žádná stránka nezobrazuje „undefined“ nebo prázdné hodnoty — `PARTIAL`: v přístupnostních výpisech všech uvedených stránek se nenašlo „undefined“; prázdné datové stavy s reálnými/testovacími účty nebylo možné ověřit.
- [x] Odstranit debug výstupy a `console.log` z produkčního aplikačního kódu — grep našel jediný `console.log` v `scripts/bootstrap-manager.ts`.

### Fáze 1 — Hlavní tok (Rozpis směn) — MANUÁLNÍ KROK
- [ ] Přidat zaměstnance z anonymizovaného seznamu — `BLOCKED`: podklad neposkytl uživatel; osobní data se nesmí vymýšlet.
- [ ] Zadat absence pro zvolený měsíc — `BLOCKED`: vyžaduje schválené testovací/anonymizované vstupy.
- [ ] Zadat potřebné obsazení — `BLOCKED`: použít managerem potvrzený profil 23/8 Po–Pá a 12/9 So–Ne z `DOMAIN_DECISIONS.md`; nepoužívat historické syntetické hodnoty 15/7 a 7/3 bez nového schválení.
- [ ] Zadat fond práce a omluvené hodiny pro každého — `BLOCKED`: vyžaduje schválené vstupy.
- [ ] Vytvořit návrh (lokální OR-Tools, nebo online Cloudflare AI) — ověřit, že se vygeneruje bez timeoutu — BLOCKED: vyžaduje výše uvedené vstupy a u AI i přístupové údaje.
- [ ] Zkontrolovat nálezy (problémy, neověřené, fond) — zobrazit managerovi — BLOCKED: vyžaduje výše uvedené vstupy.
- [ ] Potvrdit rozpis (pouze pokud `canConfirm === true`) — BLOCKED: vyžaduje výše uvedené vstupy.
- [ ] Ověřit, že potvrzený rozpis se zobrazí v týdenním pohledu — BLOCKED: vyžaduje výše uvedené vstupy.

### Fáze 2 — Vizuální přesvědčivost (UI/UX)
- [ ] Ověřit mobilní zobrazení (390 px) — `PARTIAL`: v prohlížeči 390 × 844 px je měsíční pruh viditelný a horizontálně posuvný; bez návrhu nelze ověřit naplněnou týdenní tabulku.
- [x] Ověřit tmavý režim (pokud bude zaveden) — N/A: tmavý režim není zaveden (žádný theme toggle / prefers-color-scheme).

### Fáze 3 — Obsah pro prezentaci
- [x] Stránka Pravidla — obsah sjednocen s rozhodnutími: pilot pouze plné úvazky, externí AI povolená, skutečná jména povolená.
- [x] Stránka Dovolené — zřetelně označit jako „připravované“ (SectionPlaceholder s badge „Připravované“).
- [ ] Správa účtů — vytvořit testovací viewer účet pro demo — `BLOCKED`: vyžaduje potvrzení zápisu do jediné stávající Neon databáze (bez zakládání další).

### Fáze 4 — Technická připravenost
- [x] Solver timeout 120 s konfigurovatelný (env `PLANNING_SOLVER_TIMEOUT_MS`).
- [x] Výkonnostní test (20/30 zaměstnanců, historický výsledek v `LEADERSHIP_DEMO_TODO.md`/`ROADMAP.md`; neprokazuje aktuální provozní kapacitu).
- [x] Ověřit, že `npm run build` projde bez varování — finální build po změnách prošel.
- [ ] Ověřit, že CI (GitHub Actions) projde na aktuálním pracovním stromu — lokálně prošly lint, typecheck, 584 Vitest testů (14 přeskočeno), Prisma validace, build, 28 Python testů solveru a 13 solver integračních testů; GitHub CI a jeho izolovaný PostgreSQL job nemají nový běh pro necommitnuté změny.
- [x] Zkontrolovat `.env.example` — doplněny Cloudflare proměnné, `DATABASE_URL_UNPOOLED` a poznámka k Vercelu; database auth mode zůstává. `GEMINI_TIMEOUT_MS` je napojen na provider i translator a pokryt testy.
- [x] Milník 4 (produkční připravenost): přihlášení přes Outlook/Entra není pro MVP potřeba (rozhodnutí 5. 11. 2026). Produkční DB zůstává `NOT VERIFIED`.

### Fáze 5 — Dokumentace pro vedení
- [x] Aktualizovat `README.md` — stav projektu, co je hotové, co je demo.
- [x] Připravit krátký scénář prezentace — `docs/PREZENTACNI_SCENAR.md`.
- [x] Připravit „co není hotové“ — poloviční úvazky mimo pilot, produkční auth/DB, analytika, neověřené AI plánování.

## 2. `docs/ROADMAP.md` — „To‑Do: postup podle auditu před závěrečným testováním“

### P0
- [ ] Sjednocení projektu do `main` a povinný úklid — `BLOCKED`: aktuální Git inventura ukazuje 8 pracovních stromů a další necommitnuté změny mimo tuto práci. Zachovat je a prověřit jejich vlastníkem; nic nesmazat ani nepřepisovat bez určení původu.
- [x] Starší API a ochrana rozpisů (manager-only zápis, ochrana potvrzeného záznamu).
- [x] Zneplatnění starých přihlášení (session version).
- [x] Dočasné blokování chybných databázových přihlášení (10 pokusů).
- [x] Jediné atomické potvrzení (souběžné potvrzení).

### P1
- [x] Pravdivé zdroje obsazení (uložený vs. výchozí profil).
- [ ] Pravidla a limity plánování — pilotní body jsou zapsané a rozpor úvazků je vyřešený: pilot pouze plné úvazky. Výkon zůstává `PARTIAL`; historický test není důkazem provozní kapacity.
- [x] Správa rozpisů (seznam, odstranění, audit, návaznost).
- [x] AI a citlivý text — rozhodnuto (`VERIFIED`, 6. 11. 2026): Cloudflare Workers AI, skutečná jména i volný text povoleny, nulové uchovávání a žádné trénování. Zbývá ověřit reálné volání a spotřebu kvóty.
- [ ] Ověřit reálné volání Cloudflare Workers AI na smyšleném měsíci — `BLOCKED`: chybí `CLOUDFLARE_ACCOUNT_ID` a `CLOUDFLARE_API_TOKEN` v prostředí; klíče nepatří do chatu ani repozitáře.
- [ ] Kvalita a přístupnost — klávesnice/popisky/fokus mají doložené testy; skutečná čtečka obrazovky nebyla ověřena. `npm audit --omit=dev`: 0 zranitelností; plný `npm audit`: 8 středně závažných nálezů ve vývojové závislosti `minimatch`; automatická oprava by znamenala breaking downgrade `eslint-config-next` na v15, kompatibilní oprava není ověřená.

### P2 — Závěrečné ověření MVP
- [ ] Syntetický průchod návrh → kontrola → potvrzení → obnovení — jednotlivé části jsou historicky ověřené synteticky a lokální solver testy prošly; závěrečný souvislý průchod včetně izolované databáze a všech rolí zůstává v `ROADMAP.md` otevřený. Pro online AI větev chybí reálné volání.
- [ ] Online nasazení na Vercel Hobby + stávající Neon — `PLANNED`: nejprve náhled, ověření přihlášení a migrací, potom ostrá adresa. Vyžaduje potvrzení zápisu do databáze a nastavení klíčů ve Vercelu.

## 3. Dokumentace projektu

- [x] `AGENTS.md` — nekomerční status, Cloudflare AI, povolená skutečná jména, plný úvazek v pilotu.
- [x] `README.md` — cíl, hosting, AI poskytovatel, poloviční úvazky mimo pilot, bezpečnostní hranice.
- [x] `docs/DOMAIN_DECISIONS.md` — nová sekce Projekt a provoz; opraveny úvazky a externí AI.
- [x] `docs/DOMAIN_SPECIFICATION.md` — AI model, H9, rozsah pilotu a hosting.
- [x] `docs/ROADMAP.md` — AI, úvazky a cílové nasazení.
- [x] `docs/PLANNING_CONTRACT.md` — Cloudflare provider a konfigurace.
- [x] `docs/LEADERSHIP_DEMO_TODO.md`, `docs/PREZENTACNI_SCENAR.md` — úvazky a hosting.
- [x] `docs/README.md` — poškozený soubor s neplatnými českými znaky přepsán a doplněn.
- [x] `.env.example` — Cloudflare, `DATABASE_URL_UNPOOLED`, Vercel poznámky.

## 4. `README.md` / `AGENTS.md` — explicitní hranice

- Produkční autentizace, databáze a integrace nejsou ověřené ani připravené k nasazení.
- Repozitář neobsahuje skutečná zaměstnanecká data; jediná připojená Neon databáze
  může obsahovat uživatelem vložená data a zápisy do ní vyžadují potvrzení.
- Entra ID je pouze budoucí `PLANNED` varianta.

## 5. `docs/DOMAIN_DECISIONS.md`

- Produkční připravenost: `VERIFIED` rozhodnutí ponechat `NOT VERIFIED`;
  ověření později se schválením.

---

Poznámka: Tento soubor shrnuje existující dokumentaci; jednotlivé položky
zůstávají v původních dokumentech s jejich stavovými popisky (`VERIFIED`,
`IMPLEMENTED`, `NOT VERIFIED`, `OPEN QUESTION`).
