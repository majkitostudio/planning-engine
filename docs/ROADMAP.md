# Roadmapa a To-Do — Plánovací Engine

> Praktický pracovní seznam pro OpenCode. Stav je zkontrolovaný k 22. 10. 2026.
> Označení `VERIFIED`, `IMPLEMENTED`, `PLANNED`, `OPEN QUESTION`, `BLOCKED` a
> `DEMO` mají stejný význam jako v `AGENTS.md` a `docs/DOMAIN_SPECIFICATION.md`.

## 1. Stav jednou větou

Projekt má funkční technický základ a prohlédnutelné manažerské UI s
demonstračními daty. Skutečný plánovací engine, doménový datový model,
persistentní data a schválená pravidla zatím nejsou hotové. Na pravidlech ale
není závislá příprava obecného toku návrhu a jeho kontroly.

## 2. Co je skutečně hotové

| Oblast | Stav | Co to znamená |
| --- | --- | --- |
| Next.js aplikace | `IMPLEMENTED` | App Router, TypeScript, React a dostupný build. |
| Základní UI | `IMPLEMENTED` / `DEMO` | Dashboard, pracovní plocha plánu, navigace a placeholdery sekcí. |
| Routy | `IMPLEMENTED` jako scaffold | `/`, `/planovani`, `/zamestnanci`, `/pozadavky`, `/pravidla`, `/dovolene`, `/analyzy`, `/nastaveni`, `/prihlaseni`. |
| Plánovací pracovní plocha | `DEMO` | Tabulka směn, filtry, záložky, přehledy a tlačítko výpočtu; data jsou syntetická a výpočet není skutečný. |
| Demo data | `IMPLEMENTED` / `DEMO` | Jsou soustředěna v `lib/demo-data.ts`; neobsahují skutečná osobní data. |
| Prisma | `IMPLEMENTED` technicky | Klient a PostgreSQL konfigurace existují, `prisma/schema.prisma` zatím nemá doménové modely. |
| Čistá plánovací vrstva | `PLANNED` | `lib/planning/` obsahuje pouze popis záměru, žádný engine. |
| Testy | `IMPLEMENTED` minimálně | Vitest běží, ale aktuálně ověřuje pouze testovací infrastrukturu. |
| Doména | `PROPOSAL` | Kontext call centra je potvrzený; pravidla, entity a optimalizační cíle čekají na rozhodnutí. |

Aktuální ověření pracovního stromu:

- `npm run typecheck` — prošlo.
- `npm run test` — prošel 1 smoke test.
- `npm run build` — prošel; statické routy se vygenerovaly.
- `npm run db:validate` — Prisma schéma je validní.

## 3. Co je rozpracované, ale není to hotová produktová funkce

### Vizuální revize UI

- Realizovaná revize vzhledu je commitnutá v repozitáři (vizuálně hotová pro
  demo): chladná světlá paleta `#f4f8fd`, námořní rail `#121c2a` s tmavě modrým
  aktivním prvkem a 2 px světle modrým indikátorem, plná modrá aktivní záložka,
  plné chipy směn (modrá ráno / levandulová odpoledne, zelená dovolená, červená
  nemoc), kruhové tmavé monogramové avatary, vektorová značka
  `components/ui/brand-mark.tsx` a aktualizovaný `app/icon.svg`.
- Zadání v [`OPEN_CODE_VISUAL_TASK.md`](OPEN_CODE_VISUAL_TASK.md) popisovalo
  starší, neutrální směr a je označeno jako `SUPERSEDED`. Nepoužívej ho jako
  zdroj cílového vizuálu; zdrojem pravdy je committed CSS v `app/globals.css`
  a realizované komponenty.
- Tyto změny řeší vzhled a prezentaci. Neřeší plánovací pravidla, databázi ani
  výpočet rozpisu.

Otevřené vizuální otázky (`OPEN QUESTION`, rozhoduje manager):

- [ ] Odpolední směna v levandulové (`--violet`) — jediná barva navíc vedle
  sémantických; alternativa je neutrální šedomodrý chip.
- [ ] Avatary zaměstnanců — zůstat u tmavých monogramů (aktuální stav), nebo
  přejít na tlumené barevné odstíny osob.
- [ ] Ikona „Nesplněné požadavky“ zůstává jantarová (sémantické upozornění,
  demo tón v `lib/demo-data.ts`); alternativa je neutrální šedomodrá ikona
  jako v referenčním vzoru.
- [ ] Referenční vzor `planning-engine-official.png` je uložen mimo repozitář.
  Pokud ho chceme udržet dostupné pro další agenty, zvaž umístit kopii do
  `docs/`.

## 4. Prioritizovaný To-Do list

### P0 — společný technický základ (lze dělat před e-mailem)

- [ ] Připravit obecný tok `návrh rozpisu → kontrola podle dostupných pravidel → výsledek kontroly`.
- [ ] Umožnit, aby návrh vznikl ručně, mechanickým plánovačem nebo později AI;
  všechny zdroje návrhu používají stejnou kontrolu.
- [ ] Pokud nejsou nakonfigurovaná pravidla, vracet stav `NOT VERIFIED`, ne
  úspěšný či schválený plán.
