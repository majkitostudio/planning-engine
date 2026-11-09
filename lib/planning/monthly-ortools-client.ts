import type { MonthlyPlanningInput } from "./domain/month-input";
import type { MonthlyBoundaryData } from "./domain/month-validation";
import { createOrtoolsRequest, parseOrtoolsResponse, type OrtoolsResult } from "./monthly-ortools-contract";

/** Provozní chyby se nikdy nesmějí zaměnit za stav INFEASIBLE. */
export class MonthlySolverError extends Error {
  constructor(readonly code: "configuration" | "input" | "timeout" | "unavailable" | "invalid_output") {
    super(code);
    this.name = "MonthlySolverError";
  }
}

export interface OrtoolsClientOptions {
  readonly url: string;
  readonly token: string;
  readonly timeoutMs?: number;
  readonly solverTimeoutSeconds?: number;
  readonly fetcher?: typeof fetch;
}

// Technické limity přenosu, nikoli produktové limity počtu zaměstnanců.
const MAX_REQUEST_BYTES = 3_000_000;
const MAX_RESPONSE_BYTES = 3_000_000;

async function readResponse(response: Response): Promise<unknown> {
  const length = response.headers.get("content-length");
  if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_RESPONSE_BYTES)) throw new MonthlySolverError("invalid_output");
  if (!response.body) throw new MonthlySolverError("invalid_output");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new MonthlySolverError("invalid_output");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown; }
  catch { throw new MonthlySolverError("invalid_output"); }
}

/** Samostatný HTTP klient; jeho zapnutí v aplikaci je oddělený krok. */
export async function callMonthlyOrtools(input: MonthlyPlanningInput, boundary: MonthlyBoundaryData, options: OrtoolsClientOptions): Promise<OrtoolsResult> {
  let url: URL;
  try { url = new URL(options.url); } catch { throw new MonthlySolverError("configuration"); }
  const timeoutMs = options.timeoutMs ?? 30_000;
  const solverTimeoutSeconds = options.solverTimeoutSeconds ?? 20;
  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search || options.token.length < 32 || options.token.trim() !== options.token || /[\r\n]/.test(options.token) || !Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300_000 || solverTimeoutSeconds * 1000 >= timeoutMs) throw new MonthlySolverError("configuration");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let payload: ReturnType<typeof createOrtoolsRequest>;
    try { payload = createOrtoolsRequest(input, boundary, solverTimeoutSeconds); }
    catch { throw new MonthlySolverError("input"); }
    const body = JSON.stringify(payload.request);
    if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) throw new MonthlySolverError("input");
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${options.token}` }, body, signal: controller.signal, redirect: "error", cache: "no-store" });
    } catch {
      throw new MonthlySolverError(controller.signal.aborted ? "timeout" : "unavailable");
    }
    if (!response.ok) throw new MonthlySolverError("unavailable");
    let value: unknown;
    try { value = await readResponse(response); }
    catch (error) {
      if (controller.signal.aborted) throw new MonthlySolverError("timeout");
      if (error instanceof MonthlySolverError) throw error;
      throw new MonthlySolverError("unavailable");
    }
    try { return parseOrtoolsResponse(value, input.month, payload.employeeIds); }
    catch { throw new MonthlySolverError("invalid_output"); }
  } finally {
    clearTimeout(timer);
  }
}
