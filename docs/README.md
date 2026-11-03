# Dokumentace — Plánovací Engine

Technický repozitář: `planning-engine`

Rozcestník dokumentace. Každý dokument má jednu hlavní odpovědnost a podrobnosti
jiných dokumentů neopakuje.

## Kde co hledat

| Dokument | Odpovídá na | Stav |
| --- | --- | --- |
| [`../README.md`](../README.md) | Co projekt je, jaký je stav a jak ho spustit | `IMPLEMENTED` |
| [`../AGENTS.md`](../AGENTS.md) | Pravidla práce coding agenta a meze autonomie | `IMPLEMENTED` |
| [`ROADMAP.md`](ROADMAP.md) | Co je hotové, co chybí a co dělat dál | `IMPLEMENTED` (pracovní plán) |
| [`PLANNING_CONTRACT.md`](PLANNING_CONTRACT.md) | Původní týdenní AI kontrakt a odkazy na měsíční tok | `PROPOSAL` (kontrakt) / `IMPLEMENTED` (kód) |
| [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) | Doménový model a pravidla s mírou potvrzení | `PARTIALLY VERIFIED PROPOSAL` |
| [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md) | Otevřené otázky a odpovědi managera | `PARTIALLY ANSWERED` |
| [`superpowers/specs/2026-10-30-mesicni-mvp-design.md`](superpowers/specs/2026-10-30-mesicni-mvp-design.md) | Schválený rozsah a vizuální směr měsíčního MVP | `VERIFIED` jako návrh, nikoli automaticky implementace |
| [`adr/`](adr/README.md) | Proč jsou technická rozhodnutí taková | `IMPLEMENTED` |
| [`superpowers/specs/2026-10-29-operativni-nahrady-design.md`](superpowers/specs/2026-10-29-operativni-nahrady-design.md) | Historický návrh operativních náhrad; novější odpovědi managera z 30. 10. 2026 mají přednost | `SUPERSEDED` |
| [`superpowers/plans/2026-10-29-operativni-nahrady.md`](superpowers/plans/2026-10-29-operativni-nahrady.md) | Historický implementační plán; aktuální stav je v roadmapě | `SUPERSEDED` |
| [`../lib/planning/README.md`](../lib/planning/README.md) | Co skutečně obsahuje plánovací jádro | `IMPLEMENTED` |
| [`../prisma/schema.prisma`](../prisma/schema.prisma) | Identita, zaměstnanci, běhy, staffing a rozhodnutí | `IMPLEMENTED` (lokální migrace `VERIFIED`, produkční DB `NOT VERIFIED`) |

## Aktuální stav

