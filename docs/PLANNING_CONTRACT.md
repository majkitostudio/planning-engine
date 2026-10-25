# Minimální datový kontrakt plánovacího jádra

- **Stav:** `PROPOSAL` — první tvar ověřený implementací a testy; doména
  zůstává částečně otevřená (`OPEN QUESTION`).
- **Datum:** 24. 10. 2026
- **Kód:** `lib/planning/domain/types.ts`, `lib/planning/domain/confirmed.ts`,
  `lib/planning/domain/time.ts`, `lib/planning/domain/validation.ts`
- **Souvisí:** [Doménová specifikace](DOMAIN_SPECIFICATION.md),
  [Roadmapa](ROADMAP.md), [Šev pro doménu](DOMAIN_SEAM.md),
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

Není to univerzální model pro všechny typy plánování. Měsíce, částečné úvazky,
pobočky, kampaně, role, mzdy a integrace se doplní až po samostatném rozhodnutí.

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

**Přestávky (`OPEN QUESTION`, OQ24):** zadání uvádí 30minutovou přestávku a
zároveň tvrdí, že víkendová odpolední směna 12:45–21:00 při ní dává osm
odpracovaných hodin. Aritmeticky vychází 7 h 45 min. Kontrakt proto pracuje
s hrubými časy začátku a konce; odpracovaná doba se do potvrzení nepoužívá jako
tvrdé pravidlo. Rozpor se nesmí tiše „opravit“.

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

- `approved` absence **blokuje** přiřazení. To je potvrzené pravidlo.
- `pending` a `rejected` absence jsou jen kontext; nesmí se z nich stát tvrdá
  překážka bez potvrzení (OQ22).
- Požadavek na volno nebo preference směny není nárok. AI ho může zohlednit;
  validace ho nesmí vydávat za splněný nárok.

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

Alternativa je opět jen návrh. Musí projít stejnou validací jako hlavní návrh
a nikdy se neaplikuje bez potvrzení. Pokud nelze splnit všechny požadavky, musí
být alternativa konkrétní, ne obecné „zkuste přidat lidi“.

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
`assumptions` přiznávají použité výklady (OQ21, OQ22, OQ24 a výklad dvou dnů
volna). Validace návrh nikdy neopravuje ani nemění.

### 6.4 Stav běhu

| Stav | Význam | Co smí UI udělat |
| --- | --- | --- |
| `not_verified` | Validace nemohla proběhnout (např. žádná pravidla) | Zobrazit výrazné „neověřeno“, nepředstírat úspěch |
| `needs_changes` | Validace našla problém nebo chybí obsazení | Zobrazit nálezy a alternativy, nabídnout úpravu |
| `ready_for_review` | Validace nic nenašla, čeká na manažera | Zobrazit „připraveno ke kontrole“, ne „schváleno“ |

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
| `REST-AFTER-SIX-DAYS` | Po 6 po sobě jdoucích pracovních dnech ≥ 35 h odpočinku; používá historii | `IMPLEMENTED` s výkladem OQ21 |
| `WEEKEND-TWO-DAYS-OFF` | Práce o víkendu → 2 dny volna v témže týdnu | `IMPLEMENTED` s výkladem |
| `UNKNOWN-ASSIGNMENT` | Přiřazení mimo vstupní týden nebo neznámý druh směny | `IMPLEMENTED` |

Poznámky:

- `ASSIGNMENT-OVERLAP` a `ABSENCE-APPROVED` jsou strukturální integrita, ne
  sporné doménové pravidlo.
- `WEEKEND-TWO-DAYS-OFF` používá výklad „během týdne“ = pondělí–neděle
  (`ASSUMPTION`). Dva dny volna se počítají jako libovolné dva dny; pokud
  nejsou po sobě jdoucí, validace vrátí `not_verified`, protože striktnější
  výklad není potvrzený.
- `REST-AFTER-SIX-DAYS` používá výklad „pracovní den“ = kalendářní den
  s alespoň jednou směnou (`ASSUMPTION`, OQ21). 35 h se měří od konce 6. dne
  do začátku další směny. Chybějící historie před týdnem vede k `not_verified`.
- `COVERAGE-REQUIRED` nesmí být zaměněno s tvrzením, že neúplný plán je
  nemožný. Neúplný návrh je přípustný, ale musí být označen.
- OQ24 zůstává otevřená: validace používá hrubé časy začátku a konce, ne
  odpracovanou dobu ani přestávky.

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

První implementovaný poskytovatel je Google Gemini (gemini-2.5-flash jako výchozí). Implementace je v `lib/ai/gemini-planning-provider.ts` a implementuje provider-neutral rozhraní `PlanningModelProvider`. Jádro na něm nezávisí. Nejjednodušší
bezpečný směr pro navazující implementaci:

- serverové volání přes existující `fetch`, bez nové závislosti, pokud to jde;
- konfigurace v prostředí (`AI_BASE_URL`, `AI_MODEL`, `AI_API_KEY`), nikdy
  klíč ve zdrojovém kódu;
- žádné volání z klientské komponenty;
- testování přes injektovaný modelový klient, ne přes skutečnou síť.

Konkrétní poskytovatel a model jsou `OPEN QUESTION`; tento dokument je
nepředjímá.

## 9. Co kontrakt záměrně neobsahuje

- měsíční období a přechody mezi týdny,
- částečné úvazky,
- pobočky, týmy, kampaně, jazyky a dovednosti jako povinná data,
- mzdy, docházku a integrace,
- databázové modely a migrace,
- autentizaci, role a audit,
- zamykání přiřazení a historii ručních úprav,
- váhy preferencí a optimalizační funkci.

Tyto věci se doplní až po potvrzení příslušných rozhodnutí. Kontrakt je
navržený tak, aby se dal rozšířit, ale neslibuje, že rozšíření bude bez změny
typů.

## 10. Otevřené otázky a předpoklady

| # | Otázka / předpoklad | Stav |
| --- | --- | --- |
| OQ21 | Co je „pracovní den“ pro šest dnů v řadě? | `OPEN QUESTION` |
| OQ22 | Jak se liší schválený požadavek od přání? | `OPEN QUESTION` |
| OQ23 | Lze potvrdit částečně neúplný návrh? | `OPEN QUESTION` |
| OQ24 | Jak se započítávají přestávky? | `OPEN QUESTION` — rozpor v zadání |
| — | Časová zóna `Europe/Prague` | `ASSUMPTION` |
| — | „Během týdne“ = pondělí–neděle | `ASSUMPTION` |
| — | Pracovní den = kalendářní den s alespoň jednou směnou | `ASSUMPTION` — OQ21 |
| — | Dva dny volna mohou být libovolné; po sobě jdoucí výklad není potvrzen | `ASSUMPTION` |
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
- AI plánovač: `PLANNED` — vrací `PlanDraft`, nikdy neukládá.
- Orchestrátor: `PLANNED` — spojí návrh, validaci a výpočet změn.

Kontrakt je `PROPOSAL`. Pokud se při implementaci ukáže, že některý údaj
chybí nebo je nadbytečný, uprav tento dokument i typy společně a uveď důvod.
