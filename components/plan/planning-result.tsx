"use client";

import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import type {
  PlanningRunView,
  PlanningFailureView,
} from "@/lib/planning/view-model";

function toneClass(tone: string): "info" | "warning" | "danger" | "success" | "neutral" {
  switch (tone) {
    case "info":
      return "info";
    case "warning":
      return "warning";
    case "danger":
      return "danger";
    case "success":
      return "success";
    default:
      return "neutral";
  }
}

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d}.${m}.`;
}

function shiftLabel(kind: string, isWeekend: boolean): string {
  if (kind === "morning") return isWeekend ? "7:45–16:30" : "7:45–16:30";
  if (kind === "afternoon") return isWeekend ? "12:45–21:00" : "13:15–21:00";
  return kind;
}

function isWeekendDate(dateStr: string): boolean {
  const [y, m, d] = dateStr.split("-").map(Number);
  const day = new Date(y, m - 1, d).getDay();
  return day === 0 || day === 6;
}

export interface PlanningResultProps {
  view: PlanningRunView | null;
  failure: PlanningFailureView | null;
  onConfirm: (proposalId: string) => Promise<void>;
  onRun: (scenarioId: string) => Promise<void>;
  scenarios: readonly { id: string; label: string; description: string }[];
  selectedScenario: string;
  setSelectedScenario: (id: string) => void;
  isLoading: boolean;
  runtimeNotice: string;
  providerMode: "simulated" | "gemini";
}

export function PlanningResult({
  view,
  failure,
  onConfirm,
  onRun,
  scenarios,
  selectedScenario,
  setSelectedScenario,
  isLoading,
  runtimeNotice,
  providerMode,
}: PlanningResultProps) {
  if (!view && !failure) {
    return (
      <section className="planning-result" aria-label="Výsledek plánování">
        <div className="card">
          <div className="card__body empty">
            <div className="empty__icon" aria-hidden="true">
              <Icon name="sparkles" width={24} height={24} />
            </div>
            <h3 className="empty__title">Plánovací asistent</h3>
            <p className="empty__desc">
              Vyberte scénář a spusťte výpočet. Výsledek se zobrazí zde nad
              tabulkou ukázkových dat.
            </p>
          </div>
        </div>
        <div className="planning-result__controls card card--pad">
          <div className="stack-sm">
            <label className="select" htmlFor="scenario-select">
              <span className="sr-only">Vyberte simulovaný scénář</span>
              <select
                id="scenario-select"
                value={selectedScenario}
                onChange={(e) => setSelectedScenario(e.target.value)}
                disabled={isLoading}
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="select__chevron" aria-hidden="true">
                <Icon name="chevronDown" width={15} height={15} />
              </span>
            </label>
            <p className="small muted">
              {scenarios.find((s) => s.id === selectedScenario)?.description}
            </p>
            <div className="row" style={{ gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => onRun(selectedScenario)}
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Provádím výpočet…
                  </>
                ) : (
                  <>
                    <Icon name="sparkles" width={17} height={17} />
                    Spustit výpočet
                  </>
                )}
              </button>
              <Badge variant="warning" dot={false}>
                {providerMode === "simulated" ? "SIMULATED" : "GEMINI (NOT VERIFIED)"}
              </Badge>
            </div>
            <p className="small muted">{runtimeNotice}</p>
          </div>
        </div>
      </section>
    );
  }

  if (failure) {
    return (
      <section className="planning-result" aria-label="Chyba plánování">
        <div className="card card--alert">
          <div className="card__body">
            <Alert variant="warning">
              <strong>{failure.title}</strong>
              <p style={{ marginTop: "8px" }}>{failure.message}</p>
              {failure.details && (
                <details style={{ marginTop: "12px" }}>
                  <summary className="small muted">Technické detaily</summary>
                  <pre className="mono small" style={{ marginTop: "8px" }}>
                    {JSON.stringify(failure.details, null, 2)}
                  </pre>
                </details>
              )}
            </Alert>
            <div className="row" style={{ marginTop: "12px", gap: "10px" }}>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => onRun(selectedScenario)}
                disabled={isLoading}
              >
                Zkusit znovu
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const v = view!;

  return (
    <section className="planning-result" aria-label="Výsledek plánování">
      <div className="card">
        <div className="card__head card__head--split">
          <div>
            <div className="row" style={{ gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <h2 className="card__title" style={{ margin: 0 }}>
                Návrh rozpisu: {v.scenarioLabel}
              </h2>
              <Badge variant={toneClass(v.statusTone)} dot={true}>
                {v.statusLabel}
              </Badge>
              <Badge variant={toneClass(v.completenessTone)} dot={true}>
                {v.completenessLabel}
              </Badge>
              <Badge variant="warning" dot={false}>
                {providerMode === "simulated" ? "SIMULATED" : "GEMINI (NOT VERIFIED)"}
              </Badge>
            </div>
            <p className="card__sub" style={{ marginTop: "6px" }}>
              Týden {formatDate(v.weekStart)} –
              {(() => {
                const [y, m, d] = v.weekStart.split("-").map(Number);
                const end = new Date(y, m - 1, d + 6);
                return `${end.getDate()}.${end.getMonth() + 1}.${end.getFullYear()}`;
              })()} · Poskytovatel: {v.providerName} · ID: {v.proposalId.slice(0, 12)}…
            </p>
          </div>
          <div className="row" style={{ gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => onConfirm(v.proposalId)}
              disabled={!v.confirmation.allowed || v.confirmation.alreadyConfirmed || isLoading}
              aria-disabled={!v.confirmation.allowed || v.confirmation.alreadyConfirmed || isLoading}
              aria-busy={isLoading}
            >
              {v.confirmation.alreadyConfirmed ? (
                <>
                  <Icon name="checkCircle" width={17} height={17} />
                  Potvrzeno
                </>
              ) : v.confirmation.allowed ? (
                <>
                  <Icon name="checkCircle" width={17} height={17} />
                  Potvrdit návrh
                </>
              ) : (
                <>
                  <Icon name="lock" width={17} height={17} />
                  Potvrzení blokováno
                </>
              )}
            </button>
            {v.confirmation.alreadyConfirmed && (
              <Badge variant="success" dot={false}>
                Potvrzeno {new Date(v.confirmation.confirmedPlan!.confirmedAt).toLocaleString("cs-CZ")}
              </Badge>
            )}
          </div>
        </div>

        <div className="card__body">
          {v.confirmation.blockers.length > 0 && (
            <div className="stack-sm" style={{ marginBottom: "16px" }}>
              {v.confirmation.blockers.map((blocker, idx) => (
                <Alert key={idx} variant="warning">
                  <strong>Důvod blokování:</strong> {blocker.message}
                </Alert>
              ))}
            </div>
          )}

          <div className="stack-lg" style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
              Pokrytí směn
            </h3>
            <div className="table-wrap">
              <table className="roster" style={{ minWidth: "600px" }}>
                <thead>
                  <tr>
                    <th scope="col" style={{ textAlign: "left", width: "140px" }}>Den</th>
                    <th scope="col">Ranní směna</th>
                    <th scope="col">Odpolední směna</th>
                    <th scope="col" style={{ width: "100px" }}>Stav</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const byDate = new Map<string, { date: string; shiftKind: string; requiredEmployees: number; assignedEmployees: number; missingEmployees: number }[]>();
                    for (const line of v.coverage) {
                      const arr = byDate.get(line.date) ?? [];
                      arr.push(line);
                      byDate.set(line.date, arr);
                    }
                    return Array.from(byDate.entries()).map(([date, lines]) => {
                      const morning = lines.find((l) => l.shiftKind === "morning");
                      const afternoon = lines.find((l) => l.shiftKind === "afternoon");
                      const isWeekend = isWeekendDate(date);
                      const missing = (morning?.missingEmployees ?? 0) + (afternoon?.missingEmployees ?? 0);
                      return (
                        <tr key={date}>
                          <td style={{ textAlign: "left", fontWeight: 600 }}>
                            {new Date(date + "T00:00:00").toLocaleDateString("cs-CZ", { weekday: "short", day: "numeric", month: "numeric" })}
                            {isWeekend && (
                              <span className="badge badge--neutral" style={{ marginLeft: "6px", fontSize: "10px" }}>Víkend</span>
                            )}
                          </td>
                          <td>
                            {morning ? (
                              <>
                                <span className="badge badge--info" style={{ fontSize: "11px" }}>
                                  {morning.assignedEmployees}/{morning.requiredEmployees}
                                </span>
                                {morning.missingEmployees > 0 && (
                                  <span className="badge badge--danger" style={{ marginLeft: "6px", fontSize: "10px" }}>
                                    Chybí {morning.missingEmployees}
                                  </span>
                                )}
                                {morning.assignedEmployees > morning.requiredEmployees && (
                                  <span className="badge badge--warning" style={{ marginLeft: "6px", fontSize: "10px" }}>
                                    Přebytek {morning.assignedEmployees - morning.requiredEmployees}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            {afternoon ? (
                              <>
                                <span className="badge badge--info" style={{ fontSize: "11px" }}>
                                  {afternoon.assignedEmployees}/{afternoon.requiredEmployees}
                                </span>
                                {afternoon.missingEmployees > 0 && (
                                  <span className="badge badge--danger" style={{ marginLeft: "6px", fontSize: "10px" }}>
                                    Chybí {afternoon.missingEmployees}
                                  </span>
                                )}
                                {afternoon.assignedEmployees > afternoon.requiredEmployees && (
                                  <span className="badge badge--warning" style={{ marginLeft: "6px", fontSize: "10px" }}>
                                    Přebytek {afternoon.assignedEmployees - afternoon.requiredEmployees}
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                          <td>
                            {missing === 0 ? (
                              <Badge variant="success" dot={true}>OK</Badge>
                            ) : (
                              <Badge variant="danger" dot={true}>Chybí {missing}</Badge>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
            <div className="defs" style={{ marginTop: "12px", fontSize: "12.5px" }}>
              <div className="def">
                <span className="def__label">Celkem požadováno</span>
                <span className="def__value">{v.coverageSummary.required}</span>
              </div>
              <div className="def">
                <span className="def__label">Obsazeno</span>
                <span className="def__value">{v.coverageSummary.assigned}</span>
              </div>
              <div className="def">
                <span className="def__label">Chybějících přiřazení</span>
                <span className="def__value" style={{ color: v.coverageSummary.missing > 0 ? "var(--red)" : "var(--green)" }}>{v.coverageSummary.missing}</span>
              </div>
              <div className="def">
                <span className="def__label">Podobsazených slotů</span>
                <span className="def__value">{v.coverageSummary.understaffedSlots}</span>
              </div>
              <div className="def">
                <span className="def__label">Přeobsazených slotů</span>
                <span className="def__value">{v.coverageSummary.overstaffedSlots}</span>
              </div>
            </div>
          </div>

          <div className="stack-lg" style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
              Změny oproti stávajícímu rozpisu
            </h3>
            {v.changes.length === 0 ? (
              <p className="muted small">Žádné změny — návrh shoduje se se stávajícím rozpisem.</p>
            ) : (
              <>
                <div className="defs" style={{ marginBottom: "12px" }}>
                  <div className="def">
                    <span className="def__label">Přidáno</span>
                    <span className="def__value" style={{ color: "var(--green)" }}>{v.changesSummary.added}</span>
                  </div>
                  <div className="def">
                    <span className="def__label">Odebráno</span>
                    <span className="def__value" style={{ color: "var(--red)" }}>{v.changesSummary.removed}</span>
                  </div>
                  <div className="def">
                    <span className="def__label">Beze změny</span>
                    <span className="def__value">{v.changesSummary.unchanged}</span>
                  </div>
                </div>
                <div className="table-wrap" style={{ maxHeight: "280px", overflow: "auto" }}>
                  <table className="roster" style={{ minWidth: "700px" }}>
                    <thead>
                      <tr>
                        <th scope="col" style={{ textAlign: "left", width: "180px" }}>Zaměstnanec</th>
                        <th scope="col" style={{ width: "110px" }}>Datum</th>
                        <th scope="col" style={{ width: "110px" }}>Směna</th>
                        <th scope="col" style={{ width: "120px" }}>Typ změny</th>
                      </tr>
                    </thead>
                    <tbody>
                      {v.changes.map((change, idx) => (
                        <tr key={idx} style={{ background: change.type === "added" ? "var(--green-soft)" : change.type === "removed" ? "var(--red-soft)" : "transparent" }}>
                          <td style={{ textAlign: "left" }}>
                            {v.employees.find((e) => e.id === change.assignment.employeeId)?.displayName ?? change.assignment.employeeId}
                          </td>
                          <td>{formatDate(change.assignment.date)}</td>
                          <td>
                            <span className="badge badge--info" style={{ fontSize: "11px" }}>
                              {shiftLabel(change.assignment.shiftKind, isWeekendDate(change.assignment.date))}
                            </span>
                          </td>
                          <td>
                            {change.type === "added" && <Badge variant="success" dot={true}>Přidáno</Badge>}
                            {change.type === "removed" && <Badge variant="danger" dot={true}>Odebráno</Badge>}
                            {change.type === "unchanged" && <Badge variant="neutral" dot={true}>Beze změny</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="stack-lg" style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
              Vysvětlení a předpoklady
            </h3>
            {v.proposal.explanations.length === 0 ? (
              <p className="muted small">AI nepřidala žádná vysvětlení.</p>
            ) : (
              <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {v.proposal.explanations.map((exp, idx) => (
                  <li key={idx} className="small" style={{ color: "var(--ink-2)" }}>
                    <strong style={{ color: "var(--accent)", textTransform: "capitalize" }}>{exp.topic}:</strong>{" "}
                    {exp.text}
                    {exp.employeeIds && exp.employeeIds.length > 0 && (
                      <span className="muted" style={{ marginLeft: "8px" }}>
                        ({exp.employeeIds.join(", ")})
                      </span>
                    )}
                    {exp.dates && exp.dates.length > 0 && (
                      <span className="muted" style={{ marginLeft: "8px" }}>
                        [{exp.dates.map(formatDate).join(", ")}]
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {v.proposal.assumptions.length > 0 && (
              <details style={{ marginTop: "12px" }}>
                <summary className="small muted" style={{ cursor: "pointer" }}>
                  Předpoklady AI ({v.proposal.assumptions.length})
                </summary>
                <ul style={{ margin: "8px 0 0 20px", padding: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
                  {v.proposal.assumptions.map((a, idx) => (
                    <li key={idx} className="small muted">• {a}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {v.proposal.alternatives.length > 0 && (
            <div className="stack-lg" style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 600, marginBottom: "8px" }}>
                Alternativy
              </h3>
              {v.proposal.alternatives.map((alt, idx) => (
                <div key={idx} className="card card--pad" style={{ marginBottom: "12px" }}>
                  <div className="row" style={{ justifyContent: "space-between", marginBottom: "8px" }}>
                    <strong>{alt.summary}</strong>
                    <Badge variant="info" dot={false}>{alt.id}</Badge>
                  </div>
                  <p className="small" style={{ color: "var(--ink-2)", marginBottom: "8px" }}>{alt.impact}</p>
                  {alt.tradeOffs && alt.tradeOffs.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {alt.tradeOffs.map((t, ti) => (
                        <li key={ti} className="small muted">• {t}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          <details className="card card--pad" style={{ marginTop: "8px" }}>
            <summary className="small muted" style={{ cursor: "pointer", fontWeight: 600 }}>
              Validace a technické detaily
            </summary>
            <div className="stack-sm" style={{ marginTop: "12px", fontSize: "12.5px" }}>
              <div className="def">
                <span className="def__label">Stav validace</span>
                <span className="def__value">
                  {v.validation.status === "valid" && <Badge variant="success" dot={true}>Validní</Badge>}
                  {v.validation.status === "invalid" && <Badge variant="danger" dot={true}>Nevalidní</Badge>}
                  {v.validation.status === "not_verified" && <Badge variant="warning" dot={true}>Neověřeno</Badge>}
                </span>
              </div>
              <div className="def">
                <span className="def__label">Nalezené problémy</span>
                <span className="def__value">{v.validation.problems.length}</span>
              </div>
              <div className="def">
                <span className="def__label">Neověřené kontroly</span>
                <span className="def__value">{v.validation.unverifiedChecks.length}</span>
              </div>
              <div className="def">
                <span className="def__label">Zkontrolovaná pravidla</span>
                <span className="def__value">{v.validation.checkedRuleIds.join(", ") || "žádná"}</span>
              </div>
              {v.validation.problems.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <strong className="small">Problémy:</strong>
                  <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                    {v.validation.problems.map((p, idx) => (
                      <li key={idx} className="small" style={{ color: "var(--red)" }}>
                        [{p.code}] {p.message}
                        {p.employeeId && <span className="muted"> ({p.employeeId})</span>}
                        {p.date && <span className="muted"> {p.date}</span>}
                        {p.shiftKind && <span className="muted"> {p.shiftKind}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {v.validation.unverifiedChecks.length > 0 && (
                <div style={{ marginTop: "8px" }}>
                  <strong className="small">Neověřené kontroly:</strong>
                  <ul style={{ margin: "4px 0 0 20px", padding: 0 }}>
                    {v.validation.unverifiedChecks.map((c, idx) => (
                      <li key={idx} className="small muted">
                        [{c.code}] {c.message}
                        {c.employeeId && <span className="muted"> ({c.employeeId})</span>}
                        {c.date && <span className="muted"> {c.date}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </details>
        </div>
      </div>

      <div className="planning-result__controls card card--pad" style={{ marginTop: "12px" }}>
        <div className="row" style={{ gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          <label className="select" htmlFor="scenario-select-2">
            <span className="sr-only">Změnit scénář</span>
            <select
              id="scenario-select-2"
              value={selectedScenario}
              onChange={(e) => setSelectedScenario(e.target.value)}
              disabled={isLoading}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <span className="select__chevron" aria-hidden="true">
              <Icon name="chevronDown" width={15} height={15} />
            </span>
          </label>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onRun(selectedScenario)}
            disabled={isLoading}
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                Provádím výpočet…
              </>
            ) : (
              <>
                <Icon name="chevronRight" width={17} height={17} />
                Spustit znovu
              </>
            )}
          </button>
          <Badge variant="warning" dot={false}>
            {providerMode === "simulated" ? "SIMULATED" : "GEMINI (NOT VERIFIED)"}
          </Badge>
        </div>
        <p className="small muted" style={{ marginTop: "8px" }}>{runtimeNotice}</p>
      </div>
    </section>
  );
}