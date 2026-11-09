# Minimální datový kontrakt plánovacího jádra

> **Historický technický kontrakt:** popisuje starší týdenní API a některé
> provozní náhrady. Není specifikací měsíčního UI ani autoritativním seznamem
> aktuálních pravidel. Měsíční pilot popisují
> [`DOMAIN_SPECIFICATION.md`](DOMAIN_SPECIFICATION.md) a [`ROADMAP.md`](ROADMAP.md).

> Tento dokument zachycuje původní týdenní kontrakt a jeho historické
> implementační předpoklady. Lokální OR-Tools byl z měsíční aplikace odstraněn
> rozhodnutím v [ADR 0008](adr/0008-cloudflare-only-and-unified-ui.md).

- **Stav:** kontrakt je `PROPOSAL` (doména zůstává částečně otevřená);
  jeho implementace je `IMPLEMENTED` a ověřená testy.
- **Datum:** 24. 10. 2026, aktualizováno 26. 10. 2026 a 6. 11. 2026
- **Kód:** `lib/planning/domain/types.ts`, `lib/planning/domain/confirmed.ts`,
  `lib/planning/domain/time.ts`, `lib/planning/domain/validation.ts`,
  `lib/planning/ai-provider.ts`, `lib/planning/orchestrator.ts`,
  `lib/ai/cloudflare-planning-provider.ts`, `lib/ai/gemini-planning-provider.ts`
- **Souvisí:** [Doménová specifikace](DOMAIN_SPECIFICATION.md),
  [Roadmapa](ROADMAP.md), [ADR 0005](adr/0005-ai-navrhuje-validace-overuje.md),
  [Plánovací vrstva](../lib/planning/README.md)

## 1. Proč tento kontrakt existuje

Aby AI plánovač, deterministická validace a aplikace mluvily stejným jazykem.
Kontrakt je záměrně **minimální pro první funkční verzi**:

- jeden týden (pondělí–nedělí),
- zaměstnanci na plný úvazek,
- potvrzené časy ranní a odpolední směny,
- konfigurovatelné potřebné obsazení,
- schválené absence, požadavky, existující směny,
- potvrzená pravidla odpočinku a víkendových dnů volna.

Není to univerzální model pro všechny typy plánování. Měsíční tok je
implementovaný samostatně; částečné úvazky (mimo pilot), pobočky, kampaně,
role, mzdy a integrace se doplní až po samostatném rozhodnutí.

## 2. Tři stavy, které se nesmí slít

| Stav | Co to je | Co to není |
| --- | --- | --- |
| **Návrh** (`PlanDraft`) | Výstup AI: přiřazení, vysvětlení, alternativy, předpoklady | Ověřený ani schválený plán |
| **Ověřený návrh** (`PlanningRunResult`) | Návrh + deterministické pokrytí, změny a výsledek validace | Potvrzení manažera |
| **Potvrzené změny** (`ConfirmedPlan`) | Samostatný výsledek rozhodnutí manažera | Něco, co vzniká automaticky |

```text
PlanningInput
  → AI planner
  → PlanDraft
  → deterministická validace + výpočet změn a pokrytí
  → PlanningRunResult (confirmed: false)
  → manažer: přijmout / upravit / odmítnout
  → ConfirmedPlan
```

`PlanningRunResult.confirmed` je vždy `false`. Potvrzení je samostatný krok
mimo AI i validační jádro. Aplikace nesmí návrh uložit nebo aplikovat jen proto,
že validace nic nenašla.

## 3. Potvrzené časy směn

| Druh | Den | Začátek | Konec | Hrubá délka |
| --- | --- | ---: | ---: | ---: |
| `morning` | všední | 7:45 | 16:30 | 8 h 45 min |
| `morning` | víkend | 7:45 | 16:30 | 8 h 45 min |
| `afternoon` | všední | 13:15 | 21:00 | 7 h 45 min |
| `afternoon` | víkend | 12:45 | 21:00 | 8 h 15 min |

**Přestávky (`VERIFIED`, OQ24):** víkendová odpolední směna 12:45–21:00 je
pevně daná proto, aby se do ní vešla půlhodinová obědová přestávka. Nejde o
přesčas ani o operativní prodloužení směny. První verze přesto pracuje s
hrubými časy začátku a konce; odpracovaná ani placená doba nejsou tvrdým
validačním pravidlem. Nejde o pracovněprávní posudek.

## 4. Vstup (`PlanningInput`)

