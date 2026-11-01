"use client";

import { useState, type FormEvent } from "react";
import { buildMonthlyFormInput, staffingFormValues, type MonthlyFormData } from "@/lib/planning/monthly-form";
import type { StaffingSetting } from "@/lib/planning/staffing-settings";
import type { MonthlyPlanningInput, MonthlyAvailability } from "@/lib/planning/domain/month-input";
import type { Absence, ShiftKind } from "@/lib/planning/domain/types";
import type { MonthlyPlanDraft } from "@/lib/planning/monthly-planning";
import type { MonthlyValidation } from "@/lib/planning/domain/month-validation";
import { addDays } from "@/lib/planning/domain/time";

export interface MonthlyView {
  readonly id: string;
  readonly mode: "simulated" | "gemini";
  readonly input: MonthlyPlanningInput;
  readonly draft: MonthlyPlanDraft;
  readonly validation: MonthlyValidation;
  readonly confirmed?: boolean;
}

const DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];

export function MonthlyPlanningPanel({ month, canManage, simulated, initialStaffing, onResult }: { month: string; canManage: boolean; simulated: boolean; initialStaffing: readonly StaffingSetting[] | null; onResult: (result: MonthlyView | null) => void }) {
  const [employees, setEmployees] = useState<MonthlyFormData["employees"]>([]);
  const [name, setName] = useState("");
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [availability, setAvailability] = useState<MonthlyAvailability[]>([]);
  const [staffing, setStaffing] = useState<string[]>(() => staffingFormValues(initialStaffing));
  const [instructions, setInstructions] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [shift, setShift] = useState<ShiftKind>("morning");
  const [available, setAvailable] = useState(false);
  const [scenario, setScenario] = useState("complete");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<MonthlyView | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function addEmployee() {
    if (!name.trim()) { setError("Vyplňte jméno zaměstnance."); return; }
    const id = crypto.randomUUID();
    setEmployees((current) => [...current, { id, name: name.trim(), availableAllMonth: false }]);
    setEmployeeId((current) => current || id);
    setName(""); setError("");
  }
  async function loadEmployeeList() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/employees");
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message ?? "Seznam zaměstnanců se nepodařilo načíst."); return; }
      const incoming = result.employees as { id: string; displayName: string }[];
      if (!incoming.length) { setError("Seznam zaměstnanců je prázdný. Přidejte je nejprve ve správě zaměstnanců."); return; }
      setEmployees((current) => [...current, ...incoming.filter((employee) => !current.some((item) => item.id === employee.id)).map((employee) => ({ id: employee.id, name: employee.displayName, availableAllMonth: false }))]);
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }
  async function loadPreviousEmployees() {
    setBusy(true); setError("");
    try {
      const previous = addDays(`${month}-01`, -1).slice(0, 7);
      const response = await fetch(`/api/planning/monthly?month=${encodeURIComponent(previous)}`);
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message ?? "Předchozí rozpis se nepodařilo načíst."); return; }
      if (!result.view) { setError("Pro předchozí měsíc není potvrzený měsíční rozpis."); return; }
      const incoming = result.view.input.employees as MonthlyPlanningInput["employees"];
      setEmployees((current) => [...current, ...incoming.filter((employee) => !current.some((item) => item.id === employee.id)).map((employee) => ({ id: employee.id, name: employee.displayName, availableAllMonth: false }))]);
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }
  async function loadWeeklyEmployees() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/planning/monthly?month=${encodeURIComponent(month)}&employees=previous-week`);
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message ?? "Zaměstnance se nepodařilo načíst."); return; }
      const incoming = result.employees as Pick<MonthlyPlanningInput["employees"][number], "id" | "displayName">[];
      if (!incoming.length) { setError("Před začátkem měsíce není dostupný potvrzený týdenní rozpis."); return; }
      setEmployees((current) => [...current, ...incoming.filter((employee) => !current.some((item) => item.id === employee.id)).map((employee) => ({ id: employee.id, name: employee.displayName, availableAllMonth: false }))]);
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }
  function addAbsence() {
    if (!employeeId || !date || !endDate || date > endDate) { setError("Vyberte zaměstnance a platné období absence."); return; }
    setAbsences((current) => [...current, { id: crypto.randomUUID(), employeeId, from: date, to: endDate, type: "other", status: "approved" }]);
    setError("");
  }
  function addAvailability() {
    if (!employeeId || !date || !date.startsWith(`${month}-`)) { setError("Vyberte zaměstnance a den ve zvoleném měsíci."); return; }
    setAvailability((current) => [...current.filter((item) => !(item.employeeId === employeeId && item.date === date && item.shiftKind === shift)), { employeeId, date, shiftKind: shift, available }]);
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setView(null); setConfirmed(false); onResult(null);
    const prepared = buildMonthlyFormInput({ month, employees, absences, availability, staffing, instructions });
    if (!prepared.ok) { setError(prepared.message); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/planning/monthly/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: prepared.value, scenario }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message ?? "Návrh se nepodařilo vytvořit."); return; }
      setView(result); onResult(result);
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }
  async function confirm() {
    if (!view) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/planning/monthly/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: view.id }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.code === "month_conflict" ? "Pro tento měsíc již existuje potvrzený rozpis." : result.message ?? "Potvrzení je zablokované; zkontrolujte podklady a výsledky kontrol."); return; }
      setConfirmed(true); onResult({ ...view, confirmed: true });
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }

  return <section className="card" aria-labelledby="monthly-title">
    <h2 id="monthly-title">Měsíční návrh · {month}</h2>
    <p>Vyplňte syntetické vstupy. Návrh se ukládá odděleně a rozpis mění až potvrzení manažera.</p>
    {!canManage ? <p role="note">Vytvoření a potvrzení návrhu je dostupné manažerovi.</p> : null}
    <form onClick={(event) => { if (view && event.target instanceof HTMLElement && event.target.closest('button[type="button"]')) { setView(null); setConfirmed(false); onResult(null); } }} onChange={() => { if (view) { setView(null); setConfirmed(false); onResult(null); } }} onSubmit={(event) => void submit(event)}>
      <fieldset disabled={!canManage || busy}>
        <legend>1. Zaměstnanci</legend>
        <button className="btn" type="button" onClick={() => void loadEmployeeList()}>Načíst zaměstnance ze seznamu</button>{" "}
        <label>Jméno <input className="input" value={name} onChange={(event) => setName(event.target.value)} /></label>{" "}
        <button className="btn" type="button" onClick={addEmployee}>Přidat zaměstnance</button>
        {" "}<button className="btn" type="button" onClick={() => void loadPreviousEmployees()}>Načíst zaměstnance z předchozího potvrzeného měsíce</button>
        {" "}<button className="btn" type="button" onClick={() => void loadWeeklyEmployees()}>Načíst zaměstnance z předchozího potvrzeného týdne</button>
        <ul>{employees.map((employee) => <li key={employee.id}>{employee.name}{" "}<label><input type="checkbox" checked={employee.availableAllMonth} onChange={(event) => setEmployees((current) => current.map((item) => item.id === employee.id ? { ...item, availableAllMonth: event.target.checked } : item))} /> Dostupný na obě směny po celý měsíc</label>{" "}<button type="button" onClick={() => { setEmployees((current) => current.filter((item) => item.id !== employee.id)); setAbsences((current) => current.filter((item) => item.employeeId !== employee.id)); setAvailability((current) => current.filter((item) => item.employeeId !== employee.id)); if (employeeId === employee.id) setEmployeeId(""); }}>Odebrat</button></li>)}</ul>
      </fieldset>
      <fieldset disabled={!canManage || busy}>
        <legend>2. Absence a dostupnost</legend>
        <label>Zaměstnanec <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">Vyberte</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label>{" "}
        <label>Datum od / den <input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>{" "}
        <label>Datum do <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label>{" "}
        <button type="button" onClick={addAbsence}>Přidat schválenou absenci</button>
        <ul>{absences.map((absence) => <li key={absence.id}>{employees.find((employee) => employee.id === absence.employeeId)?.name}: {absence.from} – {absence.to} <button type="button" onClick={() => setAbsences((current) => current.filter((item) => item.id !== absence.id))}>Odebrat</button></li>)}</ul>
        <label>Směna <select value={shift} onChange={(event) => setShift(event.target.value as ShiftKind)}><option value="morning">Ranní</option><option value="afternoon">Odpolední</option></select></label>{" "}
        <label>Stav <select value={available ? "available" : "unavailable"} onChange={(event) => setAvailable(event.target.value === "available")}><option value="unavailable">Nedostupný</option><option value="available">Dostupný</option></select></label>{" "}
        <button type="button" onClick={addAvailability}>Nastavit dostupnost pro den</button>
        <p>Nezadaná dostupnost zůstává neznámá a může zablokovat potvrzení.</p>
        <ul>{availability.map((item) => <li key={`${item.employeeId}-${item.date}-${item.shiftKind}`}>{employees.find((employee) => employee.id === item.employeeId)?.name}: {item.date}, {item.shiftKind === "morning" ? "ranní" : "odpolední"}, {item.available ? "dostupný" : "nedostupný"} <button type="button" onClick={() => setAvailability((current) => current.filter((entry) => entry !== item))}>Odebrat</button></li>)}</ul>
      </fieldset>
      <fieldset disabled={!canManage || busy}>
        <legend>3. Potřebné obsazení</legend>
        <p>{initialStaffing ? "Předvyplněno z nastaveného týdenního profilu. Změny zde platí pro tento návrh." : "Nastavený profil není dostupný; vyplňte všechna pole. Nulu zadejte výslovně."}</p>
        {DAYS.map((day, index) => <div key={day}><strong>{day}</strong>{(["Ranní", "Odpolední"] as const).map((label, shiftIndex) => <label key={label}> {label} <input type="number" min="0" step="1" value={staffing[index * 2 + shiftIndex]} onChange={(event) => setStaffing((current) => current.map((value, i) => i === index * 2 + shiftIndex ? event.target.value : value))} /></label>)}</div>)}
      </fieldset>
      <fieldset disabled={!canManage || busy}>
        <legend>4. Pokyny pro AI</legend>
        <label>Doplňující pokyn <textarea className="input" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
        {simulated ? <label>Simulovaný scénář <select value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="complete">Pokus o obsazení</option><option value="partial">Částečný návrh</option><option value="unverified">Neověřené podklady</option></select></label> : null}{" "}
        <button className="btn btn--primary" type="submit">{busy ? "Pracuji…" : "Vytvořit měsíční návrh"}</button>
      </fieldset>
    </form>
    {error ? <p role="alert">{error}</p> : null}
    {view && view.input.month === month ? <div aria-live="polite"><h3>Výsledek návrhu</h3><p>{view.mode === "simulated" ? "SIMULATED · " : "AI · "}{confirmed ? "Potvrzený rozpis" : "Návrh čeká na rozhodnutí"}. Stav kontrol: {view.validation.status}.</p><p>Pokyn pro AI: {view.draft.instructionsOutcome}</p><p>Navržených směn: {view.draft.assignments.length}.</p>
      <details><summary>Pokrytí jednotlivých směn</summary><ul>{view.input.staffingRequirements.map((requirement) => <li key={`${requirement.date}-${requirement.shiftKind}`}>{requirement.date}, {requirement.shiftKind === "morning" ? "ranní" : "odpolední"}: {view.draft.assignments.filter((item) => item.date === requirement.date && item.shiftKind === requirement.shiftKind).length} / {requirement.requiredEmployees}</li>)}</ul></details>
      {view.draft.explanations.length ? <details><summary>Vysvětlení návrhu</summary><ul>{view.draft.explanations.map((item, index) => <li key={index}>{item.text}</li>)}</ul></details> : null}
      {view.draft.assumptions.length ? <details><summary>Předpoklady</summary><ul>{view.draft.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
      {view.draft.alternatives.length ? <details><summary>Alternativy</summary><ul>{view.draft.alternatives.map((item) => <li key={item.id}>{item.summary} · {item.impact}</li>)}</ul></details> : null}
      <h4>Problémy a omezení</h4><ul>{[...view.validation.problems, ...view.validation.unverified].map((finding, index) => <li key={`${finding.code}-${index}`}>{finding.date ? `${finding.date}: ` : ""}{finding.message}</li>)}</ul>
      <button className="btn btn--primary" type="button" disabled={!canManage || busy || confirmed || !view.validation.canConfirm} onClick={() => void confirm()}>Potvrdit rozpis</button>
      {!view.validation.canConfirm ? <p>Potvrzení je zablokováno, dokud nejsou vyřešené problémy a ověřené potřebné podklady.</p> : null}
    </div> : null}
  </section>;
}
