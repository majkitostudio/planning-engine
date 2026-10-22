/**
 * Kontrakty čistého plánovacího jádra.
 *
 * Jádro je záměrně **doménově nezávislé**: nezná směny, zaměstnance, úvazky
 * ani tvrdá pravidla H1–H7. Konkrétní doménové typy se doplní až po
 * schválení kontraktu (viz `docs/DOMAIN_SPECIFICATION.md`, OQ3–OQ5 a
 * OQ9–OQ11).
 *
 * Cílový tok:
 *
 * ```text
 * zdroj návrhu → návrh plánu → kontrola dostupnými pravidly → výsledek kontroly
 *                                                                    → rozhodnutí managera
 * ```
 *
 * Poslední krok (rozhodnutí managera) je záměrně **mimo jádro** — návrh sám
 * se nikdy neschvaluje automaticky.
 */

/** Známé druhy zdroje návrhu. */
export type KnownProposalSourceKind = "manual" | "mechanical" | "ai";

/**
 * Druh zdroje návrhu.
 *
 * Jádro tento údaj nikdy nevyhodnocuje — slouží pouze jako informace o
 * původu návrhu, **nikoli jako oprávnění k jeho přijetí**. Další druhy lze
 * doplnit bez zásahu do toku kontroly.
 */
export type ProposalSourceKind = KnownProposalSourceKind | (string & {});

/** Původ návrhu plánu. */
export interface ProposalSource {
  /** Odkud návrh pochází (ručně, mechanicky, AI…). */
  kind: ProposalSourceKind;
  /** Volitelná poznámka k původu (např. název nástroje). */
  note?: string;
}

/**
 * Návrh plánu — to, co se posílá ke kontrole.
 *
 * Obsah `plan` je záměrně neznámý jádru (`unknown`): konkrétní tvar
 * doménových dat se doplní až po schválení kontraktu.
 */
export interface PlanProposal<TPlan = unknown> {
  /** Stabilní technický identifikátor návrhu. */
  id: string;
  /** Původ návrhu. */
  source: ProposalSource;
  /** Návrh k posouzení. */
  plan: TPlan;
}

/**
 * Závažnost nálezu.
 *
 * Jádro nezná doménové důsledky — rozlišuje pouze technickou závažnost
 * nálezu, kterou mu pravidlo samo deklaruje.
 */
export type RuleSeverity = "info" | "warning" | "error";

/** Nález jednoho pravidla (bez identifikátoru pravidla — ten doplňuje běh). */
export interface RuleIssue {
  /** Krátká popisná zpráva. */
  message: string;
  /** Výchozí závažnost je závažnost pravidla; tohle ji může přepsat. */
  severity?: RuleSeverity;
  /** Volitelné technické detaily (bez osobních dat). */
  details?: Readonly<Record<string, string | number | boolean>>;
}

/** Kontext, ve kterém pravidlo běží. */
export interface RuleContext<TPlan = unknown> {
  /** Návrh, který se kontroluje. */
  proposal: PlanProposal<TPlan>;
  /** Identifikátor právě běžícího pravidla. */
  ruleId: string;
}

/** Pravidlo kontroly. Konkrétní pravidla (H1–H7) se doplní po schválení. */
export interface PlanningRule<TPlan = unknown> {
  /** Stabilní identifikátor pravidla. */
  id: string;
  /** Výchozí závažnost nálezů tohoto pravidla. */
  severity: RuleSeverity;
  /** Volitelný popis pravidla pro člověka. */
  description?: string;
  /** Zkontroluje návrh a vrátí nalezené problémy. */
  check(context: RuleContext<TPlan>): RuleIssue[];
}

/**
 * Stav kontroly.
 *
 * - `no_problems_found` — kontrola proběhla a žádný problém nenašla.
 * - `problems_found` — kontrola našla alespoň jeden problém.
 * - `not_verified` — plán **nelze potvrdit**, protože nejsou nakonfigurovaná
 *   žádná pravidla. Tento stav se nesmí číst jako úspěch, bezpečnost,
 *   schválení ani hotový plán.
 */
export type ControlStatus = "no_problems_found" | "problems_found" | "not_verified";

/** Nalezený problém s odkazem na pravidlo, které ho našlo. */
export interface RuleProblem {
  /** Stabilní identifikátor pravidla, které problém našlo. */
  ruleId: string;
  /** Závažnost nálezu. */
  severity: RuleSeverity;
  /** Krátká popisná zpráva. */
  message: string;
  /** Volitelné technické detaily (bez osobních dat). */
  details?: Readonly<Record<string, string | number | boolean>>;
}

/** Výsledek kontroly návrhu. */
export interface ControlResult {
  /** Stav kontroly. */
  status: ControlStatus;
  /** Nalezené problémy; prázdné, pokud žádné nebyly nalezeny. */
  problems: RuleProblem[];
  /** Identifikátory pravidel, která se skutečně spustila. */
  checkedRuleIds: string[];
  /** Identifikátor kontrolovaného návrhu. */
  proposalId: string;
  /** Původ návrhu — informace o původu, ne oprávnění. */
  source: ProposalSource;
}