| Oblast | Stav | Poznámka |
| --- | --- | --- |
| Next.js aplikace a routy | `IMPLEMENTED` | App Router, TypeScript, React |
| Demo UI | `IMPLEMENTED` / `DEMO` | Syntetická data z `lib/demo-data.ts` |
| Generické plánovací jádro | `IMPLEMENTED` | `lib/planning/types.ts`, `control.ts` |
| Doménový kontrakt | `IMPLEMENTED` | `lib/planning/domain/`; kontrakt je `PROPOSAL` k ověření |
| Deterministická validace | `IMPLEMENTED` | `validatePlan()`; testy procházejí |
| AI kontrakt | `IMPLEMENTED` | `lib/planning/ai-provider.ts` |
| Gemini adaptér | `IMPLEMENTED` / `VERIFIED` | `lib/ai/gemini-planning-provider.ts`; integrační volání prošlo, produkční kvalita výstupu `NOT VERIFIED` |
| Orchestrace | `IMPLEMENTED` | `runPlanning()` spojuje návrh, validaci a změny |
| Starší týdenní API | `IMPLEMENTED` / `DEMO` | `POST /api/planning/run`; samostatné týdenní UI bylo odstraněno |
| Měsíční pilot | `IMPLEMENTED` / `NOT VERIFIED` | Měsíční formulář, lokální OR-Tools, kontrola a ruční úpravy; týden je pohled do měsíce. Syntetické ověření a omezení popisuje [roadmapa](ROADMAP.md). Schválený záměr hlavní role AI se liší od implementace. |
| Zaměstnanci pro plánování | `IMPLEMENTED` | Manažer spravuje trvalý seznam a může načíst aktivní zaměstnance do měsíčního návrhu. Odebrání zachová historii a zaměstnance lze znovu zařadit se stejnou identitou. |
| Přihlášení a role | `IMPLEMENTED` / `VERIFIED` (lokální syntetický smoke) | Auth.js podporuje vývojový local režim a databázové účty v PostgreSQL; vytvoření účtu, změna hesla a zneplatnění deaktivované session prošly lokálním browser průchodem. Produkční úroveň a Entra ID zůstávají `NOT VERIFIED`/`PLANNED` |
| Správa přihlašovacích účtů | `IMPLEMENTED` / `VERIFIED` (izolovaná lokální PostgreSQL) | `/uzivatele`, manager-only API a jednorázový `db:bootstrap-manager`; migrace, bootstrap, create, role, reset, povinná změna hesla, viewer denial i souběžná ochrana posledního managera byly ověřeny synteticky. Produkce `NOT VERIFIED` |
| Potvrzení manažera | `IMPLEMENTED` | `POST /api/planning/confirm`, manager-only, blokace částečných/neověřených návrhů |
| Ukládání běhů a potvrzení | `IMPLEMENTED` / `VERIFIED` (lokální Docker smoke) | Prisma snapshot a `ConfirmedPlan`; migrace a zápis potvrzení byly ověřeny v izolované lokální PostgreSQL |
| Audit potvrzení | `IMPLEMENTED` / `VERIFIED` (lokální Docker smoke) | Zápis `planning.confirmed` byl ověřen; čtecí pohled je `IMPLEMENTED` pro managera a ukazuje pouze tato potvrzení |
| Operativní náhrada směny | `IMPLEMENTED` / `SIMULATED` | Syntetický řez: výpadek celé směny → tři varianty → deterministický dopad → výběr → manager-only potvrzení; Gemini a provozní kvalita `NOT VERIFIED` |
| Nastavení potřebného obsazení | `IMPLEMENTED` / `VERIFIED` (lokální smoke) | `/nastaveni`, manager-only zápis přes API, Prisma persistence a použití v operativních náhradách; migrace a manuální browser smoke proběhly v lokálním Docker PostgreSQL |
| Rozhodování o požadavcích | `IMPLEMENTED` / `SIMULATED` | `/pozadavky` ukazuje dopad dvou syntetických požadavků, dostupné kandidáty a manager-only schválení/zamítnutí; rozhodnutí se ukládá přes Prisma a samo neupraví rozpis |
| Testy | `IMPLEMENTED` | Výsledky a rozsah posledního zaznamenaného ověření uvádí [roadmapa](ROADMAP.md). |
| Kvalitní brána (CI) | `IMPLEMENTED` / `VERIFIED` (lokální běh) | Testy, typecheck, lint, build a `db:validate` prošly; úplná provozní/produkční brána z toho nevyplývá |
| Produkční připravenost | `NOT VERIFIED` | Není produkční aplikace |

## Stavové popisky

| Popisek | Význam |
| --- | --- |
| `IMPLEMENTED` | Kód nebo typ existuje. Neznamená, že chování je ověřené. |
| `VERIFIED` | Konkrétní chování je doložené testem, příkazem nebo potvrzeným rozhodnutím. |
| `ASSUMPTION` | Pracovní předpoklad, který nikdo nepotvrdil. |
| `OPEN QUESTION` | Čeká na rozhodnutí nebo chybějící informaci. |
| `PLANNED` | Implementace zatím neexistuje. |

Pomocné popisky: `NOT VERIFIED` (neověřeno), `DEMO`/`SIMULATED` (jen
demonstrační chování), `PARTIALLY ...` (částečně), `SUPERSEDED` (nahrazeno),
`BLOCKED` (nelze pokračovat bez rozhodnutí).

`IMPLEMENTED` a `VERIFIED` se neslučují: implementovaná funkce může být
neověřená a naopak.

## Otevřené otázky

Plný seznam OQ1–OQ24 je v [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md);
odpovědi a varianty sbírá [`DOMAIN_DECISIONS.md`](DOMAIN_DECISIONS.md). OQ21,
OQ23 a OQ24 jsou pro první řez uzavřené. Pro operativní náhrady jsou nejdůležitější:

1. Která další pravidla a limity platí (OQ9–OQ11), zejména maximum hodin/směn?
2. Jaké přesné datum má mít náhradní volno po záskoku během schválené dovolené (OQ22)?
3. Jak se mají vážit a porovnávat varianty náhrady (OQ12–OQ14, OQ17)?
4. Jak podrobný má být audit operativní změny (OQ20)?

## Historický checkpoint týdenního řezu

Následující kroky zachycují dřívější ověření týdenního řezu. Aktuální měsíční
stav a otevřené body jsou v [roadmapě](ROADMAP.md).

1. ✅ **Sjednotit zdroj pravdy o stavu.** Opravit zastaralé texty v dashboardu,
   které stále tvrdí, že napojení UI a kontrola výsledku chybí. Po změně znovu
   ověřit, že `README.md`, `docs/README.md`, `docs/ROADMAP.md` a obrazovka
   používají stejné stavové popisky.
