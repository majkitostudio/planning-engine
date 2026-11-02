"use client";

import { useState, type FormEvent } from "react";
import { buildMonthlyFormInput, monthlyFormReadiness, staffingFormValues, type MonthlyFormData } from "@/lib/planning/monthly-form";
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
const STEPS = ["Zaměstnanci", "Absence a dostupnost", "Obsazení", "Pokyny pro AI", "Souhrn a návrh"] as const;

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
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<MonthlyView | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const formData: MonthlyFormData = { month, employees, absences, availability, staffing, instructions };
  const readiness = monthlyFormReadiness(formData);

  function addEmployee() {
    if (!name.trim()) { setError("Vyplňte jméno zaměstnance."); return; }
    if (employees.some((employee) => employee.name.trim().toLowerCase() === name.trim().toLowerCase())) { setError("Tento zaměstnanec už je ve výběru."); return; }
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
    event.preventDefault();
    setError("");
    if (readiness.missing.length) { setStep(4); setError("Doplňte povinné vstupy uvedené v souhrnu před vytvořením návrhu."); return; }
    const prepared = buildMonthlyFormInput(formData);
    if (!prepared.ok) { setStep(4); setError(prepared.message); return; }
    setBusy(true); setView(null); setConfirmed(false); onResult(null);
    try {
      const response = await fetch("/api/planning/monthly/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: prepared.value, scenario }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message ?? "Návrh se nepodařilo vytvořit. Vyplněné hodnoty zůstaly zachované."); return; }
      setView(result); onResult(result);
    } catch { setError("Spojení se serverem selhalo. Vyplněné hodnoty zůstaly zachované."); } finally { setBusy(false); }
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
  function changeStep(next: number) { setStep(Math.max(0, Math.min(STEPS.length - 1, next))); setError(""); }
  function clearResult() {
    if (!view) return;
    setView(null); setConfirmed(false); onResult(null);
  }
  const employeeName = (id: string) => employees.find((employee) => employee.id === id)?.name ?? "Neznámý zaměstnanec";

  return <section className="card monthly-planning-panel" aria-labelledby="monthly-title">
    <div className="monthly-form-heading"><div><p className="eyebrow">Celý kalendářní měsíc</p><h2 id="monthly-title">Návrh rozpisu · {month}</h2></div><span className="monthly-step-count">Krok {step + 1} z {STEPS.length}</span></div>
    <p>Návrh se ukládá odděleně. Rozpis se změní až po potvrzení manažerem.</p>
    {!canManage ? <p role="note">Vytvoření a potvrzení návrhu je dostupné manažerovi.</p> : null}
    <nav className="monthly-progress" aria-label="Postup zadání měsíčního návrhu">{STEPS.map((label, index) => <button key={label} type="button" className="monthly-progress__step" aria-current={step === index ? "step" : undefined} aria-label={`Krok ${index + 1}: ${label}`} onClick={() => changeStep(index)}><span className="monthly-progress__number">{index + 1}</span><span className="monthly-progress__label">{label}</span></button>)}</nav>
    <form onClick={(event) => { if (event.target instanceof HTMLElement && event.target.closest('button[type="button"]')) clearResult(); }} onChange={clearResult} onSubmit={(event) => void submit(event)}>
      <fieldset disabled={!canManage || busy}>
        <legend>{step + 1}. {STEPS[step]}</legend>
        {step === 0 ? <>
          <div className="monthly-form-actions"><button className="btn btn--secondary" type="button" onClick={() => void loadEmployeeList()}>Načíst seznam zaměstnanců</button><button className="btn btn--secondary" type="button" onClick={() => void loadPreviousEmployees()}>Načíst z předchozího měsíce</button></div>
          <div className="monthly-inline-field"><label htmlFor="monthly-employee-name">Jméno zaměstnance</label><input className="input" id="monthly-employee-name" value={name} onChange={(event) => setName(event.target.value)} /><button className="btn btn--secondary" type="button" onClick={addEmployee}>Přidat</button></div>
          {employees.length ? <ul className="monthly-entry-list">{employees.map((employee) => <li key={employee.id}><span><strong>{employee.name}</strong><label className="monthly-checkbox"><input type="checkbox" checked={employee.availableAllMonth} onChange={(event) => setEmployees((current) => current.map((item) => item.id === employee.id ? { ...item, availableAllMonth: event.target.checked } : item))} /> Dostupný na obě směny po celý měsíc</label></span><button className="btn btn--quiet" type="button" onClick={() => { setEmployees((current) => current.filter((item) => item.id !== employee.id)); setAbsences((current) => current.filter((item) => item.employeeId !== employee.id)); setAvailability((current) => current.filter((item) => item.employeeId !== employee.id)); if (employeeId === employee.id) setEmployeeId(""); }}>Odebrat</button></li>)}</ul> : <p className="monthly-muted">Zatím nejsou vybraní žádní zaměstnanci.</p>}
        </> : null}
        {step === 1 ? <>
          <p className="monthly-muted">Dostupnost lze zadávat postupně; nezadaná dostupnost zůstává neznámá a může zablokovat potvrzení.</p>
          <div className="monthly-entry-grid"><label>Zaměstnanec<select className="input" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">Vyberte</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label>Datum od / den<input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Datum do<input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
          <div className="monthly-form-actions"><button className="btn btn--secondary" type="button" onClick={addAbsence}>Přidat schválenou absenci</button><label>Směna<select className="input" value={shift} onChange={(event) => setShift(event.target.value as ShiftKind)}><option value="morning">Ranní</option><option value="afternoon">Odpolední</option></select></label><label>Dostupnost<select className="input" value={available ? "available" : "unavailable"} onChange={(event) => setAvailable(event.target.value === "available")}><option value="unavailable">Nedostupný</option><option value="available">Dostupný</option></select></label><button className="btn btn--secondary" type="button" onClick={addAvailability}>Nastavit pro den</button></div>
          <ul className="monthly-entry-list">{absences.map((absence) => <li key={absence.id}><span>{employeeName(absence.employeeId)} · absence {absence.from}–{absence.to}</span><button className="btn btn--quiet" type="button" onClick={() => setAbsences((current) => current.filter((item) => item.id !== absence.id))}>Odebrat</button></li>)}{availability.map((item) => <li key={`${item.employeeId}-${item.date}-${item.shiftKind}`}><span>{employeeName(item.employeeId)} · {item.date} · {item.shiftKind === "morning" ? "ranní" : "odpolední"} · {item.available ? "dostupný" : "nedostupný"}</span><button className="btn btn--quiet" type="button" onClick={() => setAvailability((current) => current.filter((entry) => entry !== item))}>Odebrat</button></li>)}</ul>
        </> : null}
        {step === 2 ? <>
          <p className="monthly-muted">{initialStaffing ? "Předvyplněno z uloženého týdenního profilu. Změny zde se vztahují k tomuto měsíčnímu návrhu." : "Profil obsazení není dostupný; vyplňte všechna pole. Nulu zadejte výslovně."}</p>
          <div className="monthly-staffing-grid">{DAYS.map((day, index) => <div className="monthly-staffing-day" key={day}><strong>{day}</strong>{(["Ranní", "Odpolední"] as const).map((label, shiftIndex) => <label key={label}>{label}<input className="input" type="number" min="0" step="1" inputMode="numeric" aria-label={`${day}, ${label}, počet zaměstnanců`} value={staffing[index * 2 + shiftIndex] ?? ""} onChange={(event) => setStaffing((current) => current.map((value, i) => i === index * 2 + shiftIndex ? event.target.value : value))} /></label>)}</div>)}</div>
        </> : null}
        {step === 3 ? <>
          <p className="monthly-advisory">Textové pokyny jsou předány plánovacímu poskytovateli jako kontext. Nejsou deterministicky ověřovaným pravidlem.</p>
          <label className="monthly-block-label" htmlFor="monthly-instructions">Doplňující pokyny<textarea className="input" id="monthly-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
          {simulated ? <label className="monthly-block-label">Simulovaný scénář<select className="input" value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="complete">Simulovaný pokus o obsazení</option><option value="partial">Simulovaný částečný návrh</option><option value="unverified">Simulované neověřené podklady</option></select></label> : null}
        </> : null}
        {step === 4 ? <div className="monthly-review-summary"><h3>Souhrn před vytvořením návrhu</h3><dl><div><dt>Měsíc</dt><dd>{month}</dd></div><div><dt>Zaměstnanci</dt><dd>{readiness.employeeCount}</dd></div><div><dt>Dostupní celý měsíc</dt><dd>{readiness.allMonthAvailableCount}</dd></div><div><dt>Absence</dt><dd>{readiness.absenceCount}</dd></div><div><dt>Jednotlivé záznamy dostupnosti</dt><dd>{readiness.availabilityCount} · ostatní zůstávají neznámé</dd></div><div><dt>Vyplněné hodnoty obsazení</dt><dd>{readiness.filledStaffingCount} z 14</dd></div><div><dt>Pokyny pro AI</dt><dd>{instructions.trim() ? "Zadány jako pokyn, nikoli jako ověřované pravidlo" : "Bez doplňujících pokynů"}</dd></div></dl>{readiness.missing.length ? <div className="monthly-missing" role="alert"><strong>Před návrhem doplňte:</strong><ul>{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : <p className="monthly-ready" role="status">Povinná pole jsou vyplněna. Výsledek stále může být neúplný nebo neověřený a pak jej nebude možné potvrdit.</p>}<button className="btn btn--primary" type="submit" disabled={!canManage || busy || readiness.missing.length > 0}>{busy ? "Pracuji…" : "Vytvořit měsíční návrh"}</button></div> : null}
      </fieldset>
      <div className="monthly-step-controls"><button className="btn btn--secondary" type="button" disabled={step === 0 || busy} onClick={() => changeStep(step - 1)}>Zpět</button>{step < STEPS.length - 1 ? <button className="btn btn--primary" type="button" disabled={busy} onClick={() => changeStep(step + 1)}>Pokračovat: {STEPS[step + 1]}</button> : null}</div>
    </form>
    {error ? <p className="monthly-error" role="alert">{error}</p> : null}
    {view && view.input.month === month ? <div aria-live="polite"><h3>Výsledek návrhu</h3><p>{view.mode === "simulated" ? "SIMULATED · simulovaný scénář · " : "AI · NOT VERIFIED · "}{confirmed ? "Potvrzený rozpis" : "Návrh čeká na rozhodnutí"}. Stav kontrol: {view.validation.status}.</p><p>Pokyn pro AI: {view.draft.instructionsOutcome}</p><p>Navržených směn: {view.draft.assignments.length}.</p>
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
