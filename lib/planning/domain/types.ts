import type { PlanProposal } from "../types";

/**
 * Minimální doménový kontrakt prvního týdenního řezu.
 *
 * Vrstva je záměrně malá: popisuje jen to, co první funkční verze skutečně
 * potřebuje — jeden týden, zaměstnance na plný úvazek, potvrzené časy směn,
 * potřebné obsazení, absence, požadavky, existující směny a potvrzená pravidla.
 *
 * Co zde záměrně není:
 * - měsíční plánování, částečné úvazky, pobočky, kampaně, mzdy;
 * - role/dovednosti jako povinný atribut (nemají potvrzené pravidlo);
 * - zamykání přiřazení (OQ9–OQ11, OQ7);
 * - potvrzení nebo uložení plánu — to je samostatný krok mimo AI i validaci.
 *
 * Kontrakt je návrh k ověření (`PROPOSAL`), ne hotová doménová specifikace.
 * Podrobný popis a otevřené otázky jsou v `docs/PLANNING_CONTRACT.md`.
 */

/** Kalendářní datum ve formátu `YYYY-MM-DD` v časové zóně plánu. */
export type IsoDate = string;

/** Místní čas ve formátu `HH:mm` v časové zóně plánu. */
export type LocalTime = string;

/** Druh směny, který první verze zná. */
export type ShiftKind = "morning" | "afternoon";

/** Časové okno směny v místním čase. */
export interface ShiftWindow {
  readonly start: LocalTime;
  readonly end: LocalTime;
}

/**
 * Definice směny.
 *
 * Časy jsou potvrzené (`VERIFIED`). První verze používá hrubý interval
 * začátku–konce; nejde o výpočet odpracované doby ani o pracovněprávní posudek.
 */
export interface ShiftDefinition {
  readonly kind: ShiftKind;
  readonly weekday: ShiftWindow;
  readonly weekend: ShiftWindow;
}

/** První verze podporuje pouze plný úvazek. */
export type EmploymentType = "full_time" | "part_time";

/** Zaměstnanec call centra. Data v testech jsou výhradně syntetická. */
export interface Employee {
  readonly id: string;
  readonly displayName: string;
  readonly employmentType: EmploymentType;
  /**
   * Volitelná provozní informace. Žádné potvrzené pravidlo ji v první verzi
   * nevyžaduje; nesmí se z ní stát skryté omezení.
   */
  readonly role?: string;
}

export type AbsenceType = "vacation" | "sick" | "other";

/**
 * Stav požadavku nebo absence.
 *
 * - `approved` — schváleno; u absence blokuje přiřazení.
 * - `pending` — čeká; je to preference, ne nárok.
 * - `rejected` — zamítnuto; neblokuje.
 */
export type ApprovalStatus = "approved" | "pending" | "rejected";

/**
 * Absence zaměstnance.
 *
 * `from` a `to` jsou včetně. Schválená absence (`approved`) je pro validaci
 * tvrdá překážka; `pending` a `rejected` se používají jen jako kontext pro AI,
 * dokud se jejich význam nepotvrdí (OQ22).
 */
export interface Absence {
  readonly id: string;
  readonly employeeId: string;
  /** První den absence včetně. */
  readonly from: IsoDate;
  /** Poslední den absence včetně. */
  readonly to: IsoDate;
  readonly type: AbsenceType;
  readonly status: ApprovalStatus;
}

export type RequestKind = "day_off" | "shift_preference";

/**
 * Požadavek zaměstnance na volno nebo preference směny.
 *
 * Požadavek není automaticky nárok. Manager rozhoduje ručně; návrh ukazuje
 * dopad na pokrytí a rozhodnutí samo nemění potvrzený rozpis (OQ22).
 */
export interface EmployeeRequest {
  readonly id: string;
  readonly employeeId: string;
  readonly date: IsoDate;
  readonly kind: RequestKind;
  /** Povinné pro `shift_preference`, jinak se ignoruje. */
  readonly shiftKind?: ShiftKind;
  readonly status: ApprovalStatus;
  readonly note?: string;
}

