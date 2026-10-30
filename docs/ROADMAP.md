# Roadmapa — Plánovací Engine

> Stav zkontrolovaný 30. 10. 2026 proti kódu, spuštěným kontrolám a schválenému směru další práce.
> Význam popisků vysvětluje
> [`docs/README.md`](README.md#stavové-popisky).

## 1. Stav jednou větou

Plánovací jádro, doménová validace, AI kontrakt, orchestrátor, napojení demo UI,
lokální MVP login gate a perzistenční/auditní vrstva jsou implementované.
Reálné volání Gemini je ověřené integračním testem; vstupy dema zůstávají
syntetické. Produkční autentizace, Entra rekonstrukce a živé PostgreSQL připojení
jsou `NOT VERIFIED` nebo `PLANNED`; lokální Docker PostgreSQL běh je `VERIFIED`.

## 2. Implementováno a doložitelně ověřeno

| Oblast | Co existuje | Doklad |
| --- | --- | --- |
| Next.js aplikace | App Router, routy, produkční build | `app/`, `npm run build` |
| Demo UI | dashboard a pracovní plocha se syntetickými daty | `components/`, `lib/demo-data.ts` |
| Generické jádro | kontrakty, `runControl()`, tři stavy kontroly | `lib/planning/types.ts`, `control.ts`; 16 testů |
| Doménový kontrakt | typy prvního týdne, potvrzené časy a pravidla | `lib/planning/domain/`, `PLANNING_CONTRACT.md` |
| Deterministická validace | `validatePlan()`: vstup, pokrytí, překryvy, absence, odpočinek, víkend | `domain/validation.ts`; 54 testů v `domain/` |
| AI kontrakt | `PlanningModelProvider`, `AiProviderError`, `isPlanDraft()` | `lib/planning/ai-provider.ts` |
| Orchestrace | `runPlanning()`: vstup → AI → validace → změny a pokrytí | `lib/planning/orchestrator.ts`; 12 testů |
| Simulovaný provider & Fáze 2 API | 3 fixture scénáře, `POST /api/planning/run`, `POST /api/planning/confirm` | `lib/planning/simulated/`, `app/api/planning/`; 18 testů |
| UI napojení | `PlanningResult` komponenta, výběr scénáře, badge `SIMULATED`, blokace potvrzení | `components/plan/plan-workspace.tsx`, `planning-result.tsx` |
| Gemini adaptér | serverové volání, strukturovaný JSON, konfigurace v prostředí | `lib/ai/gemini-planning-provider.ts`; 7 unit testů + 1 integrační test |
| Auth.js / lokální login gate | credentials přihlášení, session, role a ochrana aplikace bez CRM | `auth.ts`, `lib/auth/`, `proxy.ts`; MVP `IMPLEMENTED` |
| Budoucí Entra brána | ponechaný provider-neutral základ pro pozdější rekonstrukci | `lib/auth/config.ts`; `PLANNED` |
| Perzistence a audit | snapshot běhu, potvrzený plán, auditní událost | `lib/planning/persistence.ts`, `prisma/schema.prisma`; lokální Docker DB `VERIFIED`, produkční DB `NOT VERIFIED` |
| Čtecí auditní pohled | historie `planning.confirmed` pro managera | `app/(app)/audit/page.tsx`, `lib/planning/audit-service.ts`; logika přístupu ověřená unit testy |
| Operativní náhrada | incident, tři simulované varianty, deterministické změny/pokrytí/validace, výběr a nová potvrzená verze | `lib/planning/replacement-service.ts`, `app/api/planning/replacement/`; cílené unit/route testy prošly |
| Nastavení potřebného obsazení | týdenní tabulka 7 × 2, manager-only API zápis, Prisma persistence a použití při operativní náhradě | `app/(app)/nastaveni/`, `app/api/settings/staffing/`, `lib/planning/staffing-settings.ts`; implementace, lokální migrace a manuální DB/browser smoke jsou `VERIFIED` v syntetickém pilotu |
| Schvalování požadavků | dvě syntetické ukázky, náhled dopadu na směny a dostupných kandidátů, manager-only schválení/zamítnutí; rozhodnutí se ukládá bez změny rozpisu | `/pozadavky`, `app/api/requests/`, `EmployeeRequestDecision`; unit/route testy a izolovaný lokální DB/browser smoke prošly; skutečný příjem požadavků a AI návrh pokrytí jsou `NOT VERIFIED` |
| Prisma základ | PostgreSQL datasource, provozní modely a připravená migrace bez doménových modelů | `prisma/schema.prisma`, `prisma/migrations/` |
| CI | lint, typecheck, testy, build a validace Prisma | `.github/workflows/ci.yml` |

Aktuální ověření pracovního stromu (30. 10. 2026):

- `npm run lint` — prošlo bez warningů.
- `npm run typecheck` — prošlo.
- `npm test -- --run` — 235 prošlo, 1 přeskočen (Gemini integrační test nebyl
  součástí běžné sady).
- `npm run build` — prošlo.
- `npm run db:validate` — schéma je validní.
- Oddělený Gemini integrační test a manuální Docker/browser smoke nejsou součástí
  této kontroly; jejich dříve zaznamenané výsledky zůstávají omezené na lokální
  konfiguraci a syntetický pilot.
- Cílený staffing test `npm test -- --run lib/planning/staffing-settings.test.ts tests/staffing-settings-routes.test.ts` — 10 testů prošlo.
- Manuální staffing browser smoke v izolované dočasné databázi — manager načetl
  profil 23/8 pro všední dny a 12/9 pro víkend, změnil středeční ráno na 24,
  po uložení a reloadu se hodnota zachovala a poté byla vrácena na 23.
  Operativní náhrada převzala uložené úterní odpolední minimum 5, ukázala
  pokrytí 8/5 a platný návrh; hodnota byla následně vrácena na 8. Návrh nebyl
  potvrzen. Dočasná databáze byla po průchodu odstraněna; původní lokální pilotní
  databáze zůstala nedotčená.
- Po restartu PC byl Docker Desktop znovu spuštěn; `planning-engine-postgres`
  se zotavil a `pg_isready` potvrdil, že přijímá spojení. Původní staffing
  browser smoke se neopakoval, protože běžná lokální Auth.js konfigurace nemá
  `AUTH_SECRET`.
- Prisma migrace rozhodnutí o požadavcích byla aplikována do existující lokální
  databáze `planning_engine`. Manager schválil jednu a zamítl druhou ukázkovou
  žádost v izolované dočasné databázi; obě rozhodnutí zůstala po návratu na
  stránku zachovaná a rozpis zůstal beze změny. Použita byla syntetická testovací
  identita; dočasná databáze byla odstraněna.
- Regresní test operativní náhrady potvrzuje, že výslovné přijetí změny dovolené
  nepřebije blokující pravidlo 35hodinového odpočinku.

## 3. Implementováno, ale potřebuje ověření nebo potvrzení

| Oblast | Co chybí | Dopad |
| --- | --- | --- |
| Výklad OQ21 | „pracovní den“ = kalendářní den s alespoň jednou směnou je `VERIFIED` | platí pro první řez; více směn v dni se počítá jednou |
| Výklad OQ24 | víkendová odpolední směna 12:45–21:00 je pevně daná kvůli půlhodinové pauze; validace používá hrubé časy | není to pracovněprávní posudek ani výpočet placené doby |
| OQ23 | částečně neúplný návrh lze zobrazit, ale potvrzení je blokované | `VERIFIED`; potvrdit lze jen kompletní návrh |
| Význam stavů | `ready_for_review` znamená „validace nic nenašla“, ne schválení | UI to zobrazuje jako „Připraveno ke kontrole“ s tlačítkem potvrzení |
| Plnění `explanations` a `alternatives` | typ je hotový, kvalita výstupu modelu není ověřená | manažer nemusí dostat použitelné vysvětlení |
| Operativní náhrady | syntetický vertikální řez je implementovaný a testovaný | provozní limity OQ10, skutečná data a produkční workflow zůstávají `NOT VERIFIED` |

## 4. Hotové (Fáze 2 – napojení UI na orchestrátor)

Pořadí odpovídá provedené práci.

1. ✅ **Napojit UI na orchestrátor.** Route handlery `POST /api/planning/run` a `/confirm` volají `runPlanning()` přes `run-service.ts`; API klíč zůstává jen na serveru.
2. ✅ **Zobrazit výsledek po vrstvách.** `PlanningResult` komponenta odděluje návrh, výsledek validace a potvrzený stav; zobrazuje změny, pokrytí, nálezy a předpoklady.
3. ✅ **Přidat potvrzení manažera.** `ConfirmedPlan` vzniká až výslovnou akcí v `confirm-service.ts`; `ready_for_review` se netváří jako schváleno; částečný návrh blokován (OQ23).
4. ✅ **Provider režim.** `PLANNING_PROVIDER=simulated|gemini`; bez hodnoty → `ai_not_configured`. Žádný tichý fallback.
5. ✅ **Simulované fixtures.** Tři scénáře (`complete`, `partial`, `unverified`) pro pevný týden; provider selže u jiného týdne/neznámého zaměstnance.
6. ✅ **In-memory registr pro služby.** `PlanningRunRegistry` zůstává testovací
   vrstvou pro čistou službu; aplikační route handlery používají explicitní
   perzistenci a nevracejí snapshot klientovi.
7. ✅ **Autentizace a role.** Route handlery vyžadují lokální Auth.js session;
   potvrzení je omezené na roli `manager`, bez CRM/Graph integrace. Entra je
   ponechané jako budoucí explicitní režim.
8. ✅ **Perzistence a audit.** `PLANNING_PERSISTENCE=prisma` ukládá snapshot
   běhu, potvrzený návrh a událost `planning.confirmed`; `memory` je pouze pro testy.
9. ✅ **Testy a CI.** Integrační minimum pokrývá anonymní přístup, viewer/manager
   oprávnění, konfiguraci, simulované scénáře, potvrzení, idempotenci a neznámý návrh.
10. ✅ **Čtecí audit potvrzení.** Manager vidí existující události
    `planning.confirmed`; viewer k nim nemá přístup. Nejde o plný audit změn.
   Celá sada je zelená.

**Blokátory pro další práci:** žádný technický pro demo. Výklad OQ21, OQ23 a
OQ24 je potvrzený pro první řez a skutečné volání Gemini je ověřené. Lokální
login gate a Docker PostgreSQL běh jsou ověřené; produkční hranice zůstává
neověřená.

## 5. Aktuální target po kontrolním checkpointu

Toto je nejbližší pracovní cíl před přechodem na další produktovou fázi. Body
1–6 jsou dokončené v rozsahu tohoto technického základu; produkční autentizace
a produkční databáze zůstávají `NOT VERIFIED`.

1. ✅ **Sjednotit dokumentaci a demo UI se skutečným stavem.** Odstranit texty,
   které stále tvrdí, že napojení UI nebo zobrazení validace chybí. Zachovat
   jasné označení, že data jsou syntetická a aplikace není produkční systém.
2. ✅ **Doplnit integrační testovací minimum.** Route-handler testy pokrývají
   nekonfigurovaný provider, neplatný JSON, kompletní, částečný a neověřený
   scénář, potvrzení, opakované potvrzení a neznámé `proposalId`.
3. ✅ **Vyřešit podporovaný týden v demu.** Při jiném týdnu UI předem zobrazí
   srozumitelný stav `DEMO` a běh na API vůbec neodešle.
4. ✅ **Uzavřít OQ21, OQ23 a OQ24.** Rozhodnutí jsou zapsaná v
   [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md); validace používá schválený
   výklad a neúplné návrhy zůstávají blokované k potvrzení.
5. ✅ **Ověřit Gemini a připravit produkční hranici.** Integrační test s lokální
   konfigurací proběhl.
6. ✅ **Přidat MVP login gate a provozní uložení.** Lokální credentials session,
   role, snapshoty, potvrzení a audit jsou implementované bez CRM spojení. Entra
   rekonstrukce je `PLANNED`; lokální Docker DB běh je `VERIFIED`, produkční DB
   zůstává `NOT VERIFIED`.
7. ✅ **Zpřístupnit čtecí audit potvrzení.** Pohled `/audit` je dostupný pouze
   managerovi a čte jen uložené události `planning.confirmed`. Rozsah plného
   auditu a další role zůstávají `OPEN QUESTION`.

Původně doporučené ověření produkční hranice autentizace a databáze je nyní
`DEFERRED`: k tomuto kroku se vrátíme až po představení projektu vedení AAAAuto
a schválení jeho implementace jako firemního nástroje. Entra rekonstrukce,
produkční databáze, širší audit a další role proto nejsou aktuálním úkolem;
integrace s CRM zůstává mimo rozsah.

### Nejbližší aktivní kroky

1. ✅ **Ověřit lokální staffing pilot.** V existujícím lokálním kontejneru
   `planning-engine-postgres` byla aplikována migrace; `/nastaveni` prošlo jako
   manager i viewer, reload zachoval hodnoty a operativní náhrada použila uložené
   minimum pro konkrétní den a směnu. Unit/route testy, Prisma validace a manuální
   browser smoke jsou `VERIFIED` v rozsahu syntetického pilotu.
2. ✅ **Aktualizovat dokumentaci po ověření.** Tento záznam obsahuje skutečný
   lokální cíl a skutečný výsledek průchodu. Produkční databáze, produkční role a
   kvalita plánování zůstávají mimo toto ověření.
3. **Uzavřít zbývající doménové brány před další implementací.** Odpověď
   managera z 30. 10. 2026 částečně uzavřela OQ22: manager rozhoduje o přijetí
   požadavku, vidí dopad a při náhradě musí výslovně přijmout změnu dovolené;
   35hodinový odpočinek zůstává tvrdou podmínkou. Otevřené zůstávají konkrétní
   limity náhrad OQ9–OQ11, úplný rozsah auditu OQ20, přesné datum náhradního
   volna a zda staffing nastavení platí jako týdenní šablona, nebo pro konkrétní
   kalendářní týden.

Detailní pořadí souborů a testů je v
[`docs/superpowers/plans/2026-10-29-operativni-nahrady.md`](superpowers/plans/2026-10-29-operativni-nahrady.md).

Do tohoto kroku stále nepatří produkční autentizace, produkční PostgreSQL,
Outlook, CRM, roster ani podpora částečných úvazků.

## 6. Pozdější rozšíření

- Více týdnů nebo měsíční rozsah.
- Částečné úvazky, pokud je manažer potvrdí.
- Role a dovednosti jako povinná data.
- Váhy preferencí a optimalizační cíle.
- Import/export a integrace (Countdown CRM je jen budoucí směr).
- Širší audit a rozšířená správa rolí.
- Ukládání historie a zamykání přiřazení.
- Dílčí nástup uprostřed již probíhající směny.
- Plný audit odmítnutých variant a opuštěných rozpracovaných incidentů.

## 7. Otevřené otázky

- Zda musí být dva dny volna po víkendu po sobě jdoucí.
- Konfigurovatelný profil limitů, role a zamykání přiřazení (OQ9–OQ11).
- Zpracování požadavků a preferencí mimo pokrytí a nejmenší dopad
  (OQ12–OQ14, OQ17).
- Statický vs. průběžně upravovaný plán (OQ2).
- Způsob zadávání vstupů a tvar výstupu (OQ6–OQ8).
- Role, schvalovací tok a audit (OQ18–OQ20).
- Přesné rozlišení skutečné dovolené, plánovaného dne volna a náhradního volna
  a jejich provozní/HR postup při změně (OQ22).
- Vizuální detaily demo UI (barva odpolední směny, avatary, ikona
  „Nesplněné požadavky“) — `OPEN QUESTION`; zdrojem pravdy je
  `app/globals.css`.

Podrobnosti a místo pro odpovědi: [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md).

## 8. Známé vady a dluhy

- **Produkční Prisma připojení** nebylo v tomto checkpointu ověřeno; lokální migrace
  a zápis potvrzení byly ověřeny v Docker PostgreSQL. Bez
  `PLANNING_PERSISTENCE=prisma` a `DATABASE_URL` route handler běh odmítne.
- **Lokální MVP login gate** není produkční autentizace; účet a heslo jsou pouze
  v lokálním ENV a testy používají syntetické údaje.
- **Entra autentizace** je ponechaná jako `PLANNED` budoucí rekonstrukce brány.
- **Potvrzení manažera** se v aplikačním režimu ukládá přes Prisma a zapisuje audit;
  `memory` zůstává pouze testovací režim.
- **Čtecí audit** v tomto kroku ukazuje jen události `planning.confirmed` a je
  dostupný pouze managerovi. Nejde o historii všech změn ani o rozhodnutí OQ20.
- **Operativní náhrada** je implementovaná pouze jako syntetický pilot. Umí
  vytvořit pracovní snapshot, zobrazit varianty a potvrdit novou verzi přes
  existující persistence API; bez lokálního `DATABASE_URL` aplikační route
  správně odmítne běh, protože `memory` je pouze testovací režim.
- **Reálné volání Gemini** je `VERIFIED` integračním testem. Kvalita výstupu pro
  produkční provoz a práce s reálnými daty zůstávají `NOT VERIFIED`.
- **OQ24** je potvrzené pouze jako výklad pro plánovací engine: validace
  používá hrubé časy a neposuzuje odpracovanou ani placenou dobu.

## 9. Historie

- **22.–23. 10. 2026:** generické jádro a ADR 0001–0004, doménový kontrakt,
  první deterministická validace.
- **24. 10. 2026:** potvrzená rozhodnutí (AI jako hlavní logika, časy směn,
  odpočinek, víkend); Gemini adaptér a orchestrátor.
- **22. 10. 2026:** vizuální revize demo UI commitnuta (`de6d4f0`); zdrojem
  pravdy je `app/globals.css`, ne starší vizuální zadání.
- **Následně:** code review — hluboká validace vstupu před AI, deduplikace
  pokrytí a změn, dvouvrstvá kontrola `PlanDraft` a doplněné testy.
- **26. 10. 2026:** sjednocení dokumentace na pět dokumentů a ADR; zrušeny
  duplicitní souhrny a historické tasky.
- **26. 10. 2026:** lint je zelený; dokumentace a demo UI srovnány se
  skutečným stavem kódu.
- **26. 10. 2026:** **Fáze 2 dokončena** — route handlery `/api/planning/run` a
  `/confirm`, simulovaný provider se třemi scénáři, `PlanningResult` komponenta,
  in-memory registr potvrzení, 18 nových testů, build zelený.
- **28. 10. 2026:** dashboard sjednocen se stavem Fáze 2; přidáno 8 testů
  veřejných route handlerů, 2 testy podporovaného týdne a regresní testy
  doménových rozhodnutí; plná sada má 148 průchozích testů a 1 přeskočený
  Gemini integrační test bez klíče.
- **28. 10. 2026:** potvrzeny výklady OQ21, OQ23 a OQ24; validační a
  potvrzovací popisky sjednoceny s těmito rozhodnutími.
- **28. 10. 2026:** integrační test s lokální konfigurací úspěšně ověřil skutečné
  volání Gemini a strukturovaný návrat `PlanDraft`.
- **28. 10. 2026:** přidán lokální MVP login gate bez CRM/Graph, role
  manager/viewer, Prisma snapshoty běhů, potvrzení a audit; Entra provider zůstal
  připravený jako budoucí autentizační brána; plná sada má 167 průchozích testů
  a 1 přeskočený integrační test. Lokální Docker smoke ověřil migraci, potvrzení
  a auditní událost.
- **28. 10. 2026:** přidán čtecí pohled `/audit` pro managera nad uloženými
  událostmi `planning.confirmed`; viewer k nim nemá přístup. Nejde o plný audit
  změn a produkční databáze zůstává `NOT VERIFIED`.
- **29. 10. 2026:** implementován syntetický tok operativní náhrady: doménový
  kontrakt, simulovaný provider se třemi variantami, deterministické změny/
  pokrytí/validace, snapshot, manager-only potvrzení nové verze a auditní událost
  `planning.replacement_confirmed`; plná sada má 209 průchozích testů a 1 přeskočený.
- **29. 10. 2026:** přidáno manager-only nastavení potřebného obsazení s Prisma
  persistencí; staffing migrace a manuální lokální DB/browser smoke ověřily uložení,
  načtení, viewer přístup a použití hodnoty v syntetické operativní náhradě.
- **30. 10. 2026:** údržbová kontrola potvrdila čistý pracovní strom; lint,
  typecheck, 222 testů (1 Gemini integrační test přeskočen), build a Prisma
  validace prošly před doplněním schválení dovolené a toku požadavků.
- **30. 10. 2026:** doplněno výslovné managerovo přijetí změny schválené
  dovolené při operativní náhradě a syntetický review tok požadavků s uloženým
  rozhodnutím. Následná sada má 235 úspěšných testů a 1 přeskočený Gemini test;
  lokální Docker/browser smoke potvrdil zachování obou rozhodnutí bez aplikace
  změny rozpisu.

## 10. Odkazy

- [Přehled dokumentace](README.md)
- [Minimální datový kontrakt](PLANNING_CONTRACT.md)
- [Návrh doménové specifikace](DOMAIN_SPECIFICATION.md)
- [Rozhodovací list pro managera](DOMAIN_DECISIONS.md)
- [Architektonická rozhodnutí (ADR)](adr/README.md)
- [Plánovací jádro](../lib/planning/README.md)
- [Projektové instrukce](../AGENTS.md)
