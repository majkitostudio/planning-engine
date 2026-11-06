"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";

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

      <div className="card card--pad card--spaced">
        <p className="muted">
          Jde o syntetické ukázkové požadavky pro týden 5.–11. 10. 2026. Schválení
          ani zamítnutí samo o sobě nemění nebo nepotvrzuje rozpis.
        </p>
      </div>

      {message ? <div className="alert alert--danger" role="alert">{message}</div> : null}
      {isLoading ? <div className="card card--pad" aria-live="polite" aria-busy="true"><ul className="skeleton-list">{Array.from({ length: 3 }).map((_, i) => <li key={i} className="skeleton skeleton--request" />)}</ul></div> : null}
      {!isLoading && requests.length === 0 && !message ? <section className="card card--pad"><EmptyState icon="checkCircle" title="Žádné čekající požadavky" description="Momentálně není potřeba rozhodnout o žádném ukázkovém požadavku." /></section> : null}

      <div className="stack-lg">
        {requests.map((request) => (
          <article className="card card--pad" key={request.id}>
            <div className="row row--between">
              <div>
                <h2 className="request-card__title">{request.summary}</h2>
                <p className="muted request-card__meta">{request.employeeLabel} · {formatDate(request.date)}</p>
              </div>
              <span className={`badge ${request.status === "pending" ? "badge--warning" : request.status === "approved" ? "badge--success" : "badge--danger"}`}>
                {statusLabel(request.status)}
              </span>
            </div>

            <div className="request-card__impact">
              <h3 className="request-card__impact-title">Dopad při přijetí požadavku</h3>
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
                <p className="muted request-card__note">
                  Dostupní syntetičtí kandidáti k posouzení: {request.preview.impacts.flatMap((impact) => impact.suggestedCandidates).map((id) => `zaměstnanec ${id}`).join(", ")}.
                  Jde o návrh pro kontrolu managerem; směna se nepřidá automaticky.
                </p>
              ) : null}
            </div>

            {canDecide && request.status === "pending" ? (
              <div className="row request-card__actions">
                <button type="button" className="btn btn--primary" disabled={pendingId !== null} onClick={() => void decide(request.id, "approved")}>
                  {pendingId === request.id ? "Ukládám…" : "Schválit požadavek"}
                </button>
                <button type="button" className="btn btn--ghost" disabled={pendingId !== null} onClick={() => void decide(request.id, "rejected")}>
                  Zamítnout
                </button>
              </div>
            ) : null}
            {!canDecide ? <p className="muted request-card__note request-card__note--after">Pouze manager může požadavek schválit nebo zamítnout.</p> : null}
          </article>
        ))}
      </div>
    </>
  );
}