```ts
interface PlanningInput {
  weekStart: IsoDate;                 // pondělí, YYYY-MM-DD
  timeZone: string;                   // první řez: "Europe/Prague" (ASSUMPTION)
  employees: Employee[];
  shiftDefinitions: ShiftDefinition[];
  staffingRequirements: StaffingRequirement[];
  absences: Absence[];
  requests: EmployeeRequest[];
  existingAssignments: ExistingAssignment[];
  rules: PlanningRules;
  history?: PlanningHistory;          // volitelné; nutné pro pravidlo 35 h
}
```

### 4.1 Zaměstnanec

```ts
interface Employee {
  id: string;
  displayName: string;
  employmentType: "full_time";        // první verze pouze plný úvazek
  role?: string;                      // volitelné, bez potvrzeného pravidla
}
```

- `id` je stabilní technický identifikátor, ne osobní údaj.
- `displayName` je v první verzi syntetické jméno.
- `role` se nesmí použít jako skryté omezení, dokud nebude potvrzené pravidlo
  (OQ9–OQ11).
- **Individuální pracovní omezení** (max. hodiny, zvláštní dostupnost mimo
  absence, zdravotní omezení) nejsou potvrzená. První řez je reprezentuje pouze
  plným úvazkem a schválenými absencemi. Per-zaměstnanecké limity jsou
  `OPEN QUESTION` (OQ9–OQ11) a nesmí se doplnit jako „rozumný default“.

### 4.2 Směna

```ts
interface ShiftDefinition {
  kind: "morning" | "afternoon";
  weekday: { start: "HH:mm"; end: "HH:mm" };
  weekend: { start: "HH:mm"; end: "HH:mm" };
}
```

Potvrzené hodnoty jsou v `CONFIRMED_SHIFT_DEFINITIONS`. Neznámý druh směny je
chyba volajícího, ne tichý default.

### 4.3 Potřebné obsazení

```ts
interface StaffingRequirement {
  date: IsoDate;
  shiftKind: "morning" | "afternoon";
  requiredEmployees: number;          // >= 0
}
```

- Je to **vstup**, ne historická konstanta.
- Pro každý den a druh směny má existovat právě jeden požadavek.
- Nula je platná hodnota (směna se ten den neplánuje).
- Chybějící požadavek je neúplný vstup, ne „nula“.

### 4.4 Absence a požadavky

```ts
interface Absence {
  id: string;
  employeeId: string;
  from: IsoDate;                      // včetně
  to: IsoDate;                        // včetně
  type: "vacation" | "sick" | "other";
  status: "approved" | "pending" | "rejected";
}

interface EmployeeRequest {
  id: string;
  employeeId: string;
  date: IsoDate;
  kind: "day_off" | "shift_preference";
  shiftKind?: "morning" | "afternoon"; // pro shift_preference
  status: "approved" | "pending" | "rejected";
  note?: string;
}
```

- `approved` absence **blokuje** běžné přiřazení. Při operativní náhradě lze
  změnit pouze schválenou dovolenou po výslovném přijetí managerem; ostatní
  potvrzené volno zůstává blokátorem.
- `pending` a `rejected` absence jsou jen kontext. O schválení či odmítnutí
  požadavku rozhoduje manager a aplikace při přijetí ukazuje dopad na pokrytí;
  změnu rozpisu nepotvrzuje automaticky. Přesné datum náhradního volna po
  záskoku zůstává `OPEN QUESTION` (OQ22).
- Požadavek na volno nebo preference směny není automatický nárok. Manager jej
  schvaluje či odmítá; náhled ukáže dopad na pokrytí a dostupné syntetické
  kandidáty. Samotné rozhodnutí rozpis neupravuje ani nepotvrzuje.

### 4.5 Existující směny

```ts
interface ExistingAssignment {
  employeeId: string;
  date: IsoDate;
  shiftKind: "morning" | "afternoon";
}
```

Existující směny jsou výchozí stav pro výpočet změn. První řez nemá potvrzené
zamykání přiřazení (OQ9–OQ11), takže AI může navrhnout i změnu existující
směny. Každá taková změna musí být vidět v `changes` a vyžaduje potvrzení.

### 4.6 Pravidla

```ts
interface PlanningRules {
  consecutiveWorkingDaysBeforeLongRest: 6;
  longRestHours: 35;
  weekendWorkDaysOff: 2;
}
```

