import { afterEach, describe, expect, it, vi } from "vitest";

import { CloudflarePlanningProvider, splitMonthIntoWeeks } from "./cloudflare-planning-provider";
import type { MonthlyPlanningInput } from "../planning/domain/month-input";
import type { MonthlyBoundaryData } from "../planning/domain/month-validation";
import { syntheticMonthlyBoundary, syntheticMonthlyInput } from "../../tests/fixtures/synthetic-monthly-nov-2026";

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
    expect(secondPayload.previousAssignments).toEqual([[0, "2026-06-01", "M"]]);
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

  it("bezztrátově rekonstruuje celou matici 29 osob pro všechny týdny pod limitem promptu", async () => {
    const input = {
      ...syntheticMonthlyInput,
      availability: syntheticMonthlyInput.availability.filter((item) =>
        !(item.employeeId === syntheticMonthlyInput.employees[0].id && item.date === "2026-11-02" && item.shiftKind === "morning"),
      ),
      absences: [
        ...syntheticMonthlyInput.absences,
        { id: "synthetic-pending", employeeId: syntheticMonthlyInput.employees[0].id, from: "2026-11-02", to: "2026-11-02", type: "vacation" as const, status: "pending" as const },
        { id: "synthetic-rejected", employeeId: syntheticMonthlyInput.employees[28].id, from: "2026-11-30", to: "2026-11-30", type: "other" as const, status: "rejected" as const },
      ],
    };
    const boundary: MonthlyBoundaryData = {
      before: { complete: false, assignments: [
        { employeeId: input.employees[0].id, date: "2026-10-31", shiftKind: "afternoon" },
        { employeeId: input.employees[1].id, date: "2026-10-30", startTime: "09:00", endTime: "17:00" },
      ] },
      after: { complete: true, assignments: [{ employeeId: input.employees[1].id, date: "2026-12-01", shiftKind: "morning" }] },
    };
    const fetcher = vi.fn().mockImplementation((_url: unknown, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      const payload = JSON.parse((body.messages[1].content as string).split("# Vstup\n")[1]);
      const assignments = payload.dates.map((date: string, index: number) => ({
        employeeId: input.employees[index % input.employees.length].id,
        date,
        shiftKind: index % 2 === 0 ? "morning" : "afternoon",
      }));
      return Promise.resolve(jsonResponse({
        success: true,
        result: { response: { assignments, explanations: [], assumptions: [], instructionsOutcome: "" } },
      }));
    });
    const provider = new CloudflarePlanningProvider({ accountId: "a", apiToken: "t", fetcher: fetcher as unknown as typeof fetch });

    await provider.generateMonthlyPlan(input, boundary);

    const firstBody = JSON.parse((fetcher.mock.calls[0][1] as RequestInit).body as string);
    const firstPrompt = firstBody.messages[1].content as string;
    const firstPayload = JSON.parse(firstPrompt.split("# Vstup\n")[1]);
    expect(fetcher).toHaveBeenCalledTimes(6);
    expect(firstPrompt.length).toBeLessThan(40_000);
    const reconstructed = new Map<string, boolean | undefined>();
    let sawFirstEmployee = false;
    let sawLastEmployee = false;
    let sawMorning = false;
    let sawAfternoon = false;
    const observedAbsenceStatuses = new Set<string>();
    const observedAbsences = new Set<string>();
    const expectedHistory: [number, string, "M" | "A"][] = [];
    for (const [, init] of fetcher.mock.calls) {
      const body = JSON.parse((init as RequestInit).body as string);
      const prompt = body.messages[1].content as string;
      expect(prompt.length).toBeLessThan(40_000);
      expect(prompt).toContain("available=známé true");
      expect(prompt).toContain("unavailable=známé false");
      expect(prompt).toContain("missing=žádný údaj/unknown");
      expect(prompt).toContain("Schválené (`approved`) absence jsou potvrzené a blokují přiřazení");
      const payload = JSON.parse(prompt.split("# Vstup\n")[1]);
      expect(payload.employees).toHaveLength(29);
      expect(payload.previousAssignments).toEqual(expectedHistory);
      const states = payload.availability as Record<string, [number, number, "morning" | "afternoon"][]>;
      const dateGroups: Record<string, boolean | undefined> = { available: true, unavailable: false, missing: undefined };
      for (const [state, cells] of Object.entries(states)) {
        for (const [employeeIndex, dateIndex, shiftKind] of cells) {
          const key = `${employeeIndex}|${payload.dates[dateIndex]}|${shiftKind}`;
          expect(reconstructed.has(key)).toBe(false);
          reconstructed.set(key, dateGroups[state]);
          sawFirstEmployee ||= employeeIndex === 0;
          sawLastEmployee ||= employeeIndex === 28;
          sawMorning ||= shiftKind === "morning";
          sawAfternoon ||= shiftKind === "afternoon";
        }
      }
      for (const absence of payload.absences as { employeeIndex: number; from: string; to: string; type: string; status: string }[]) {
        observedAbsenceStatuses.add(absence.status);
        observedAbsences.add(JSON.stringify(absence));
        expect(absence.employeeIndex).toBeGreaterThanOrEqual(0);
        expect(["approved", "pending", "rejected"]).toContain(absence.status);
      }
      for (const [dateIndex, date] of (payload.dates as string[]).entries()) {
        expectedHistory.push([dateIndex % input.employees.length, date, dateIndex % 2 === 0 ? "M" : "A"]);
      }
    }
    expect(reconstructed.size).toBe(29 * 30 * 2);
    const dates = [...new Set(syntheticMonthlyInput.availability.map((cell) => cell.date))];
    for (let employeeIndex = 0; employeeIndex < input.employees.length; employeeIndex += 1) {
      for (const date of dates) {
        for (const shiftKind of ["morning", "afternoon"] as const) {
          const source = input.availability.find((cell) => cell.employeeId === input.employees[employeeIndex].id && cell.date === date && cell.shiftKind === shiftKind);
          const key = `${employeeIndex}|${date}|${shiftKind}`;
          expect(reconstructed.has(key)).toBe(true);
          expect(reconstructed.get(key)).toBe(source?.available);
        }
      }
    }
    expect(sawFirstEmployee).toBe(true);
    expect(sawLastEmployee).toBe(true);
    expect(sawMorning).toBe(true);
    expect(sawAfternoon).toBe(true);
    expect(observedAbsenceStatuses).toEqual(new Set(["approved", "pending", "rejected"]));
    for (const absence of input.absences) {
      expect(observedAbsences.has(JSON.stringify({
        employeeIndex: input.employees.findIndex((employee) => employee.id === absence.employeeId),
        from: absence.from,
        to: absence.to,
        type: absence.type,
        status: absence.status,
      }))).toBe(true);
    }
    expect(firstPayload.boundary).toEqual({
      before: { complete: false, assignments: [
        [0, "2026-10-31", "A", null, null],
        [1, "2026-10-30", "?", "09:00", "17:00"],
      ] },
      after: { complete: true, assignments: [[1, "2026-12-01", "M", null, null]] },
    });
    for (const [, init] of fetcher.mock.calls) {
      const body = JSON.parse((init as RequestInit).body as string);
      expect(body.messages[1].content.length).toBeLessThan(40_000);
    }
  });

  it("přenese celé předchozí přiřazení i s růstem historie v kompaktní podobě", async () => {
    const fetcher = vi.fn().mockImplementation((_url: unknown, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      const prompt = body.messages[1].content as string;
      const payload = JSON.parse(prompt.split("# Vstup\n")[1]);
      const assignment = payload.dates.length > 0
        ? { employeeId: "synthetic-employee-01", date: payload.dates[0], shiftKind: "morning" }
        : undefined;
      return Promise.resolve(jsonResponse({
        success: true,
        result: { response: { assignments: assignment ? [assignment] : [], explanations: [], assumptions: [], instructionsOutcome: "" } },
      }));
    });
    const provider = new CloudflarePlanningProvider({ accountId: "a", apiToken: "t", fetcher: fetcher as unknown as typeof fetch });

    await provider.generateMonthlyPlan(syntheticMonthlyInput, syntheticMonthlyBoundary);

    const sixthBody = JSON.parse((fetcher.mock.calls[5][1] as RequestInit).body as string);
    const sixthPayload = JSON.parse(sixthBody.messages[1].content.split("# Vstup\n")[1]);
    expect(sixthPayload.previousAssignments).toEqual([
      [0, "2026-11-01", "M"],
      [0, "2026-11-02", "M"],
      [0, "2026-11-09", "M"],
      [0, "2026-11-16", "M"],
      [0, "2026-11-23", "M"],
    ]);
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
