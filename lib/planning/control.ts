import type {
  ControlResult,
  PlanProposal,
  PlanningRule,
  RuleProblem,
} from "./types";

/**
 * Chyba konfigurace sady pravidel (např. duplicitní identifikátor).
 *
 * Jde o **chybu kódu**, ne o stav plánu — proto se hlásí výjimkou a ne jako
 * `not_verified`.
 */
export class RuleConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleConfigurationError";
  }
}

/**
 * Spustí sadu pravidel nad návrhem a vrátí výsledek kontroly.
 *
 * Pravidla jsou **vstupem**. Jádro nezná žádné konkrétní směnové pravidlo a
 * nepředpokládá žádnou sadu pravidel — sada se může libovolně rozšířit bez
 * změny toku.
 *
 * Chování:
 *
 * - Bez jakéhokoli pravidla je výsledek `not_verified` (nikoli úspěch).
 * - Chyba uvnitř pravidla se **nechá propadnout** — kontrola se tím nikdy
 *   netváří jako čistá. Volající si může chybu odchytit sám.
 * - Duplicitní identifikátor nebo chybějící `check()` je chyba konfigurace
 *   (`RuleConfigurationError`).
 * - Pořadí problémů je deterministické: nejdřív podle pořadí pravidel, uvnitř
 *   pravidla podle pořadí nálezů.
 * - Vstupní návrh ani pole pravidel se nemění; výsledek je nový objekt, který
 *   se pozdějšími změnami vstupu nemění.
 *
 * Výsledek **není schválení plánu**. Přijetí je vždy rozhodnutí managera.
 */
export function runControl<TPlan>(
  proposal: PlanProposal<TPlan>,
  rules: readonly PlanningRule<TPlan>[],
): ControlResult {
  if (!proposal || typeof proposal.id !== "string" || proposal.id.length === 0) {
    throw new TypeError("Návrh plánu musí mít neprázdný identifikátor.");
  }
  if (
    !proposal.source ||
    typeof proposal.source.kind !== "string" ||
    proposal.source.kind.length === 0
  ) {
    throw new TypeError("Návrh plánu musí mít uvedený původ (source.kind).");
  }

  const seenRuleIds = new Set<string>();
  for (const rule of rules) {
    if (!rule || typeof rule.id !== "string" || rule.id.length === 0) {
      throw new RuleConfigurationError(
        "Každé pravidlo musí mít neprázdný identifikátor.",
      );
    }
    if (typeof rule.check !== "function") {
      throw new RuleConfigurationError(
        `Pravidlo "${rule.id}" nemá implementovanou metodu check().`,
      );
    }
    if (seenRuleIds.has(rule.id)) {
      throw new RuleConfigurationError(
        `Duplicitní identifikátor pravidla: "${rule.id}".`,
      );
    }
    seenRuleIds.add(rule.id);
  }

  // Bez pravidel nelze plán potvrdit — NOT VERIFIED, nikoli úspěch.
  if (rules.length === 0) {
    return {
      status: "not_verified",
      problems: [],
      checkedRuleIds: [],
      proposalId: proposal.id,
      source: proposal.source,
    };
  }

  const problems: RuleProblem[] = [];
  const checkedRuleIds: string[] = [];

  for (const rule of rules) {
    const issues = rule.check({ proposal, ruleId: rule.id });
    checkedRuleIds.push(rule.id);

    for (const issue of issues) {
      if (!issue || typeof issue.message !== "string" || issue.message.length === 0) {
        throw new TypeError(
          `Pravidlo "${rule.id}" vrátilo nález bez neprázdného textu.`,
        );
      }
      problems.push({
        ruleId: rule.id,
        severity: issue.severity ?? rule.severity,
        message: issue.message,
        ...(issue.details ? { details: issue.details } : {}),
      });
    }
  }

  return {
    status: problems.length > 0 ? "problems_found" : "no_problems_found",
    problems,
    checkedRuleIds,
    proposalId: proposal.id,
    source: proposal.source,
  };
}