Hodnoty jsou literálové a potvrzené. Ostatní limity (maximum hodin, maximum
směn, jiný odpočinek) nejsou součástí kontraktu, dokud je manager nepotvrdí.
Žádná „rozumná“ výchozí hodnota se nesmí doplnit.

### 4.7 Historie před týdnem

```ts
interface PlanningHistory {
  assignments: ExistingAssignment[];
  complete: boolean;
}
```

- `history` je volitelná. Slouží k pravidlu 35 h odpočinku, které může záviset
  na dnech před začátkem týdne.
- `complete: true` znamená, že `assignments` je úplný seznam směn všech
  zaměstnanců alespoň za šest kalendářních dnů před `weekStart`. Chybějící den
  v historii znamená den volna, ne „nevím“.
- Pokud historie chybí nebo není úplná a zaměstnanec má první směnu v pondělí–pátek,
  validace odpočinku vrátí `not_verified`. Nesmí předpokládat, že předtím
  nepracoval.
- Historie se nesmí používat jako potvrzení minulých rozpisů ani jako náhrada
  schváleného plánu.

## 5. Výstup AI (`PlanDraft`)

```ts
interface PlanDraft {
  weekStart: IsoDate;
  assignments: ProposedAssignment[];
  explanations: Explanation[];
  alternatives: Alternative[];
  assumptions: string[];
}

interface ProposedAssignment {
  employeeId: string;
  date: IsoDate;
  shiftKind: "morning" | "afternoon";
}
```

- AI vrací **konkrétní přiřazení**, ne jen doporučení typu „přidejte lidi“.
- AI musí u důležitých rozhodnutí vysvětlit, proč je zvolila.
- AI musí označit předpoklady, které si musela udělat.
- AI nesmí tvrdit, že návrh splňuje pravidla; to tvrdí až validace.
- AI nesmí vracet neexistující zaměstnance, dny nebo druhy směn. Neplatný
  výstup se odmítne, nedoplňuje se potichu.

### 5.1 Vysvětlení

```ts
interface Explanation {
  topic: "assignment" | "coverage" | "rest" | "weekend" | "preference" | "other";
  text: string;
  employeeIds?: string[];
  dates?: string[];
  shiftKinds?: ("morning" | "afternoon")[];
}
```

Text je pro manažera. Odkazy slouží k dohledání přiřazení, ne jako další
pravidlo.

### 5.2 Alternativy

```ts
interface Alternative {
  id: string;
  summary: string;
  impact: string;
  assignments: ProposedAssignment[];
  tradeOffs?: string[];
}
```

Alternativa je opět jen návrh. Cílový kontrakt vyžaduje, aby její dopad prošel
stejnou validací jako hlavní návrh, a nikdy se neaplikuje bez potvrzení. V
aktuálním kódu se však validuje pouze hlavní návrh; validace alternativ je
`PLANNED` a je součástí dalšího implementačního řezu. Pokud nelze splnit
všechny požadavky, musí být alternativa konkrétní, ne obecné „zkuste přidat lidi“.

## 6. Výsledek běhu (`PlanningRunResult`)

```ts
interface PlanningRunResult {
  weekStart: IsoDate;
  proposal: PlanProposal<PlanDraft>; // id, source, plan
  changes: AssignmentChange[];       // added / removed / unchanged
  coverage: CoverageLine[];          // required / assigned / missing
  validation: PlanValidationResult;  // nezávislá pravidla
  completeness: "complete" | "partial";
  status: "not_verified" | "needs_changes" | "ready_for_review";
  confirmed: false;
}
```

### 6.1 Změny

`changes` se počítají deterministicky porovnáním `assignments` s
`existingAssignments`. AI je nevrací, aby se nestaly dalším zdrojem
neověřených tvrzení.

### 6.2 Pokrytí

`coverage` se počítá deterministicky z `staffingRequirements` a navržených
přiřazení. `missingEmployees > 0` znamená nedostatek; musí být vidět ve
výsledku a nesmí se schovat za „plán je hotový“.

### 6.3 Výsledek deterministické validace

```ts
interface PlanValidationResult {
  status: "valid" | "invalid" | "not_verified";
  weekStart: IsoDate;
  proposalId: string;
  problems: PlanValidationProblem[];
  unverifiedChecks: PlanValidationUnverifiedCheck[];
  checkedRuleIds: string[];
  assumptions: string[];
}
```

