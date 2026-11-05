"use client";

import { useEffect, useState } from "react";
import type { MonthlyRunSummary } from "@/lib/planning/monthly-store";
import { SkeletonList } from "@/components/ui/skeleton";

export function MonthlyRunsList({ runs, canManage, busy, onRemove }: { runs: readonly MonthlyRunSummary[]; canManage: boolean; busy: boolean; onRemove: (run: MonthlyRunSummary) => void }) {
  if (!runs.length) return <p>Pro tento měsíc zatím nejsou uložené rozpisy.</p>;
  return <div className="table-wrap"><table className="staffing-settings-table">
    <thead><tr><th scope="col">Vytvořeno</th><th scope="col">Stav</th>{canManage ? <th scope="col">Akce</th> : null}</tr></thead>
    <tbody>{runs.map((run) => <tr key={run.id}>
      <td>{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "medium" }).format(new Date(run.createdAt))} · {run.id.slice(-6)}</td>
      <td>{run.confirmed ? "Potvrzený" : "Návrh"}</td>
      {canManage ? <td><button type="button" className="btn btn--secondary" disabled={busy} aria-label={`Odstranit ${run.confirmed ? "potvrzený rozpis" : "návrh"} vytvořený ${new Intl.DateTimeFormat("cs-CZ", { dateStyle: "short", timeStyle: "medium" }).format(new Date(run.createdAt))}, ${run.id.slice(-6)}`} onClick={() => onRemove(run)}>Odstranit</button></td> : null}
    </tr>)}</tbody>
  </table></div>;
}

export function MonthlyRunsManager({ month, canManage, refreshKey, onRemoved }: { month: string; canManage: boolean; refreshKey: string; onRemoved: (id: string) => void }) {
  const [runs, setRuns] = useState<MonthlyRunSummary[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/planning/monthly/manage?month=${encodeURIComponent(month)}`, { signal: controller.signal })
      .then(async (response) => { const data = await response.json(); if (!response.ok || !data.ok) throw new Error(); return data.runs as MonthlyRunSummary[]; })
      .then((data) => { if (!controller.signal.aborted) { setRuns(data); setError(""); } })
      .catch(() => { if (!controller.signal.aborted) setError("Uložené rozpisy se nepodařilo načíst."); });
    return () => controller.abort();
  }, [month, refreshKey]);

  async function remove(run: MonthlyRunSummary) {
    const message = run.confirmed
      ? "Odstranit potvrzený rozpis? Pro tento měsíc pak můžete vytvořit nový. Návazné kontroly mohou do potvrzení nového rozpisu postrádat podklady."
      : "Odstranit tento návrh rozpisu?";
    if (!window.confirm(message)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/planning/monthly/manage", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: run.id, confirmed: run.confirmed }) });
      if (!response.ok) { setError(response.status === 409 ? "Stav rozpisu se změnil. Načtěte stránku znovu a zkontrolujte jej." : "Rozpis se nepodařilo odstranit."); return; }
      try { const key = `planning-monthly-draft:${month}`; if (localStorage.getItem(key) === run.id) localStorage.removeItem(key); } catch { /* Serverový rozpis je již odstraněn. */ }
      setRuns((current) => current?.filter((item) => item.id !== run.id) ?? null);
      onRemoved(run.id);
    } catch { setError("Rozpis se nepodařilo odstranit kvůli chybě spojení."); } finally { setBusy(false); }
  }

  return <details><summary>Správa rozpisů pro tento měsíc</summary>
    {error ? <p role="alert">{error}</p> : null}
    {runs ? <MonthlyRunsList runs={runs} canManage={canManage} busy={busy} onRemove={(run) => void remove(run)} /> : !error ? <SkeletonList count={2} height={48} /> : null}
  </details>;
}
