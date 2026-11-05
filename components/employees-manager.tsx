"use client";

import { useEffect, useState, type FormEvent } from "react";

type Employee = { id: string; displayName: string; active: boolean };

export function EmployeesManager({ canManage }: { canManage: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(canManage ? "/api/employees?all=1" : "/api/employees").then(async (response) => {
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message || "Seznam se nepodařilo načíst.");
      if (!cancelled) setEmployees(result.employees);
    }).catch((reason: unknown) => { if (!cancelled) setError(reason instanceof Error ? reason.message : "Spojení se serverem selhalo."); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [canManage]);

  async function add(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message || "Zaměstnance se nepodařilo přidat."); return; }
      setEmployees((current) => [...current, { ...result.employee, active: true }]); setName("");
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }

  async function changeStatus(id: string, active: boolean) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/employees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, active }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message || "Zaměstnance se nepodařilo odebrat."); return; }
      setEmployees((current) => current.map((employee) => employee.id === id ? { ...employee, active } : employee));
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }

  return <section className="card"><h1>Zaměstnanci</h1>
    <p>Zde spravujete seznam pro plánování směn. Odebrání nemění již uložené rozpisy.</p>
    {canManage ? <form onSubmit={(event) => void add(event)}><label>Jméno zaměstnance <input className="input" value={name} maxLength={200} onChange={(event) => setName(event.target.value)} /></label>{" "}<button className="btn btn--primary" disabled={busy || loading} type="submit">Přidat zaměstnance</button></form> : <p>Seznam může upravovat pouze manažer.</p>}
    {error ? <p role="alert">{error}</p> : null}
    {loading ? <ul className="skeleton-list" aria-busy="true" aria-label="Načítám zaměstnance">{Array.from({ length: 5 }).map((_, i) => <li key={i} className="skeleton" style={{ height: 28 }} />)}</ul> : employees.length ? <ul>{employees.map((employee) => <li key={employee.id}>{employee.displayName}{!employee.active ? " · odebrán ze seznamu" : ""}{canManage ? <> <button className="btn btn--secondary" type="button" disabled={busy} onClick={() => void changeStatus(employee.id, !employee.active)} aria-label={`${employee.active ? "Odebrat" : "Znovu zařadit"} ${employee.displayName}`}>{employee.active ? "Odebrat" : "Znovu zařadit"}</button></> : null}</li>)}</ul> : !error ? <p>Seznam zaměstnanců je zatím prázdný.</p> : null}
  </section>;
}