| Stav | Význam |
| --- | --- |
| `valid` | Všechny dostupné kontroly proběhly a nenašly chybu ani neověřenou kontrolu. Varování mohou existovat. |
| `invalid` | Alespoň jeden nález je `error` (např. nedostatek obsazení, překryv, schválená absence, porušení odpočinku). |
| `not_verified` | Bez chyb, ale některou kontrolu nešlo spolehlivě provést (chybí historie, požadavek, definice směny nebo je nejasný výklad). |

`problems` obsahují stabilní `code`, `severity`, text a podle možnosti
`employeeId`, `date`, `shiftKind` a `details`. `unverifiedChecks` nejsou
porušená pravidla; jen brání tomu, aby byl výsledek označen jako `valid`.
`assumptions` přiznávají pouze dosud neuzavřené výklady (zejména termín
náhradního volna v OQ22). Výklad dvou dnů volna je `VERIFIED` (pondělí–neděle,
rozhodnutí uživatele 6. 11. 2026). Validace návrh nikdy neopravuje ani nemění.

### 6.4 Stav běhu

| Stav | Význam | Co smí UI udělat |
| --- | --- | --- |
| `not_verified` | Validace nemohla proběhnout (např. chybějící historie nebo nejasný výklad) | Zobrazit výrazné „neověřeno“, nepředstírat úspěch |
| `needs_changes` | Validace našla problém nebo chybí obsazení | Zobrazit nálezy a alternativy, nabídnout úpravu |
| `ready_for_review` | Validace nic nenašla, čeká na manažera | Zobrazit „připraveno ke kontrole“, ne „schváleno“ |

Pořadí stavů je `not_verified` → `needs_changes` → `ready_for_review`: pokud
validace nemohla některou kontrolu provést, zůstane `not_verified` i při
chybějícím obsazení.

Ani `ready_for_review` není schválení. Tlačítko „Potvrdit“ je samostatná akce
manažera a teprve ta vytvoří `ConfirmedPlan`.

### 6.5 Potvrzení

```ts
interface ConfirmedPlan {
  proposalId: string;
  weekStart: IsoDate;
  assignments: ProposedAssignment[];
  confirmedAt: string;
}
```

`ConfirmedPlan` nevzniká v AI ani ve validačním jádru. Kdo potvrzení provedl a
jak se to zaznamená, je otevřená otázka (OQ20).

### 6.6 Operativní náhrada (`IMPLEMENTED` / `SIMULATED`)

Operativní náhrada je další kontrakt nad potvrzeným týdenním plánem. V prvním
syntetickém řezu platí tento schválený tok:

```text
ConfirmedPlan
  → výpadek zaměstnance na jedné celé směně
  → tři konkrétní varianty AI
  → výběr managerem
  → validace celé vybrané verze týdne
  → nové potvrzení
```

Implementovaný syntetický kontrakt je v `lib/planning/domain/types.ts` a
service/API vrstvě. Zjednodušený tvar pro orientaci je:

```ts
interface ReplacementRequest {
  id: string;
  baseProposalId: string;
  weekStart: IsoDate;
  incident: ShiftIncident;
}

interface ReplacementOption {
  id: string;
  requestId: string;
  draft: ReplacementDraft;
  changes: AssignmentChange[];
  coverage: CoverageLine[];
  impact: ReplacementImpact;
  validation: PlanValidationResult;
  status: "valid" | "invalid" | "not_verified";
}
```

Implementace navíc odděluje AI návrh `ReplacementDraft` od deterministicky
dopočtených `changes`, `coverage`, `impact` a `validation`. Uložený snapshot
je pracovní; potvrzení managerem vytvoří novou verzi celého týdne a auditní
událost `planning.replacement_confirmed`.

`changes`, `coverage` a `validation` se počítají deterministicky nad každou
variantou. Pro potvrzení se znovu vyhodnotí vybraná varianta. Pokud nejsou
dostupné tři odlišné varianty, systém to přizná; nedoplňuje fiktivního člověka
ani neoznačí neověřenou variantu za bezpečnou.

První řez nepodporuje dílčí nástup uprostřed směny. AI smí navrhnout i změny
dalších celých přiřazení v týdnu, ale všechny musí být viditelné v dopadu.
Operativní výpadek se před potvrzením neukládá jako změna rozpisu. Po potvrzení
vzniká nová verze celého týdne.