/** Požadavek na obsazení jedné směny v jednom dni. */
export interface StaffingRequirement {
  readonly date: IsoDate;
  readonly shiftKind: ShiftKind;
  /** Počet zaměstnanců, kteří mají být na směně. */
  readonly requiredEmployees: number;
}

/** Již existující směna; výchozí stav pro výpočet změn. */
export interface ExistingAssignment {
  readonly employeeId: string;
  readonly date: IsoDate;
  readonly shiftKind: ShiftKind;
}

/**
 * Potvrzená pravidla první verze.
 *
 * Hodnoty jsou záměrně literálové: dokud je uživatel nezmění, nesmí je žádná
 * „rozumná“ výchozí hodnota tiše přepsat. Ostatní limity nejsou potvrzené a do
 * tohoto typu nepatří.
 */
export interface PlanningRules {
  /** Po tolika po sobě jdoucích pracovních dnech musí následovat dlouhý odpočinek. */
  readonly consecutiveWorkingDaysBeforeLongRest: 6;
  /** Minimální nepřetržitý odpočinek v hodinách. */
  readonly longRestHours: 35;
  /** Po práci o víkendu tolik dnů volna v témže týdnu. */
  readonly weekendWorkDaysOff: 2;
}

/**
 * Historie práce před začátkem plánovaného týdne.
 *
 * `complete` znamená, že `assignments` je úplný seznam směn všech zaměstnanců
 * alespoň za šest kalendářních dnů před `weekStart`. Chybějící historie se
 * nesmí vykládat jako „zaměstnanec předtím nepracoval“; validace odpočinku ji
 * označí jako neověřenou.
 */
export interface PlanningHistory {
  readonly assignments: readonly ExistingAssignment[];
  readonly complete: boolean;
}

/**
 * Volitelný profil limitů pro operativní náhrady.
 *
 * Hodnoty nejsou doménovým výchozím nastavením. Pokud je profil předán bez
 * konkrétní hodnoty, kontrola zůstává `not_verified` místo domýšlení limitu.
 */
export interface ReplacementLimitsProfile {
  readonly maxHoursPerWeek?: number;
  readonly maxShiftsPerWeek?: number;
}

/** Stav výsledku deterministické validace. */
export type PlanValidationStatus = "valid" | "invalid" | "not_verified";

/** Závažnost nálezu validace. */
export type PlanValidationSeverity = "error" | "warning";

/** Stabilní kódy nálezů a neověřených kontrol. */
export type PlanValidationCode =
  | "INPUT_MISSING"
  | "INPUT_WEEK_START_INVALID"
  | "INPUT_TIME_ZONE_INVALID"
  | "INPUT_EMPLOYEE_INVALID"
  | "INPUT_EMPLOYEE_DUPLICATE"
  | "INPUT_EMPLOYMENT_TYPE_UNSUPPORTED"
  | "INPUT_SHIFT_DEFINITION_INVALID"
  | "INPUT_STAFFING_REQUIREMENT_INVALID"
  | "INPUT_STAFFING_REQUIREMENT_DUPLICATE"
  | "INPUT_ABSENCE_INVALID"
  | "INPUT_HISTORY_INVALID"
  | "INPUT_RULES_MISMATCH"
  | "PROPOSAL_INVALID"
  | "PROPOSAL_WEEK_MISMATCH"
  | "ASSIGNMENT_INVALID"
  | "ASSIGNMENT_UNKNOWN_EMPLOYEE"
  | "ASSIGNMENT_UNKNOWN_SHIFT"
  | "ASSIGNMENT_OUTSIDE_WEEK"
  | "ASSIGNMENT_DUPLICATE"
  | "COVERAGE_UNDERSTAFFED"
  | "COVERAGE_OVERSTAFFED"
  | "COVERAGE_REQUIREMENT_MISSING"
  | "SHIFT_OVERLAP"
  | "ABSENCE_APPROVED"
  | "REST_AFTER_SIX_DAYS"
  | "REST_HISTORY_INCOMPLETE"
  | "REST_INTERVAL_UNAVAILABLE"
  | "OVERLAP_INTERVAL_UNAVAILABLE"
  | "WEEKEND_TWO_DAYS_OFF"
  | "WEEKEND_DAYS_OFF_INTERPRETATION"
  | "REPLACEMENT_CONFIRMED_TIME_OFF"
  | "REPLACEMENT_LIMIT_NOT_CONFIGURED"
  | "REPLACEMENT_LIMIT_EXCEEDED";