2. ✅ **Zpevnit demo tok testy.** Route-handler testy pokrývají nekonfigurovaný
   provider, úspěšný simulovaný běh, neúplný návrh, neověřený scénář a
   potvrzení včetně chybových větví.
3. ✅ **Odstranit nejasnost kolem simulovaného týdne.** Demo UI u jiného týdne
   předem zobrazuje stav `DEMO` a výpočet na API neodesílá.
4. ✅ **Uzavřít doménová rozhodnutí před rozšířením.** OQ21, OQ23 a OQ24
   jsou potvrzené pro první řez; jejich omezení zůstávají popsána v doménové
   dokumentaci.
5. ✅ **Připravit technickou hranici MVP.** Reálné volání Gemini je ověřené,
   lokální login gate chrání aplikaci a běh/potvrzení/audit mají perzistenční
   vrstvu. Lokální Docker smoke je `VERIFIED`; produkční autentizace a připojení
   k produkční PostgreSQL zůstávají `NOT VERIFIED`.
6. ✅ **Přidat samostatné provozní uložení.** Snapshoty běhů, potvrzené plány
   a auditní události mají Prisma adaptér; migrace a živé lokální DB připojení
   jsou `VERIFIED` v izolovaném Docker prostředí. Produkční DB zůstává
   `NOT VERIFIED`.
7. ✅ **Přidat databázovou správu přístupů.** Migrace zachovává existující
   `AppUser` ID a vazby; jednorázový bootstrap i správa účtů fungují v izolované
   syntetické PostgreSQL. Browser průchod ověřil vynucenou změnu hesla, manager
   a viewer přístup a okamžité odmítnutí deaktivované session. Produkční
   nasazení a zabezpečení zůstávají `NOT VERIFIED`.

8. ✅ **Připravit návrh operativních náhrad.** Schválený design vymezuje jeden
   syntetický týdenní řez: výpadek na celé směně, tři varianty, výběr,
   deterministická validace a potvrzení bez automatické aplikace.

9. ✅ **Implementovat první syntetický vertikální řez operativní náhrady.**
   Kód obsahuje kontrakt, simulované varianty, deterministický výpočet dopadu,
   API, manager-only potvrzení, novou verzi týdne a minimální audit. UI je
   napojené v `ReplacementPanel`; bez potvrzení se uložený plán nemění.
10. ✅ **Přidat konfiguraci potřebného obsazení.** Týdenní tabulka pondělí–neděle
   má ranní a odpolední minimum, manager ji může uložit přes serverové API a
   operativní náhrada používá hodnotu pro konkrétní kalendářní den; chybějící
   hodnota používá aktuální profil Po–Pá 23/8, So–Ne 12/9. Implementace i
   lokální DB/browser smoke jsou `VERIFIED` v rozsahu syntetického pilotu.

## Historický postup po staffing pilotu

Následující pořadí je pracovní plán, nikoli tvrzení o již ověřeném výsledku:

1. ✅ **Ověřit lokální pilot.** V existujícím lokálním kontejneru
   `planning-engine-postgres` byla aplikována staffing migrace. Manuální browser
   průchod ověřil manager zápis, zachování hodnot po reloadu, viewer-only přístup
   a serverový zákaz zápisu vieweru (`403`). Operativní náhrada načetla uložené
   minimum pro cílové úterní odpoledne (`5`) a zobrazila pokrytí `8/5`; návrh
   zůstal nepotvrzený.
2. ✅ **Aktualizovat dokumentaci po ověření.** Tento checkpoint zapisuje skutečný
   lokální cíl, provedenou migraci, role i výsledek browser smoke. Stav
   `VERIFIED` se vztahuje pouze na lokální syntetický pilot, nikoli na produkční
   provoz.
3. **Uzavřít zbývající doménová rozhodnutí před další implementací.** Odpověď
   managera z 30. 10. 2026 částečně uzavřela OQ22. Zbývají limity náhrad
   (OQ9–OQ11), úplný rozsah auditu (OQ20), přesný termín náhradního volna a
   zda staffing nastavení platí jako týdenní šablona, nebo pro konkrétní týden.

Do tohoto pořadí nepatří produkční Entra autentizace, produkční PostgreSQL,
CRM, Outlook ani skutečná zaměstnanecká data. Projekt zůstává technickým
demonstrátorem, dokud nebude produktový tok ověřený managerem.

Produkční autentizace, produkční PostgreSQL, Entra, Outlook, CRM a přenos do
rosteru zůstávají `DEFERRED` a nejsou součástí tohoto targetu.