Minimální obsazení je konfigurovatelný vstup podle konkrétního dne a směny.
Potvrzený výchozí profil od 30. 10. 2026 je Po–Pá 23 ráno / 8 odpoledne a
So–Ne 12 ráno / 9 odpoledne. Pořadí cíle varianty je nejprve splnit aktuální
uložený vstup, potom neporušit ověřená tvrdá pravidla a potom změnit co nejméně
dalších lidí.
Pokud změna jednoho volna vyvolá další změny, variantní dopad musí zobrazit celý
řetězec.

Délka směny se bere z existující `ShiftDefinition` a je pevná. Operativní
náhrada pracuje pouze s celou směnou; nesmí ji prodloužit, zkrátit ani rozdělit.
Přesčasy se v tomto provozu nepoužívají, takže varianta vyžadující práci mimo
pevně definovanou směnu je neplatná.

Při běžném plánování každé evidované volno blokuje směnu. Při operativní
náhradě může AI navrhnout člověka s potvrzeným volnem, pokud neporuší
potvrzených 35 hodin odpočinku po šesti po sobě jdoucích pracovních dnech.
O kontaktování člověka a změně volna rozhoduje manager. Systém musí zásah
zaznamenat a navrhnout náhradní volno, ale nesmí je sám přidělit. Přesný termín
náhradního volna je `OPEN QUESTION`. Právní baseline pro další profil limitů je
`SOURCE EVIDENCE`, nikoli hotové validační pravidlo.

Maximální hodiny, maximální počet směn, role/dovednosti a další dosud
nepotvrzené limity nejsou v prvním pilotu nastavené jako univerzální čísla.
Volitelný `replacementLimits` profil při chybějící hodnotě vrací
`REPLACEMENT_LIMIT_NOT_CONFIGURED` a stav `not_verified`; implementace nesmí
limit domýšlet. Schválený plánovaný den volna je explicitně zobrazen jako
vysoce dopadový `NOT VERIFIED` zásah a nelze jej potvrdit bez dalšího rozhodnutí.

## 7. Nezávislá validace — co je implementované

`IMPLEMENTED` v `lib/planning/domain/validation.ts`; testy v
`lib/planning/domain/validation.test.ts`. Validace je deterministická a
testovatelná bez AI a bez databáze.

| ID pravidla | Co kontroluje | Stav |
| --- | --- | --- |
| `INPUT-SHAPE` | Povinné údaje, formát datumů a časů, pondělí jako začátek týdne | `IMPLEMENTED` |
| `INPUT-REFERENCES` | Neznámý zaměstnanec, den, směna, duplicitní požadavek | `IMPLEMENTED` |
| `INPUT-COVERAGE` | Pro každý den a směnu existuje právě jeden požadavek | `IMPLEMENTED` |
| `ASSIGNMENT-DUPLICATE` | Stejný zaměstnanec není dvakrát na stejné směně | `IMPLEMENTED` |
| `ASSIGNMENT-OVERLAP` | Žádné překrývající se směny jednoho zaměstnance, včetně přes půlnoc | `IMPLEMENTED` |
| `ABSENCE-APPROVED` | Schválená absence blokuje přiřazení; neschválené ne | `IMPLEMENTED` |
| `COVERAGE-REQUIRED` | Počet přiřazených odpovídá požadavku; nedostatek = `error`, přebytek = `warning` | `IMPLEMENTED` |
| `REST-AFTER-SIX-DAYS` | Po 6 po sobě jdoucích pracovních dnech ≥ 35 h odpočinku; používá historii | `IMPLEMENTED` s potvrzeným výkladem OQ21 |
| `WEEKEND-TWO-DAYS-OFF` | Práce o víkendu → 2 dny volna v témže týdnu | `IMPLEMENTED` s výkladem |
| `UNKNOWN-ASSIGNMENT` | Přiřazení mimo vstupní týden nebo neznámý druh směny | `IMPLEMENTED` |

Poznámky:

- `ASSIGNMENT-OVERLAP` a `ABSENCE-APPROVED` jsou strukturální integrita, ne
  sporné doménové pravidlo.
- `WEEKEND-TWO-DAYS-OFF` používá potvrzený výklad „během týdne“ =
  pondělí–neděle (`VERIFIED`, rozhodnutí uživatele 6. 11. 2026). Dva dny volna
  se počítají jako libovolné dva dny; pokud nejsou po sobě jdoucí, validace
  vrátí `not_verified`, protože striktnější výklad není potvrzený.