/**
 * Nález validace.
 *
 * `code` je stabilní strojový identifikátor. `employeeId`, `date` a
 * `shiftKind` se vyplní jen tehdy, když je lze spolehlivě určit.
 */
export interface PlanValidationProblem {
  readonly code: PlanValidationCode;
  readonly severity: PlanValidationSeverity;
  readonly message: string;
  readonly employeeId?: string;
  readonly date?: IsoDate;
  readonly shiftKind?: ShiftKind;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

/**
 * Kontrola, kterou nešlo spolehlivě provést.
 *
 * Neověřená kontrola není nález porušeného pravidla. Znamená, že výsledek
 * nesmí být označen jako `valid`.
 */
export interface PlanValidationUnverifiedCheck {
  readonly code: PlanValidationCode;
  readonly message: string;
  readonly employeeId?: string;
  readonly date?: IsoDate;
  readonly shiftKind?: ShiftKind;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

/** Výsledek deterministické validace návrhu. Nikdy není potvrzením plánu. */
export interface PlanValidationResult {
  readonly status: PlanValidationStatus;
  readonly weekStart: IsoDate;
  readonly proposalId: string;
  readonly problems: readonly PlanValidationProblem[];
  readonly unverifiedChecks: readonly PlanValidationUnverifiedCheck[];
  readonly checkedRuleIds: readonly string[];
  /** Výklady, které validace použila a které nejsou uzavřeným rozhodnutím. */
  readonly assumptions: readonly string[];
}

/**
 * Vstup plánovacího běhu.
 *
 * `weekStart` musí být pondělí. `timeZone` je součástí vstupu, aby se časové
 * výpočty neopíraly o časové pásmo serveru; pro první řez se používá
 * `Europe/Prague` jako označený předpoklad.
 */
export interface PlanningInput {
  readonly weekStart: IsoDate;
  readonly timeZone: string;
  readonly employees: readonly Employee[];
  readonly shiftDefinitions: readonly ShiftDefinition[];
  readonly staffingRequirements: readonly StaffingRequirement[];
  readonly absences: readonly Absence[];
  readonly requests: readonly EmployeeRequest[];
  readonly existingAssignments: readonly ExistingAssignment[];
  readonly rules: PlanningRules;
  /** Volitelná historie před `weekStart`; bez ní nelze některé kontroly ověřit. */
  readonly history?: PlanningHistory;
  /** Volitelný explicitní profil limitů operativní náhrady. */
  readonly replacementLimits?: ReplacementLimitsProfile;
}

/**
 * Navržené přiřazení.
 *
 * AI navrhuje jen tento tvar. Neznamená to, že přiřazení splňuje pravidla —
 * ověření dělá až nezávislá validace.
 */
export interface ProposedAssignment {
  readonly employeeId: string;
  readonly date: IsoDate;
  readonly shiftKind: ShiftKind;
}

export type AssignmentChangeType = "added" | "removed" | "unchanged";

/** Změna oproti `PlanningInput.existingAssignments`. */
export interface AssignmentChange {
  readonly type: AssignmentChangeType;
  readonly assignment: ProposedAssignment;
}

/** Skutečné pokrytí jedné směny po výpočtu z navržených přiřazení. */
export interface CoverageLine {
  readonly date: IsoDate;
  readonly shiftKind: ShiftKind;
  readonly requiredEmployees: number;
  readonly assignedEmployees: number;
  readonly missingEmployees: number;
}

export type ExplanationTopic =
  | "assignment"
  | "coverage"
  | "rest"
  | "weekend"
  | "preference"
  | "other";

/**
 * Vysvětlení důležitého rozhodnutí.
 *
 * Text je určen manažerovi. Odkazy na zaměstnance a dny jsou volitelné a mají
 * pomoci dohledat přiřazení; nesmí se z nich stát strojově vynucené pravidlo.
 */
export interface Explanation {
  readonly topic: ExplanationTopic;
  readonly text: string;
  readonly employeeIds?: readonly string[];
  readonly dates?: readonly IsoDate[];
  readonly shiftKinds?: readonly ShiftKind[];
}

/**
 * Konkrétní alternativní návrh.
 *
 * Alternativa je opět jen návrh. Musí projít stejnou validací jako hlavní
 * návrh a nikdy se neaplikuje bez potvrzení manažera.
 */
export interface Alternative {
  readonly id: string;
  readonly summary: string;
  readonly impact: string;
  readonly assignments: readonly ProposedAssignment[];
  readonly tradeOffs?: readonly string[];
}

/**
 * Výstup AI plánovače před validací.
 *
 * AI vrací přiřazení, vysvětlení, alternativy a své označené předpoklady.
 * Změny a pokrytí se počítají deterministicky z přiřazení, aby se nestaly
 * dalším zdrojem neověřených tvrzení.
 */
export interface PlanDraft {
  readonly weekStart: IsoDate;
  readonly assignments: readonly ProposedAssignment[];
  readonly explanations: readonly Explanation[];
  readonly alternatives: readonly Alternative[];
  /** Předpoklady, které AI použila a které nejsou potvrzené. */
  readonly assumptions: readonly string[];
}

/**
 * Stav výsledku plánovacího běhu.
 *
 * - `not_verified` — některou kontrolu nešlo spolehlivě provést (chybí
 *   historie, požadavek na obsazení nebo potvrzený výklad pravidla).
 * - `needs_changes` — validace našla problém nebo chybí obsazení.
 * - `ready_for_review` — validace nic nenašla, ale stále čeká na manažera.
 *
 * Žádný stav neznamená „schváleno“.
 */
export type PlanningRunStatus =
  | "not_verified"
  | "needs_changes"
  | "ready_for_review";

/** Výsledek plánovacího běhu; nikdy není potvrzením. */
export interface PlanningRunResult {
  readonly weekStart: IsoDate;
  readonly proposal: PlanProposal<PlanDraft>;
  readonly changes: readonly AssignmentChange[];
  readonly coverage: readonly CoverageLine[];
  readonly validation: PlanValidationResult;
  readonly completeness: "complete" | "partial";
  readonly status: PlanningRunStatus;
  /** Výsledek běhu nikdy není potvrzení; potvrzení je samostatný krok. */
  readonly confirmed: false;
}

export type PlanningFailureCode =
  | "invalid_input"
  | "ai_not_configured"
  | "ai_failed"
  | "ai_invalid_output"
  | "validation_failed";

/** Selhání, které nemá podobu návrhu; nesmí se vydávat za prázdný plán. */
export interface PlanningFailure {
  readonly code: PlanningFailureCode;
  readonly message: string;
  readonly details?: Readonly<Record<string, string | number | boolean>>;
}

/** Výsledek orchestrátoru: buď návrh k posouzení, nebo přiznané selhání. */
export type PlanningOutcome =
  | { readonly ok: true; readonly result: PlanningRunResult }
  | { readonly ok: false; readonly failure: PlanningFailure };

/**
 * Potvrzený plán.
 *
 * Vzniká až rozhodnutím manažera, mimo AI i validační jádro. Tento typ
 * záměrně neobsahuje pole, které by šlo zaměnit s automatickým schválením.
 * Kdo potvrzení provedl a kdy, je předmětem auditu (OQ20).
 */
export interface ConfirmedPlan {
  readonly proposalId: string;
  readonly weekStart: IsoDate;
  readonly assignments: readonly ProposedAssignment[];
  readonly confirmedAt: string;
}

/** Životní cyklus incidentu s výpadkem celé směny. */
export type ReplacementIncidentStatus =
  | "open"
  | "options_generated"
  | "option_selected"
  | "confirmed"
  | "abandoned"
  | "cancelled";

/** Výpadek konkrétního zaměstnance na jedné celé existující směně. */
export interface ShiftIncident {
  readonly id: string;
  readonly status: ReplacementIncidentStatus;
  readonly date: IsoDate;
  readonly shiftKind: ShiftKind;
  readonly absentEmployeeId: string;
  readonly reportedAt?: string;
}

/** Požadavek na náhradu nad konkrétní potvrzenou verzí týdne. */
export interface ReplacementRequest {
  readonly id: string;
  readonly baseProposalId: string;
  readonly weekStart: IsoDate;
  readonly incident: ShiftIncident;
}

/** AI část návrhu varianty; autoritativní dopad se doplňuje až deterministicky. */
export interface ReplacementDraft {
  readonly id: string;
  readonly candidateEmployeeId: string;
  readonly assignments: readonly ProposedAssignment[];
  readonly summary: string;
  readonly rationale: string;
  readonly tradeOffs?: readonly string[];
}

export type ReplacementImpactKind =
  | "none"
  | "secondary_changes"
  | "domino"
  | "confirmed_time_off_change";

/** Deterministicky dopočítaný dopad varianty na zaměstnance a jejich volno. */
export interface ReplacementImpact {
  readonly kind: ReplacementImpactKind;
  readonly affectedEmployeeIds: readonly string[];
  readonly changedDates: readonly IsoDate[];
  readonly dominoChain: readonly ProposedAssignment[];
  readonly timeOffChanges: readonly ReplacementTimeOffChange[];
  readonly unverifiedReasons: readonly string[];
}

export type ReplacementTimeOffKind =
  | "approved_vacation"
  | "planned_day_off"
  | "replacement_day_off"
  | "unknown";

/** Popis změny dne volna; systém ji sám neaplikuje. */
export interface ReplacementTimeOffChange {
  readonly employeeId: string;
  readonly kind: ReplacementTimeOffKind;
  readonly originalDate: IsoDate;
  readonly newDate: IsoDate | null;
  readonly verified: boolean;
}

/** Jedna varianta po deterministickém vyhodnocení celého týdne. */
export interface ReplacementOption {
  readonly id: string;
  readonly requestId: string;
  readonly draft: ReplacementDraft;
  readonly changes: readonly AssignmentChange[];
  readonly coverage: readonly CoverageLine[];
  readonly impact: ReplacementImpact;
  readonly validation: PlanValidationResult;
  readonly status: PlanValidationStatus;
}

export type ReplacementRunStatus =
  | "not_verified"
  | "needs_changes"
  | "ready_for_review";

/** Výsledek běhu operativní náhrady; před potvrzením nemění uložený plán. */
export interface ReplacementRunResult {
  readonly request: ReplacementRequest;
  readonly basePlan: ConfirmedPlan;
  readonly options: readonly ReplacementOption[];
  readonly selectedOptionId: string | null;
  readonly completeness: "complete" | "partial";
  readonly status: ReplacementRunStatus;
  readonly confirmed: false;
}

export type ReplacementValidationCode =
  | "REPLACEMENT_REQUEST_INVALID"
  | "REPLACEMENT_WEEK_MISMATCH"
  | "REPLACEMENT_BASE_NOT_FOUND"
  | "REPLACEMENT_BASE_MISMATCH"
  | "REPLACEMENT_INCIDENT_INVALID"
  | "REPLACEMENT_INCIDENT_OUTSIDE_WEEK"
  | "REPLACEMENT_INCIDENT_UNKNOWN_EMPLOYEE"
  | "REPLACEMENT_INCIDENT_UNKNOWN_SHIFT"
  | "REPLACEMENT_INCIDENT_ASSIGNMENT_NOT_FOUND";

export interface ReplacementValidationProblem {
  readonly code: ReplacementValidationCode;
  readonly message: string;
  readonly employeeId?: string;
  readonly date?: IsoDate;
  readonly shiftKind?: ShiftKind;
}

export interface ReplacementRequestValidationResult {
  readonly status: "valid" | "invalid";
  readonly problems: readonly ReplacementValidationProblem[];
}
