import { spawn } from "node:child_process";
import { join } from "node:path";
import type { MonthlyBoundaryData } from "./domain/month-validation";
import type { MonthlyPlanningInput } from "./domain/month-input";
import { validateMonthlyInput } from "./domain/month-input";
import { MonthlyProviderError, type MonthlyPlanDraft, type MonthlyPlanningProvider } from "./monthly-planning";

type SolverAssignment = { employeeId: string; date: string; shiftKind: "morning" | "afternoon" };
type SolverResponse = { status: "feasible"; assignments: SolverAssignment[] }
  | { status: "infeasible" | "unknown" | "unavailable" | "invalid_input" | "error" };
type SolverExecutor = (payload: string) => Promise<string>;

const DEFAULT_SOLVER_TIMEOUT_MS = 120_000;
const MAX_SOLVER_TIMEOUT_MS = 300_000;

function getSolverTimeoutMs(): number {
  const raw = process.env.PLANNING_SOLVER_TIMEOUT_MS?.trim();
  const parsed = raw ? Number(raw) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SOLVER_TIMEOUT_MS;
  return Math.min(parsed, MAX_SOLVER_TIMEOUT_MS);
}
const MAX_OUTPUT_CHARS = 2_000_000;

function executeLocalSolver(payload: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const python = process.env.PLANNING_PYTHON_EXECUTABLE?.trim() || "python";
    const script = join(process.cwd(), "scripts", "monthly_solver.py");
    let child;
    try {
      child = spawn(/*turbopackIgnore: true*/ python, [script], { stdio: ["pipe", "pipe", "ignore"], windowsHide: true, shell: false });
    } catch {
      reject(new MonthlyProviderError("solver_unavailable"));
      return;
    }

    let output = "";
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback();
    };
    const solverTimeoutMs = getSolverTimeoutMs();
    const timer = setTimeout(() => {
      finish(() => {
        child.kill();
        reject(new MonthlyProviderError("solver_timeout"));
      });
    }, solverTimeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      output += chunk;
      if (output.length > MAX_OUTPUT_CHARS) {
        finish(() => {
          child.kill();
          reject(new MonthlyProviderError("solver_invalid_output"));
        });
      }
    });
    child.on("error", () => finish(() => reject(new MonthlyProviderError("solver_unavailable"))));
    child.on("close", (code: number | null) => finish(() => {
      if (code !== 0) reject(new MonthlyProviderError("solver_unavailable"));
      else resolve(output);
    }));
    child.stdin.end(payload);
  });
}

export class MonthlyOrtoolsProvider implements MonthlyPlanningProvider {
  readonly name = "ortools";

  constructor(private readonly execute: SolverExecutor = executeLocalSolver) {}

  async generateMonthlyPlan(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData): Promise<MonthlyPlanDraft> {
    const employeeTokens = new Map(input.employees.map((employee, index) => [employee.id, `employee-${index}`]));
    const employeeIds = new Map([...employeeTokens].map(([id, token]) => [token, id]));
    const tokenize = (employeeId: string) => employeeTokens.get(employeeId) ?? "";
    const range = input.planningRange;
    let fixedDays: object[] | undefined;
    if (range) {
      if (!validateMonthlyInput(input).ok || !input.rosterHistory) throw new Error("Chybí platné podklady pro doplánování.");
      fixedDays = [];
      for (const day of input.rosterHistory.days) {
        const inside = day.date >= range.startDate && day.date <= range.endDate;
        if (inside) {
          if (day.status !== "unknown") throw new Error("Doplňovaný úsek se překrývá s existujícími podklady.");
          continue;
        }
        if (day.status === "shift") fixedDays.push({ employeeId: tokenize(day.employeeId), date: day.date, status: "shift", startTime: day.startTime, endTime: day.endTime, ...(day.shiftKind ? { shiftKind: day.shiftKind } : {}) });
        else if (day.status === "off") fixedDays.push({ employeeId: tokenize(day.employeeId), date: day.date, status: "off" });
        else throw new Error("Pevné dny nejsou jednoznačně známé.");
      }
    }
    const solverBoundary = (side: MonthlyBoundaryData["before"]) => {
      const assignments = side.assignments.filter((assignment) => assignment.shiftKind);
      return {
        complete: side.complete && assignments.length === side.assignments.length,
        assignments: assignments.map((assignment) => ({ employeeId: tokenize(assignment.employeeId), date: assignment.date, shiftKind: assignment.shiftKind! })),
      };
    };
    const hasUnclassifiedBoundary = [...boundary.before.assignments, ...boundary.after.assignments].some((assignment) => !assignment.shiftKind);
    const request = {
      input: {
        month: input.month,
        employees: input.employees.map((employee) => ({ id: tokenize(employee.id), employmentType: employee.employmentType })),
        absences: input.absences.map(({ employeeId, from, to, type, status }) => ({ employeeId: tokenize(employeeId), from, to, type, status })),
        availability: input.availability.map(({ employeeId, date, shiftKind, available }) => ({ employeeId: tokenize(employeeId), date, shiftKind, available })),
        staffingRequirements: input.staffingRequirements,
        ...(range ? { planningRange: range, fixedDays } : {}),
        ...(input.shiftRotationPreference === undefined ? {} : { shiftRotationPreference: input.shiftRotationPreference }),
        ...(input.workFunds === undefined ? {} : { workFunds: input.workFunds.map(({ employeeId, hours, excusedHours }) => ({ employeeId: tokenize(employeeId), hours, excusedHours })) }),
      },
      boundary: {
        before: solverBoundary(boundary.before),
        after: solverBoundary(boundary.after),
      },
      timeoutSeconds: Math.min(getSolverTimeoutMs() / 1000, 300),
    };

    let response: SolverResponse;
    try {
      response = JSON.parse(await this.execute(JSON.stringify(request))) as SolverResponse;
    } catch (error) {
      if (error instanceof MonthlyProviderError) throw error;
      throw new MonthlyProviderError("solver_invalid_output");
    }
    if (!response || typeof response !== "object" || typeof response.status !== "string") throw new MonthlyProviderError("solver_invalid_output");
    if (response.status === "infeasible") throw new MonthlyProviderError("solver_infeasible");
    if (response.status === "unknown") throw new MonthlyProviderError("solver_timeout");
    if (response.status === "unavailable" || response.status === "error") throw new MonthlyProviderError("solver_unavailable");
    if (response.status !== "feasible") throw new MonthlyProviderError("solver_invalid_output");
    if (!Array.isArray(response.assignments) || response.assignments.some((item) =>
      !item || typeof item !== "object" || typeof item.employeeId !== "string" || !employeeIds.has(item.employeeId)
      || typeof item.date !== "string" || (range && (item.date < range.startDate || item.date > range.endDate)) || (item.shiftKind !== "morning" && item.shiftKind !== "afternoon"))) {
      throw new MonthlyProviderError("solver_invalid_output");
    }

    return {
      month: input.month,
      assignments: response.assignments.map((item) => ({ ...item, employeeId: employeeIds.get(item.employeeId)! })),
      explanations: [],
      alternatives: [],
      assumptions: hasUnclassifiedBoundary ? ["Plánovač nevyhodnotil vlastní časy směn v okolní historii jako ranní nebo odpolední; nezávislá kontrola ověřila přesné časy před potvrzením."] : [],
      instructionsOutcome: "Plán sestavil lokální OR-Tools. Textové pokyny nebyly automaticky vyhodnoceny ani odeslány externí AI.",
    };
  }
}
