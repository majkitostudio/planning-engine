# Roadmapa — Plánovací Engine

> Stav zkontrolovaný 28. 10. 2026 proti kódu. Význam popisků vysvětluje
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
| Prisma základ | PostgreSQL datasource, provozní modely a připravená migrace bez doménových modelů | `prisma/schema.prisma`, `prisma/migrations/` |
| CI | lint, typecheck, testy, build a validace Prisma | `.github/workflows/ci.yml` |

Aktuální ověření pracovního stromu (28. 10. 2026):

- `npm run test` — 173 prošlo, 1 přeskočen (integrační Gemini test bez explicitního spuštění).
- `npm run test -- lib/ai/gemini-planning-provider.integration.test.ts` s lokálním
  `.env.local` — 1 integrační test prošel; skutečné volání Gemini bylo ověřeno.
- `npm run typecheck` — prošlo.
- `npm run build` — prošlo.
- `npm run db:validate` — schéma je validní; migrace byla aplikována na izolovanou
  lokální Docker PostgreSQL a browser smoke test zapsal potvrzený běh i auditní událost.
- `npm run lint` — prošlo bez warningů.

## 3. Implementováno, ale potřebuje ověření nebo potvrzení

| Oblast | Co chybí | Dopad |
| --- | --- | --- |
| Výklad OQ21 | „pracovní den“ = kalendářní den s alespoň jednou směnou je `VERIFIED` | platí pro první řez; více směn v dni se počítá jednou |
| Výklad OQ24 | přestávky se nezapočítávají, používají se hrubé časy začátku a konce | není to pracovněprávní posudek ani výpočet placené doby |
| OQ23 | částečně neúplný návrh lze zobrazit, ale potvrzení je blokované | `VERIFIED`; potvrdit lze jen kompletní návrh |
| Význam stavů | `ready_for_review` znamená „validace nic nenašla“, ne schválení | UI to zobrazuje jako „Připraveno ke kontrole“ s tlačítkem potvrzení |
| Plnění `explanations` a `alternatives` | typ je hotový, kvalita výstupu modelu není ověřená | manažer nemusí dostat použitelné vysvětlení |

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

Dalším doporučeným krokem je ověřit produkční hranici autentizace a databáze bez
rozšíření domény. Entra rekonstrukce, širší audit a další role jsou pozdější
rozšíření; integrace s CRM zůstává mimo rozsah.

## 6. Pozdější rozšíření

- Více týdnů nebo měsíční rozsah.
- Částečné úvazky, pokud je manažer potvrdí.
- Role a dovednosti jako povinná data.
- Váhy preferencí a optimalizační cíle.
- Import/export a integrace (Countdown CRM je jen budoucí směr).
- Širší audit a rozšířená správa rolí.
- Ukládání historie a zamykání přiřazení.

## 7. Otevřené otázky

- Zda musí být dva dny volna po víkendu po sobě jdoucí.
- Role, maximální hodiny, zamykání přiřazení (OQ9–OQ11).
- Zpracování požadavků a preferencí (OQ12–OQ14, OQ22).
- Statický vs. průběžně upravovaný plán (OQ2).
- Způsob zadávání vstupů a tvar výstupu (OQ6–OQ8).
- Role, schvalovací tok a audit (OQ18–OQ20).
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

## 10. Odkazy

- [Přehled dokumentace](README.md)
- [Minimální datový kontrakt](PLANNING_CONTRACT.md)
- [Návrh doménové specifikace](DOMAIN_SPECIFICATION.md)
- [Rozhodovací list pro managera](DOMAIN_DECISIONS.md)
- [Architektonická rozhodnutí (ADR)](adr/README.md)
- [Plánovací jádro](../lib/planning/README.md)
- [Projektové instrukce](../AGENTS.md)
