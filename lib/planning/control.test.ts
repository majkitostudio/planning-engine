import { describe, expect, it } from "vitest";

import { RuleConfigurationError, runControl } from "./control";
import type { PlanProposal, PlanningRule } from "./types";

/**
 * Testovací plán je záměrně **technický**, ne doménový: neobsahuje žádné
 * směny, zaměstnance ani směnová pravidla. Konkrétní doménové typy se
 * doplní až po schválení kontraktu.
 */
type TestPlan = { entries: string[] };

const proposal: PlanProposal<TestPlan> = {
  id: "test-navrh-1",
  source: { kind: "manual" },
  plan: { entries: ["a", "b"] },
};

/** Jednoduché testovací pravidlo: hlásí prázdný seznam položek. */
const emptyEntriesRule: PlanningRule<TestPlan> = {
  id: "TEST-EMPTY-ENTRIES",
  severity: "error",
  description: "Testovací pravidlo: seznam položek nesmí být prázdný.",
  check: ({ proposal: candidate }) =>
    candidate.plan.entries.length === 0
      ? [{ message: "Seznam položek je prázdný." }]
      : [],
};

/** Testovací pravidlo, které vždy najde jeden problém. */
const alwaysFailingRule: PlanningRule<TestPlan> = {
  id: "TEST-ALWAYS-FAILS",
  severity: "warning",
  check: () => [{ message: "Testovací nález." }],
};

