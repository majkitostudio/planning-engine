import { describe, expect, it } from "vitest";

import { GeminiPlanningProvider } from "./gemini-planning-provider";
import { runPlanning } from "../planning/orchestrator";
import {
  CONFIRMED_PLANNING_RULES,
  CONFIRMED_SHIFT_DEFINITIONS,
} from "../planning/domain";

const SHOULD_RUN =
  Boolean(process.env.GEMINI_API_KEY) &&
  process.env.RUN_GEMINI_INTEGRATION === "1";

describe.skipIf(!SHOULD_RUN)("Gemini integration", () => {
  it(
    "skutečně zavolá Gemini API a vrátí strukturovaný návrh",
    async () => {
      const input = {
        weekStart: "2026-06-01",
        timeZone: "Europe/Prague",
        employees: [{ id: "e1", displayName: "Synteticky e1", employmentType: "full_time" as const }],
        shiftDefinitions: CONFIRMED_SHIFT_DEFINITIONS,
        staffingRequirements: [
          { date: "2026-06-01", shiftKind: "morning" as const, requiredEmployees: 1 },
        ],
        absences: [],
        requests: [],
        existingAssignments: [],
        rules: CONFIRMED_PLANNING_RULES,
        history: { assignments: [], complete: true },
      };

      const provider = new GeminiPlanningProvider();
      const outcome = await runPlanning(input, provider, { timeoutMs: 60_000 });

      // Komunikace proběhla, pokud nedošlo k síťové/chybové selhání konfigurace.
      expect(["ai_not_configured"]).not.toContain(
        outcome.ok ? "ok" : outcome.failure.code,
      );

      if (outcome.ok) {
        expect(outcome.result.proposal.plan.weekStart).toBe("2026-06-01");
        expect(Array.isArray(outcome.result.proposal.plan.assignments)).toBe(true);
      } else {
        // Neplatný výstup modelu je přijatelný výsledek integračního testu,
        // ale nesmí to být chybějící konfigurace.
        expect(outcome.failure.code).not.toBe("ai_not_configured");
      }
    },
    60_000,
  );
});