- `REST-AFTER-SIX-DAYS` používá potvrzený výklad „pracovní den“ = kalendářní den
  s alespoň jednou směnou (OQ21). 35 h se měří od konce 6. dne
  do začátku další směny. Chybějící historie před týdnem vede k `not_verified`.
- `COVERAGE-REQUIRED` nesmí být zaměněno s tvrzením, že neúplný plán je
  nemožný. Neúplný návrh je přípustný, ale musí být označen.
- OQ24 je uzavřená pro první verzi: validace používá hrubé časy začátku a
  konce, ne odpracovanou dobu ani přestávky.

### 7.1 Kontrola vstupu a výstupu AI

Orchestrace ověřuje data ve třech krocích, aby se neplatný vstup nebo výstup
nedostal do deterministické validace:

1. **Hluboká kontrola vstupu** před voláním AI — `weekStart` musí být pondělí,
   `timeZone` platná IANA zóna, zaměstnanci musí mít `id` a `full_time`, tvary
   všech polí musí odpovídat kontraktu. Neplatný vstup končí jako
   `invalid_input`.
2. **Strukturální kontrola `PlanDraft`** — `isPlanDraft()` ověří kalendářní
   data, témata vysvětlení, úplnost alternativ a typy polí. Povolené hodnoty
   `shiftKind` nekontroluje; neznámou směnu řeší až deterministická validace.
3. **Sémantická kontrola vůči vstupu** — orchestrátor odmítne jen neshodu
   `weekStart` (`ai_invalid_output`). Neznámý zaměstnanec, den mimo týden nebo
   neznámá směna jdou do `validatePlan()` a projeví se jako nálezy
   v `validation.problems`; výsledkem je `needs_changes`, ne selhání běhu.

Chybějící nebo neplatný vstup je selhání běhu, ne `not_verified`. `not_verified`
patří jen deterministické validaci, která nemohla některou kontrolu provést.

## 8. Kontrakt AI plánovače

AI plánovač je funkce/serverová služba, která dostane `PlanningInput` a vrátí
`PlanDraft`. Nesmí:

- ukládat do databáze,
- měnit existující rozpis,
- potvrzovat návrh,
- obcházet validaci,
- doplňovat chybějící vstupy bez označení.

Musí:

- vrátit strukturovaný výstup odpovídající `PlanDraft`,
- respektovat potvrzené časy a pravidla,
- označit, co je předpoklad,
- vysvětlit důležitá rozhodnutí,
- nabídnout konkrétní alternativy při konfliktu,
- přiznat, když některé požadavky splnit nelze.

### 8.1 Selhání vs. nález

| Situace | Výsledek |
| --- | --- |
| AI není nakonfigurovaná | `PlanningFailure` s `ai_not_configured`; žádný falešný návrh |
| AI selže (síť, timeout) | `PlanningFailure` s `ai_failed`; žádný falešný návrh |
| AI vrátí neplatnou strukturu | `PlanningFailure` s `ai_invalid_output` |
| Validace najde problém v návrhu | `PlanningRunResult` s `needs_changes` |
| Validace sama selže | `PlanningFailure` s `validation_failed`; ne `not_verified` |

`not_verified` je stav validace, ne omluva za chybějící AI. Chybějící AI je
selhání běhu.

### 8.2 Poskytovatel modelu

Měsíční AI plánovač je Cloudflare Workers AI (`lib/ai/cloudflare-planning-provider.ts`).
Implementuje měsíční rozhraní `MonthlyPlanningProvider`; jádro na konkrétním
poskytovateli nezávisí. Starší Google Gemini adaptér
(`lib/ai/gemini-planning-provider.ts`) zůstává v kódu pro týdenní tok a historii.