describe("runControl", () => {
  it("bez nakonfigurovaných pravidel vrátí NOT VERIFIED, ne úspěch", () => {
    const result = runControl(proposal, []);

    expect(result.status).toBe("not_verified");
    expect(result.status).not.toBe("no_problems_found");
    expect(result.problems).toEqual([]);
    expect(result.checkedRuleIds).toEqual([]);
  });

  it("bezproblémový průchod jednoduchým pravidlem vrátí no_problems_found", () => {
    const result = runControl(proposal, [emptyEntriesRule]);

    expect(result.status).toBe("no_problems_found");
    expect(result.problems).toEqual([]);
    expect(result.checkedRuleIds).toEqual(["TEST-EMPTY-ENTRIES"]);
  });

  it("nalezený problém nese stabilní identifikátor pravidla a závažnost", () => {
    const result = runControl(proposal, [alwaysFailingRule]);

    expect(result.status).toBe("problems_found");
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.ruleId).toBe("TEST-ALWAYS-FAILS");
    expect(result.problems[0]?.severity).toBe("warning");
    expect(result.problems[0]?.message).toBe("Testovací nález.");
  });

  it("závažnost konkrétního nálezu přepíše výchozí závažnost pravidla", () => {
    const rule: PlanningRule<TestPlan> = {
      id: "TEST-OVERRIDE-SEVERITY",
      severity: "info",
      check: () => [{ message: "Nález s jinou závažností.", severity: "error" }],
    };

    const result = runControl(proposal, [rule]);

    expect(result.problems[0]?.severity).toBe("error");
  });

  it("výsledek nese identifikátor návrhu a jeho původ", () => {
    const result = runControl(
      { ...proposal, source: { kind: "mechanical", note: "test" } },
      [emptyEntriesRule],
    );

    expect(result.proposalId).toBe("test-navrh-1");
    expect(result.source).toEqual({ kind: "mechanical", note: "test" });
  });

  it("původ návrhu je jen informace — tok kontroly se podle něj nemění", () => {
    const manual = runControl(proposal, [emptyEntriesRule]);
    const ai = runControl(
      { ...proposal, source: { kind: "ai" } },
      [emptyEntriesRule],
    );

    expect(ai.status).toBe(manual.status);
    expect(ai.problems).toEqual(manual.problems);
  });

  it("výsledek kontroly není schválení plánu", () => {
    const result = runControl(proposal, [emptyEntriesRule]);

    expect(result).not.toHaveProperty("approved");
    expect(result).not.toHaveProperty("accepted");
    expect(result).not.toHaveProperty("decision");
  });

  it("spustí všechna pravidla a sesbírá nálezy ze všech", () => {
    const result = runControl(proposal, [emptyEntriesRule, alwaysFailingRule]);

    expect(result.checkedRuleIds).toEqual([
      "TEST-EMPTY-ENTRIES",
      "TEST-ALWAYS-FAILS",
    ]);
    expect(result.problems).toHaveLength(1);
    expect(result.problems[0]?.ruleId).toBe("TEST-ALWAYS-FAILS");
  });

  it("duplicitní identifikátor pravidla je chyba konfigurace", () => {
    expect(() => runControl(proposal, [emptyEntriesRule, emptyEntriesRule])).toThrow(
      RuleConfigurationError,
    );
  });

  it("chyba uvnitř pravidla se nespolhne a neprojde jako čistá kontrola", () => {
    const brokenRule: PlanningRule<TestPlan> = {
      id: "TEST-THROWS",
      severity: "error",
      check: () => {
        throw new Error("Pravidlo selhalo.");
      },
    };

    expect(() => runControl(proposal, [brokenRule])).toThrow("Pravidlo selhalo.");
  });

  it("návrh bez identifikátoru nebo původu je chyba volajícího", () => {
    expect(() =>
      runControl({ ...proposal, id: "" }, [emptyEntriesRule]),
    ).toThrow(TypeError);
    expect(() =>
      runControl(
        { ...proposal, source: { kind: "" } },
        [emptyEntriesRule],
      ),
    ).toThrow(TypeError);
  });

  it("nález bez neprázdného textu je chyba pravidla", () => {
    const rule: PlanningRule<TestPlan> = {
      id: "TEST-EMPTY-MESSAGE",
      severity: "error",
      check: () => [{ message: "" }],
    };

    expect(() => runControl(proposal, [rule])).toThrow(
      'Pravidlo "TEST-EMPTY-MESSAGE" vrátilo nález bez neprázdného textu.',
    );
  });

  it("pravidlo bez implementovaného check() je chyba konfigurace", () => {
    const brokenRule = {
      id: "TEST-NO-CHECK",
      severity: "error",
    } as unknown as PlanningRule<TestPlan>;

    expect(() => runControl(proposal, [brokenRule])).toThrow(
      RuleConfigurationError,
    );
  });

  it("předá technické detaily nálezu beze změny", () => {
    const rule: PlanningRule<TestPlan> = {
      id: "TEST-DETAILS",
      severity: "warning",
      check: () => [
        {
          message: "Nález s detailem.",
          details: { index: 2, entry: "b", hidden: false },
        },
      ],
    };

    const result = runControl(proposal, [rule]);

    expect(result.problems[0]?.details).toEqual({
      index: 2,
      entry: "b",
      hidden: false,
    });
  });

  it("pořadí problémů odpovídá pořadí pravidel a jejich nálezů", () => {
    const first: PlanningRule<TestPlan> = {
      id: "TEST-FIRST",
      severity: "error",
      check: () => [{ message: "První nález." }, { message: "Druhý nález." }],
    };
    const second: PlanningRule<TestPlan> = {
      id: "TEST-SECOND",
      severity: "error",
      check: () => [{ message: "Třetí nález." }],
    };

    const result = runControl(proposal, [first, second]);

    expect(result.problems.map((problem) => problem.message)).toEqual([
      "První nález.",
      "Druhý nález.",
      "Třetí nález.",
    ]);
    expect(result.problems.map((problem) => problem.ruleId)).toEqual([
      "TEST-FIRST",
      "TEST-FIRST",
      "TEST-SECOND",
    ]);
  });

  it("výsledek je snapshot — pozdější změna pole pravidel ho neovlivní", () => {
    const rules: PlanningRule<TestPlan>[] = [alwaysFailingRule];
    const result = runControl(proposal, rules);

    rules.push(emptyEntriesRule);
    rules.length = 0;

    expect(result.checkedRuleIds).toEqual(["TEST-ALWAYS-FAILS"]);
    expect(result.problems).toHaveLength(1);
  });
});
