"use client";

import { useCallback, useEffect, useState } from "react";

interface RequestImpact {
  readonly date: string;
  readonly shiftKind: "morning" | "afternoon";
  readonly currentAssignedEmployees: number;
  readonly assignedAfterRequest: number;
  readonly requiredEmployees: number;
  readonly missingEmployees: number;
  readonly suggestedCandidates: readonly string[];
}

interface ManagedRequest {
  readonly id: string;
  readonly employeeId: string;
  readonly employeeLabel: string;
  readonly date: string;
  readonly kind: "day_off" | "shift_preference";
  readonly shiftKind?: "morning" | "afternoon";
  readonly summary: string;
  readonly status: "pending" | "approved" | "rejected";
  readonly preview: { readonly impacts: readonly RequestImpact[] };
}

interface RequestsResponse {
  readonly ok: boolean;
  readonly canDecide?: boolean;
  readonly simulated?: boolean;
  readonly requests?: readonly ManagedRequest[];
  readonly rejected?: { readonly message: string };
}

const dayNames = ["neděli", "pondělí", "úterý", "středu", "čtvrtek", "pátek", "sobotu"];

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  const weekday = dayNames[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  return `${weekday} ${day}. ${month}. ${year}`;
}

function shiftLabel(shiftKind: RequestImpact["shiftKind"]): string {
  return shiftKind === "morning" ? "Ranní" : "Odpolední";
}

function statusLabel(status: ManagedRequest["status"]): string {
  if (status === "approved") return "Schváleno managerem";
  if (status === "rejected") return "Zamítnuto managerem";
  return "Čeká na rozhodnutí";
}

export function RequestApprovalPanel() {
  const [requests, setRequests] = useState<readonly ManagedRequest[]>([]);
  const [canDecide, setCanDecide] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch("/api/requests", { cache: "no-store" });
      const body = (await response.json()) as RequestsResponse;
      if (!response.ok || !body.ok || !body.requests) {
        throw new Error(body.rejected?.message ?? "Požadavky se nepodařilo načíst.");
      }
      setRequests(body.requests);
      setCanDecide(body.canDecide === true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Požadavky se nepodařilo načíst.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void fetch("/api/requests", { cache: "no-store" })
      .then(async (response) => ({ response, body: (await response.json()) as RequestsResponse }))
      .then(({ response, body }) => {
        if (!active) return;
        if (!response.ok || !body.ok || !body.requests) {
          throw new Error(body.rejected?.message ?? "Požadavky se nepodařilo načíst.");
        }
        setRequests(body.requests);
        setCanDecide(body.canDecide === true);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(error instanceof Error ? error.message : "Požadavky se nepodařilo načíst.");
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function decide(requestId: string, decision: "approved" | "rejected") {
    setPendingId(requestId);
    setMessage(null);
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, decision }),
      });
      const body = (await response.json()) as RequestsResponse;
      if (!response.ok || !body.ok) {
        throw new Error(body.rejected?.message ?? "Rozhodnutí se nepodařilo uložit.");
      }
      await loadRequests();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Rozhodnutí se nepodařilo uložit.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="page-head__lead">
          <div>
            <h1 className="page-head__title">Požadavky zaměstnanců</h1>
            <p className="page-head__sub">Manager rozhoduje ručně; dopad na směny se zobrazí před rozhodnutím.</p>
          </div>
        </div>
        <div className="page-head__actions"><span className="badge badge--warning">SIMULATED</span></div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ margin: 0 }}>
          Jde o syntetické ukázkové požadavky pro týden 5.–11. 10. 2026. Schválení
          ani zamítnutí samo o sobě nemění nebo nepotvrzuje rozpis.
        </p>
      </div>

      {message ? <div className="alert alert--danger" role="alert">{message}</div> : null}
      {isLoading ? <div className="card" aria-live="polite">Načítám požadavky…</div> : null}
      {!isLoading && requests.length === 0 ? <div className="card">Nejsou k dispozici žádné ukázkové požadavky.</div> : null}

      <div className="stack" style={{ gap: 16 }}>
        {requests.map((request) => (
          <article className="card" key={request.id}>
            <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{request.summary}</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>{request.employeeLabel} · {formatDate(request.date)}</p>
              </div>
              <span className={`badge ${request.status === "pending" ? "badge--warning" : request.status === "approved" ? "badge--success" : "badge--danger"}`}>
                {statusLabel(request.status)}
              </span>
            </div>

            <div style={{ marginTop: 16 }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>Dopad při přijetí požadavku</h3>
              {request.preview.impacts.length === 0 ? (
                <p className="muted">V ukázkovém plánu není přiřazení, jehož dopad lze spočítat.</p>
              ) : (
                <div className="table-wrap">
                  <table className="staffing-settings-table">
                    <thead><tr><th>Směna</th><th>Obsazení nyní</th><th>Po přijetí</th><th>Minimum</th><th>Chybí</th></tr></thead>
                    <tbody>
                      {request.preview.impacts.map((impact) => (
                        <tr key={`${impact.date}|${impact.shiftKind}`}>
                          <td>{shiftLabel(impact.shiftKind)} · {formatDate(impact.date)}</td>
                          <td>{impact.currentAssignedEmployees}</td>
                          <td>{impact.assignedAfterRequest}</td>
                          <td>{impact.requiredEmployees}</td>
                          <td>{impact.missingEmployees}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {request.preview.impacts.some((impact) => impact.suggestedCandidates.length > 0) ? (
                <p className="muted" style={{ marginBottom: 0 }}>
                  Dostupní syntetičtí kandidáti k posouzení: {request.preview.impacts.flatMap((impact) => impact.suggestedCandidates).map((id) => `zaměstnanec ${id}`).join(", ")}.
                  Jde o návrh pro kontrolu managerem; směna se nepřidá automaticky.
                </p>
              ) : null}
            </div>

            {canDecide && request.status === "pending" ? (
              <div className="row" style={{ marginTop: 16, gap: 8 }}>
                <button type="button" className="btn btn--primary" disabled={pendingId !== null} onClick={() => void decide(request.id, "approved")}>
                  {pendingId === request.id ? "Ukládám…" : "Schválit požadavek"}
                </button>
                <button type="button" className="btn btn--ghost" disabled={pendingId !== null} onClick={() => void decide(request.id, "rejected")}>
                  Zamítnout
                </button>
              </div>
            ) : null}
            {!canDecide ? <p className="muted" style={{ margin: "12px 0 0" }}>Pouze manager může požadavek schválit nebo zamítnout.</p> : null}
          </article>
        ))}
      </div>
    </>
  );
}