- volání je pouze serverové (`fetch`), bez nové závislosti;
- konfigurace Cloudflare: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`,
  `CLOUDFLARE_AI_MODEL` (výchozí `@cf/meta/llama-3.3-70b-instruct-fp8-fast`),
  `CLOUDFLARE_AI_TIMEOUT_MS`;
- konfigurace staršího Gemini: `GEMINI_API_KEY`, `GEMINI_MODEL`
  (`gemini-2.5-flash`), `GEMINI_TIMEOUT_MS`, volitelně `GEMINI_BASE_URL`;
- klíč se nikdy nedostane do klienta ani do logu;
- testování probíhá přes injektovaný provider nebo mockovaný `fetch`; reálné
  volání se spouští jen s příslušným integračním přepínačem.

Externí AI je `VERIFIED` rozhodnutím uživatele (6. 11. 2026) povolená včetně
skutečných jmen a volného textu. Reálné volání Cloudflare AI a kvalita
měsíčního výstupu zůstávají `NOT VERIFIED`. Bezplatná úroveň Gemini není pro
aplikaci dostupnou v EHP přípustná; placená varianta odporuje rozpočtu projektu.

## 9. Co kontrakt záměrně neobsahuje

- měsíční období a přechody mezi týdny,
- částečné úvazky,
- pobočky, týmy, kampaně, jazyky a dovednosti jako povinná data,
- mzdy, docházku a integrace,
- databázové modely a migrace,
- autentizaci, role a audit,
- zamykání přiřazení a historii ručních úprav,
- operativní incidenty a náhrady konkrétní směny,
- váhy preferencí a optimalizační funkci.

Tyto věci se doplní až po potvrzení příslušných rozhodnutí. Kontrakt je
navržený tak, aby se dal rozšířit, ale neslibuje, že rozšíření bude bez změny
typů.

## 10. Otevřené otázky a předpoklady

| # | Otázka / předpoklad | Stav |
| --- | --- | --- |
| OQ21 | Co je „pracovní den“ pro šest dnů v řadě? | `VERIFIED` |
| OQ22 | Jak se liší schválený požadavek od přání? | `PARTIALLY ANSWERED` — manager rozhoduje a vidí dopad; termín náhradního volna zůstává otevřený |
| OQ23 | Lze potvrdit částečně neúplný návrh? | `VERIFIED` — potvrzení je blokované |
| OQ24 | Jak se započítávají přestávky? | `VERIFIED` — používají se hrubé časy |
| — | Časová zóna `Europe/Prague` | `ASSUMPTION` |
| — | „Během týdne“ = pondělí–neděle | `VERIFIED` — rozhodnutí uživatele 6. 11. 2026 |
| — | Pracovní den = kalendářní den s alespoň jednou směnou | `VERIFIED` — OQ21 |
| — | Dva dny volna nemusí následovat po sobě | `VERIFIED` — viz `DOMAIN_SPECIFICATION.md` |
| — | Historie musí být úplná alespoň za 6 dnů před `weekStart` | `ASSUMPTION` |
| — | Existující směny lze měnit (bez zamykání) | `ASSUMPTION` |
| — | Role je volitelná a bez pravidla | `ASSUMPTION` |

## 11. Vztah k existujícímu kódu

- Generické jádro: `lib/planning/types.ts`, `lib/planning/control.ts` — beze
  změny domény.
- Doménový kontrakt: `lib/planning/domain/types.ts`.
- Potvrzené konstanty: `lib/planning/domain/confirmed.ts`.
- Časové a kalendářní pomocné funkce: `lib/planning/domain/time.ts`.
- Deterministická validace: `IMPLEMENTED` v `lib/planning/domain/validation.ts`
  s testy `lib/planning/domain/validation.test.ts`.
- AI kontrakt: `IMPLEMENTED` v `lib/planning/ai-provider.ts` — rozhraní
  `PlanningModelProvider`, chyby poskytovatele a `isPlanDraft()`.
- Cloudflare Workers AI adaptér: `IMPLEMENTED` v
  `lib/ai/cloudflare-planning-provider.ts`; reálná volání jsou ověřena na
  syntetických scénářích. Kvalita výsledků je částečně ověřena, ale spolehlivost
  pro běžné použití zůstává `NOT VERIFIED`; viz `docs/PLAN_OVERENI_AI.md`.
- Gemini adaptér: `IMPLEMENTED` v `lib/ai/gemini-planning-provider.ts`; reálné
  volání je `VERIFIED` integračním testem, produkční kvalita výstupu je
  `NOT VERIFIED`.
- Orchestrátor: `IMPLEMENTED` v `lib/planning/orchestrator.ts` — spojí vstup,
  AI návrh, validaci a výpočet změn a pokrytí.
- **Fáze 2 — API a UI:** route handlery `app/api/planning/run/route.ts`,
  `app/api/planning/confirm/route.ts`; služby `run-service.ts`,
  `confirm-service.ts`; registr `run-registry.ts`; factory providerů
  `provider-factory.ts`; serverová konfigurace `server-config.ts`;
  simulovaný provider `simulated/`; view-model `view-model.ts`; potvrzení
  `confirmation.ts`; původní samostatný týdenní UI byl následně odstraněn.
  Aktuální hlavní obrazovka používá `components/plan/monthly-planning-panel.tsx`
  a `components/plan/monthly-roster-table.tsx` přes
  `components/plan/plan-workspace.tsx` a `app/(app)/planovani/page.tsx`.
- **Ruční úprava měsíčního návrhu:** manažer vybírá v zobrazeném týdnu den a
  zaměstnance a přidává nebo odebírá směny. Do nové kontroly jsou změny pouze
  v prohlížeči a potvrzení je blokované. `POST /api/planning/monthly/recheck`
  načte původní návrh a aktuální návazné podklady, zkontroluje celý měsíc a
  uloží novou samostatnou verzi návrhu; potvrzený rozpis tím nemění. Při
  potvrzování server opět kontroluje podklady a platnost. Prohlížeč si pamatuje
  identifikátor poslední uložené verze pro daný měsíc. Manažerovi ji po obnovení
  stránky načte a znovu zkontroluje; dosud nezkontrolované ruční úpravy se tím
  neobnoví. V jiném prohlížeči se identifikátor automaticky nepřenáší.

Kontrakt je `PROPOSAL`. Pokud se při implementaci ukáže, že některý údaj
chybí nebo je nadbytečný, uprav tento dokument i typy společně a uveď důvod.

### 11.1 Měsíční plánovací provider

Hlavní rozhraní měsíčního MVP je `POST /api/planning/monthly/run`. Režim
`PLANNING_MONTHLY_PROVIDER=ortools` předává lokálnímu procesu pouze měsíc,
technické identifikátory převedené na dočasné anonymní značky, obsazení,
absence, dostupnost a dostupné hraniční přiřazení. Jména a volné pokyny se do
solveru neposílají. Pokyny se v tomto režimu nevyhodnocují.

Závislosti jsou připnuté v `scripts/requirements-monthly-solver.txt`. Nastavte
`PLANNING_PYTHON_EXECUTABLE` na Python z lokálního virtuálního prostředí.
Na Windows vytvořte prostředí příkazy `py -3.14 -m venv .venv` a
`.venv\Scripts\python.exe -m pip install -r scripts\requirements-monthly-solver.txt`;
pro Python běh použijte `.venv\Scripts\python.exe -m unittest discover -s scripts -p monthly_solver_test.py`.
Výsledek solveru je vždy jen návrh a musí projít `validateMonthlyPlan()`.
`infeasible` se vztahuje jen na zadaný model; `unknown`/timeout není důkaz
neproveditelnosti. Chybějící historie zůstává ve validaci neověřená a brání
potvrzení.

## 12. Kde se doména napojuje na jádro

Jádro zůstává doménově nezávislé (ADR 0001). Doména se napojuje ve třech
místech:

| # | Styčný bod | Co se doplní | Stav |
| --- | --- | --- | --- |
| 1 | Doménový typ plánu | `PlanProposal<PlanDraft>` a konkrétní tvar | `IMPLEMENTED` |
| 2 | Pravidla a limity | `PlanningRule<PlanDraft>` a jejich konfigurace | `IMPLEMENTED` pro potvrzená pravidla; zbytek `OPEN QUESTION` |
| 3 | Zobrazení výsledku | mapování `ControlResult` a `PlanningRunResult` na stavy UI | `IMPLEMENTED` (Fáze 2) |

Zásady, které se při napojení nesmí změnit:

- doménové typy zůstávají vedle jádra, ne uvnitř něj;
- limity jsou explicitní vstup, žádné tiché výchozí hodnoty; chybějící
  konfigurace je chyba volajícího (`RuleConfigurationError`), ne nález v plánu;
- UI výsledek jen čte a nikdy z něj neodvozuje schválení;
- selhání pravidla (výjimka) není `not_verified`; volající zobrazí „kontrolu
  nešlo provést“ (ADR 0004);
- volání AI, potvrzení manažera, ukládání a autentizace zůstávají mimo jádro.

Mapování stavů pro UI:

| Stav | Co zobrazit | Co nesmí |
| --- | --- | --- |
| `valid` / `no_problems_found` | „Dostupná pravidla nic nenašla.“ | zelené „v pořádku / schváleno“ |
| `invalid` / `problems_found` | nálezy s kódem a závažností | skrýt nálezy za souhrn |
| `not_verified` | výrazné „Nepodařilo se ověřit.“ | splynout s úspěchem |
| `ready_for_review` | „Připraveno ke kontrole.“ | „Schváleno“ nebo „Hotovo“ |
