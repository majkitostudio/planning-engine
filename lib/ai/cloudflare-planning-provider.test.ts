import { afterEach, describe, expect, it, vi } from "vitest";

import { CloudflarePlanningProvider, splitMonthIntoWeeks } from "./cloudflare-planning-provider";
import type { MonthlyPlanningInput } from "../planning/domain/month-input";
import type { MonthlyBoundaryData } from "../planning/domain/month-validation";

const BOUNDARY: MonthlyBoundaryData = {
  before: { complete: true, assignments: [] },
  after: { complete: true, assignments: [] },
};

function makeInput(overrides: Partial<MonthlyPlanningInput> = {}): MonthlyPlanningInput {
  return {
    month: "2026-06",
    employees: [
      { id: "employee-real-1", displayName: "Jana Nováková", employmentType: "full_time" },
    ],
    absences: [],
    availability: [],
    staffingRequirements: [],
    instructions: "Preferuj Janu na ranní směny.",
    ...overrides,
  };
}

function chunkResponse(date = "2026-06-01") {
  return {
    success: true,
    result: {
      response: {
        assignments: [{ employeeId: "employee-real-1", date, shiftKind: "morning" }],
        explanations: [{ topic: "assignment", text: "Syntetické vysvětlení." }],
        assumptions: ["Syntetický předpoklad."],
        instructionsOutcome: "Pokyn zohledněn.",
      },
    },
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("CloudflarePlanningProvider", () => {
  it("rozdělí měsíc na kalendářní týdny od pondělí", () => {
    const weeks = splitMonthIntoWeeks("2026-06");
    expect(weeks.map((week) => [week.startDate, week.endDate])).toEqual([
      ["2026-06-01", "2026-06-07"],
      ["2026-06-08", "2026-06-14"],
      ["2026-06-15", "2026-06-21"],
      ["2026-06-22", "2026-06-28"],
      ["2026-06-29", "2026-06-30"],
    ]);
  });

  it("zachová i krátký první týden, když měsíc začíná uprostřed týdne", () => {
    const weeks = splitMonthIntoWeeks("2026-11");
    expect(weeks[0]).toMatchObject({ startDate: "2026-11-01", endDate: "2026-11-01" });
    expect(weeks[1]).toMatchObject({ startDate: "2026-11-02", endDate: "2026-11-08" });
    expect(weeks.at(-1)?.endDate).toBe("2026-11-30");
  });

  it("vyžaduje account ID i API token", async () => {
    const provider = new CloudflarePlanningProvider({ accountId: undefined, apiToken: undefined, fetcher: vi.fn() as unknown as typeof fetch });
    await expect(provider.generateMonthlyPlan(makeInput(), BOUNDARY)).rejects.toMatchObject({ code: "not_configured" });
  });

  it("posílá skutečná jména, JSON schéma a měsíc po týdnech", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse(chunkResponse()));
    const provider = new CloudflarePlanningProvider({
      accountId: "account-id",
      apiToken: "test-token",
      model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      fetcher: fetcher as unknown as typeof fetch,
    });

    const draft = await provider.generateMonthlyPlan(makeInput(), BOUNDARY);

    expect(fetcher).toHaveBeenCalledTimes(5);
    const [url, init] = fetcher.mock.calls[0];
    expect(String(url)).toContain("/accounts/account-id/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer test-token" });
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.max_tokens).toBe(4096);
    expect(body.messages[1].content).toContain("Jana Nováková");
    expect(body.messages[1].content).toContain("employee-real-1");
    const secondBody = JSON.parse((fetcher.mock.calls[1][1] as RequestInit).body as string);
    const secondPayload = JSON.parse(secondBody.messages[1].content.split("# Vstup\n")[1]);
    expect(secondPayload.dates).toEqual(["2026-06-08", "2026-06-09", "2026-06-10", "2026-06-11", "2026-06-12", "2026-06-13", "2026-06-14"]);
    expect(secondPayload.previousAssignments).toEqual([
      { employeeId: "employee-real-1", date: "2026-06-01", shiftKind: "morning" },
    ]);
    expect(draft.month).toBe("2026-06");
    expect(draft.assignments).toHaveLength(1);
    expect(draft.assignments[0].employeeId).toBe("employee-real-1");
  });

  it("odmítne HTTP chybu", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ success: false, errors: [{ message: "rate limited" }] }, 429));
    const provider = new CloudflarePlanningProvider({ accountId: "a", apiToken: "t", fetcher: fetcher as unknown as typeof fetch });
    await expect(provider.generateMonthlyPlan(makeInput(), BOUNDARY)).rejects.toMatchObject({ code: "failed" });
  });

  it("odmítne neplatný JSON v odpovědi", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ success: true, result: { response: "not json" } }));
    const provider = new CloudflarePlanningProvider({ accountId: "a", apiToken: "t", fetcher: fetcher as unknown as typeof fetch });
    await expect(provider.generateMonthlyPlan(makeInput(), BOUNDARY)).rejects.toMatchObject({ code: "invalid_output" });
  });

  it("odmítne doplňování části měsíce", async () => {
    const provider = new CloudflarePlanningProvider({ accountId: "a", apiToken: "t", fetcher: vi.fn() as unknown as typeof fetch });
    await expect(provider.generateMonthlyPlan(makeInput({
      planningRange: { startDate: "2026-06-10", endDate: "2026-06-20" },
    }), BOUNDARY)).rejects.toMatchObject({ code: "failed" });
  });

  it("označí přerušení jako timeout", async () => {
    const fetcher = vi.fn().mockImplementation((_url: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        const error = new Error("aborted");
        error.name = "AbortError";
        reject(error);
      });
    }));
    const provider = new CloudflarePlanningProvider({ accountId: "a", apiToken: "t", timeoutMs: 5, fetcher: fetcher as unknown as typeof fetch });
    await expect(provider.generateMonthlyPlan(makeInput(), BOUNDARY)).rejects.toMatchObject({ code: "timeout" });
  });

  it("odmítne vstup, který se nevejde do kontextu modelu, ještě před voláním", async () => {
    const fetcher = vi.fn();
    const provider = new CloudflarePlanningProvider({ accountId: "a", apiToken: "t", fetcher: fetcher as unknown as typeof fetch });
    const input = makeInput({ instructions: "x".repeat(50_000) });
    await expect(provider.generateMonthlyPlan(input, BOUNDARY)).rejects.toMatchObject({
      code: "failed",
      message: expect.stringContaining("příliš velký"),
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("nepřekročí celkový rozpočet na celý měsíc", async () => {
    const fetcher = vi.fn();
    const provider = new CloudflarePlanningProvider({
      accountId: "a",
      apiToken: "t",
      totalTimeoutMs: 0,
      fetcher: fetcher as unknown as typeof fetch,
    });
    await expect(provider.generateMonthlyPlan(makeInput(), BOUNDARY)).rejects.toMatchObject({ code: "timeout" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
