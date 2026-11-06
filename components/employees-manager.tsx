"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";

type Employee = { id: string; displayName: string; active: boolean; employmentType: "full_time" | "part_time" };

export function EmployeesManager({ canManage }: { canManage: boolean }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [name, setName] = useState("");
  const [employmentType, setEmploymentType] = useState<"full_time" | "part_time">("full_time");
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
      const response = await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: name, employmentType }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message || "Zaměstnance se nepodařilo přidat."); return; }
       setEmployees((current) => [...current, { ...result.employee, active: true }]); setName(""); setEmploymentType("full_time");
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

  async function changeEmploymentType(id: string, value: "full_time" | "part_time") {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/employees", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, employmentType: value }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message || "Úvazek se nepodařilo změnit."); return; }
      setEmployees((current) => current.map((employee) => employee.id === id ? { ...employee, employmentType: value } : employee));
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }

  return <div className="page-stack employees-page">
    <header className="page-head">
      <div className="page-head__lead">
        <span className="page-head__icon" aria-hidden="true"><Icon name="users" width={20} height={20} /></span>
        <div>
          <h1 className="page-head__title">Zaměstnanci</h1>
          <p className="page-head__sub">Spravujte seznam zaměstnanců pro plánování směn. Odebrání nemění již uložené rozpisy.</p>
        </div>
      </div>
    </header>
    <section className="card employees-card" aria-labelledby="employees-list-title">
      {canManage ? <form className="employees-form" onSubmit={(event) => void add(event)}>
        <label className="field"><span className="field__label">Jméno zaměstnance</span><input className="input" value={name} maxLength={200} onChange={(event) => setName(event.target.value)} autoComplete="off" /></label>
        <label className="field"><span className="field__label">Úvazek</span><select className="input" value={employmentType} onChange={(event) => setEmploymentType(event.target.value as "full_time" | "part_time")}><option value="full_time">Plný úvazek</option><option value="part_time">Poloviční úvazek</option></select></label>
        <button className="btn btn--primary" disabled={busy || loading || !name.trim()} type="submit">Přidat zaměstnance</button>
      </form> : <p className="employees-readonly-note">Seznam může upravovat pouze manažer.</p>}
      {error ? <p className="alert alert--danger" role="alert">{error}</p> : null}
      <div className="employees-list-head"><h2 id="employees-list-title" className="card__title">Seznam zaměstnanců</h2>{!loading && !error ? <span className="badge">{employees.filter((employee) => employee.active).length} aktivních</span> : null}</div>
      {loading ? <ul className="skeleton-list employees-skeleton" aria-busy="true" aria-label="Načítám zaměstnance">{Array.from({ length: 5 }).map((_, i) => <li key={i} className="skeleton" />)}</ul> : employees.length ? <ul className="employees-list">{employees.map((employee) => <li className="employees-list__item" key={employee.id}>
        <span className="employees-list__avatar" aria-hidden="true">{employee.displayName.trim().slice(0, 1).toLocaleUpperCase("cs-CZ")}</span>
        <span className="employees-list__name">{employee.displayName}{!employee.active ? <span className="employees-list__inactive">Odebrán ze seznamu</span> : null}</span>
        {canManage ? <label className="employees-list__contract"><span className="sr-only">Úvazek {employee.displayName}</span><select className="input" value={employee.employmentType} disabled={busy} onChange={(event) => void changeEmploymentType(employee.id, event.target.value as "full_time" | "part_time")}><option value="full_time">Plný úvazek</option><option value="part_time">Poloviční úvazek</option></select></label> : <span className="badge">{employee.employmentType === "part_time" ? "Poloviční úvazek" : "Plný úvazek"}</span>}
        {canManage ? <button className="btn btn--secondary btn--sm employees-list__action" type="button" disabled={busy} onClick={() => void changeStatus(employee.id, !employee.active)} aria-label={`${employee.active ? "Odebrat" : "Znovu zařadit"} ${employee.displayName}`}>{employee.active ? "Odebrat" : "Znovu zařadit"}</button> : null}
      </li>)}</ul> : !error ? <div className="employees-empty"><EmptyState icon="users" title="Zatím tu nejsou žádní zaměstnanci" description="Přidejte zaměstnance pomocí formuláře výše. Jejich jména se použijí v měsíčním návrhu rozpisu." /></div> : null}
    </section>
  </div>;
}