- [ ] Nechat rozhodnutí o přijetí návrhu na managerovi; automatické vytvoření
  návrhu samo o sobě plán neschvaluje.

První konkrétní zadání je v
[`OPEN_CODE_PLANNING_CORE_TASK.md`](OPEN_CODE_PLANNING_CORE_TASK.md).

### P0 — doménová rozhodnutí, která počkají na managera

- [ ] Projít `docs/DOMAIN_SPECIFICATION.md` a schválit minimální doménový
  kontrakt místo současného `PROPOSAL`.
- [ ] Rozhodnout, zda se plán po vygenerování pouze zobrazí, nebo se bude
  průběžně ručně upravovat (OQ2).
- [ ] Potvrdit minimální entity a jejich povinné atributy (OQ3–OQ5).
- [ ] Vybrat první skutečně závazná tvrdá pravidla a jejich konkrétní limity
  (OQ9–OQ11). Kandidáty H1–H7 zatím nebrat jako schválená pravidla.
- [ ] Potvrdit vstup, výstup a chování při konfliktu: odkud data přijdou, jak
  vypadá výsledek a zda je přípustný neúplný plán (OQ6–OQ8, OQ15–OQ17).
- [ ] Rozhodnout, zda první verze potřebuje další role a audit změn
  (OQ18–OQ20).

**Výsledek doménového P0:** krátká schválená specifikace, ze které lze odvodit
konkrétní typy směn, testy pravidel a databázový model. Do té doby zůstávají
doménová pravidla a generování skutečného rozpisu `BLOCKED`; obecný tok návrhu a
kontroly blokovaný není.

### P1 — první doménový vertikální řez (po obdržení odpovědí)

- [ ] Zapsat schválené doménové typy do čisté vrstvy `lib/planning/`.
- [ ] Přidat syntetické fixtures pro jeden měsíc a malý počet zaměstnanců.
- [ ] Implementovat první tvrdá pravidla jako samostatně testovatelné kroky.
- [ ] Implementovat výstup ve tvaru: přiřazení, nepokryté směny, konflikty a
  stav úplnosti plánu.
- [ ] Přidat testy pro běžný případ, kolizi a neúplný vstup.

**Výsledek P1:** čistá funkce, která nad fiktivními daty vytvoří plán nebo
transparentně vrátí konflikty. Bez databáze a bez skutečných zaměstnaneckých
dat.

### P1/P2 — datový základ až po schválení domény

- [ ] Převést schválené entity do `prisma/schema.prisma`.
- [ ] Připravit migraci a bezpečný lokální seed pouze se syntetickými daty.
- [ ] Oddělit načítání dat z Prisma od čisté plánovací logiky.
- [ ] Doplnit integrační testy pro převod databázových dat na doménový vstup.

### P2 — napojení UI na skutečný tok dat

- [ ] Nahradit vybrané části `lib/demo-data.ts` skutečným načítáním dat.
- [ ] Napojit volbu období, vstupní data a spuštění výpočtu na P1 engine.
- [ ] Zobrazit výsledek výpočtu a konflikty tak, aby bylo jasné, co je
  výsledek výpočtu a co je pouze návrh k ruční úpravě.
- [ ] Dopracovat placeholdery sekcí podle schváleného workflow, ne podle
  domněnek o doméně.

### P3 — až po ověření základního workflow

- [ ] Přidat autentizaci, role a audit, pokud to potvrdí P0.
- [ ] Promyslet export, integrace, CI/CD a produkční provoz.
- [ ] Provést zátěžové a uživatelské ověření na anonymizovaném vzorku 100+
  zaměstnanců.

## 5. Co teď nedělat

- Neimplementovat H1–H7 ani S1–S5 jen proto, že jsou uvedené jako kandidáti.
- Nevytvářet finální Prisma modely před schválením entit a atributů.
- Nevydávat čísla z `lib/demo-data.ts` za skutečné pokrytí nebo skutečné
  konflikty.
- Nepřidávat autentizaci, integrace ani produkční deployment do prvního řezu,
  pokud k tomu nevznikne samostatné rozhodnutí.
- Neměnit současné vizuální změny při práci na doméně, pokud to není nutné.

## 6. Doporučený nejbližší krok

Poslat OpenCode task z
[`OPEN_CODE_PLANNING_CORE_TASK.md`](OPEN_CODE_PLANNING_CORE_TASK.md). Ten připraví
pravidlově nezávislou kostru, takže čekání na odpovědi managera nezastaví práci.
Po doručení e-mailu navážeme doménovým P0: potvrdíme typy, pravidla a chování
plánu a teprve potom přidáme konkrétní mechaniku generování.

## 7. Odkazy

- [Přehled dokumentace](README.md)
- [Návrh doménové specifikace](DOMAIN_SPECIFICATION.md)
- [Plánovací vrstva](../lib/planning/README.md)
- [Vizuální úkol pro OpenCode](OPEN_CODE_VISUAL_TASK.md)
- [První task: plánovací jádro](OPEN_CODE_PLANNING_CORE_TASK.md)
- [Projektové instrukce](../AGENTS.md)
