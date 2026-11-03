"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { buildMonthlyFormInput, monthlyFormReadiness, partialAbsenceAvailability, staffingFormValues, type MonthlyFormData, type PartialAbsence } from "@/lib/planning/monthly-form";
import type { StaffingSetting } from "@/lib/planning/staffing-settings";
import type { MonthlyPlanningInput } from "@/lib/planning/domain/month-input";
import type { Absence, ProposedAssignment, ShiftKind } from "@/lib/planning/domain/types";
import type { MonthlyPlanDraft } from "@/lib/planning/monthly-planning";
import type { MonthlyValidation } from "@/lib/planning/domain/month-validation";
import { addDays } from "@/lib/planning/domain/time";

export interface MonthlyView {
  readonly id: string;
  readonly mode: "simulated" | "gemini" | "ortools";
  readonly input: MonthlyPlanningInput;
  readonly draft: MonthlyPlanDraft;
  readonly validation: MonthlyValidation;
  readonly confirmed?: boolean;
}

const DAYS = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
const STEPS = ["Zaměstnanci", "Absence a dostupnost", "Obsazení", "Doplňující pokyny", "Souhrn a návrh"] as const;

export function MonthlyPlanningPanel({ month, canManage, planningMode, initialStaffing, weekDates, onResult }: { month: string; canManage: boolean; planningMode: MonthlyView["mode"] | null; initialStaffing: readonly StaffingSetting[] | null; weekDates: readonly string[]; onResult: (month: string, result: MonthlyView | null) => void }) {
  const [employees, setEmployees] = useState<MonthlyFormData["employees"]>([]);
  const [name, setName] = useState("");
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [partialAbsences, setPartialAbsences] = useState<(PartialAbsence & { id: string })[]>([]);
  const [staffing, setStaffing] = useState<string[]>(() => staffingFormValues(initialStaffing));
  const [instructions, setInstructions] = useState("");
  const [shiftRotationPreference, setShiftRotationPreference] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [absenceShift, setAbsenceShift] = useState<ShiftKind | "full_day">("full_day");
  const [scenario, setScenario] = useState("complete");
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState<MonthlyView | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [restored, setRestored] = useState(false);
  const [edited, setEdited] = useState<readonly ProposedAssignment[] | null>(null);
  const [editEmployee, setEditEmployee] = useState("");
  const [editDate, setEditDate] = useState("");
  const revision = useRef(0);
  const storageKey = `planning-monthly-draft:${month}`;

  useEffect(() => {
    if (!canManage) return;
    let id: string | null;
    try { id = localStorage.getItem(storageKey); } catch { return; }
    if (!id) return;
    const controller = new AbortController();
    const currentRevision = revision.current;
    void fetch(`/api/planning/monthly/draft?month=${encodeURIComponent(month)}&id=${encodeURIComponent(id)}`, { signal: controller.signal })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error("Uložený návrh se nepodařilo obnovit.");
        if (!controller.signal.aborted && revision.current === currentRevision) { setView(result); setRestored(true); onResult(month, result); }
      })
      .catch(() => { if (!controller.signal.aborted && revision.current === currentRevision) setError("Uložený návrh se nepodařilo obnovit. Zkuste stránku načíst znovu."); });
    return () => controller.abort();
  }, [canManage, month, onResult, storageKey]);

  function rememberDraft(id: string) { try { localStorage.setItem(storageKey, id); } catch { setError("Návrh byl uložen, ale prohlížeč nepovolil jeho automatické obnovení."); } }

  const availability = partialAbsenceAvailability(month, partialAbsences);
  const formData: MonthlyFormData = { month, employees, absences, availability, staffing, instructions, shiftRotationPreference: planningMode === "ortools" && shiftRotationPreference };
  const readiness = monthlyFormReadiness(formData);

  function addEmployee() {
    if (!name.trim()) { setError("Vyplňte jméno zaměstnance."); return; }
    if (employees.some((employee) => employee.name.trim().toLowerCase() === name.trim().toLowerCase())) { setError("Tento zaměstnanec už je ve výběru."); return; }
    const id = crypto.randomUUID();
    setEmployees((current) => [...current, { id, name: name.trim() }]);
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
      setEmployees((current) => [...current, ...incoming.filter((employee) => !current.some((item) => item.id === employee.id)).map((employee) => ({ id: employee.id, name: employee.displayName }))]);
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
      setEmployees((current) => [...current, ...incoming.filter((employee) => !current.some((item) => item.id === employee.id)).map((employee) => ({ id: employee.id, name: employee.displayName }))]);
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }
  function addAbsence() {
    if (!employeeId || !date || !endDate || date > endDate) { setError("Vyberte zaměstnance a platné období absence."); return; }
    const first = `${month}-01`;
    const nextMonth = addDays(first, 32).slice(0, 7);
    if (endDate < first || date >= `${nextMonth}-01`) { setError("Období absence musí zasahovat do vybraného měsíce."); return; }
    if (absenceShift === "full_day") setAbsences((current) => [...current, { id: crypto.randomUUID(), employeeId, from: date, to: endDate, type: "other", status: "approved" }]);
    else setPartialAbsences((current) => [...current, { id: crypto.randomUUID(), employeeId, from: date, to: endDate, shiftKind: absenceShift }]);
    setError("");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (readiness.missing.length) { setStep(4); setError("Doplňte povinné vstupy uvedené v souhrnu před vytvořením návrhu."); return; }
    const prepared = buildMonthlyFormInput(formData);
    if (!prepared.ok) { setStep(4); setError(prepared.message); return; }
    revision.current++; setBusy(true); setView(null); setEdited(null); setConfirmed(false); setRestored(false); onResult(month, null);
    try {
      const response = await fetch("/api/planning/monthly/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: prepared.value, scenario }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message ?? "Návrh se nepodařilo vytvořit. Vyplněné hodnoty zůstaly zachované."); return; }
      rememberDraft(result.id); setView(result); onResult(month, result);
    } catch { setError("Spojení se serverem selhalo. Vyplněné hodnoty zůstaly zachované."); } finally { setBusy(false); }
  }
  async function confirm() {
    if (!view || edited !== null) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/planning/monthly/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: view.id }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.code === "month_conflict" ? "Pro tento měsíc již existuje potvrzený rozpis." : result.message ?? "Potvrzení je zablokované; zkontrolujte podklady a výsledky kontrol."); return; }
      try { localStorage.removeItem(storageKey); } catch { /* Potvrzení již proběhlo. */ }
      setConfirmed(true); onResult(month, { ...view, confirmed: true });
    } catch { setError("Spojení se serverem selhalo."); } finally { setBusy(false); }
  }
  async function recheck() {
    if (!view || edited === null) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/planning/monthly/recheck", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: view.id, assignments: edited }) });
      const result = await response.json();
      if (!response.ok || !result.ok) { setError(result.message ?? "Kontrola se nezdařila."); return; }
      rememberDraft(result.id); setView(result); setEdited(null); onResult(month, result);
    } catch { setError("Spojení se serverem selhalo; úpravy zůstaly v prohlížeči."); } finally { setBusy(false); }
  }
  function changeStep(next: number) { setStep(Math.max(0, Math.min(STEPS.length - 1, next))); setError(""); }
  function clearResult() {
    revision.current++;
    if (!view) return;
    setView(null); setEdited(null); setConfirmed(false); setRestored(false); onResult(month, null);
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
          {employees.length ? <ul className="monthly-entry-list">{employees.map((employee) => <li key={employee.id}><span><strong>{employee.name}</strong></span><button className="btn btn--secondary" type="button" onClick={() => { setEmployees((current) => current.filter((item) => item.id !== employee.id)); setAbsences((current) => current.filter((item) => item.employeeId !== employee.id)); setPartialAbsences((current) => current.filter((item) => item.employeeId !== employee.id)); if (employeeId === employee.id) setEmployeeId(""); }}>Odebrat</button></li>)}</ul> : <p className="monthly-muted">Zatím nejsou vybraní žádní zaměstnanci.</p>}
        </> : null}
        {step === 1 ? <>
          <p className="monthly-muted">Zadejte, kdy zaměstnanec nemůže pracovat. Ostatní směny považujeme za dostupné.</p>
          <div className="monthly-entry-grid"><label>Zaměstnanec<select className="input" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}><option value="">Vyberte</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}</select></label><label>Datum od / den<input className="input" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label>Datum do<input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div>
          <div className="monthly-form-actions"><label>Typ absence<select className="input" value={absenceShift} onChange={(event) => setAbsenceShift(event.target.value as ShiftKind | "full_day")}><option value="morning">Ranní</option><option value="afternoon">Odpolední</option><option value="full_day">Celodenní</option></select></label><button className="btn btn--secondary" type="button" onClick={addAbsence}>Přidat absenci</button></div>
          <ul className="monthly-entry-list">{absences.map((absence) => <li key={absence.id}><span>{employeeName(absence.employeeId)} · celodenní · {absence.from}–{absence.to}</span><button className="btn btn--secondary" type="button" onClick={() => setAbsences((current) => current.filter((item) => item.id !== absence.id))}>Odebrat</button></li>)}{partialAbsences.map((item) => <li key={item.id}><span>{employeeName(item.employeeId)} · {item.shiftKind === "morning" ? "ranní" : "odpolední"} · {item.from}–{item.to}</span><button className="btn btn--secondary" type="button" onClick={() => setPartialAbsences((current) => current.filter((entry) => entry.id !== item.id))}>Odebrat</button></li>)}</ul>
        </> : null}
        {step === 2 ? <>
          <p className="monthly-muted">{initialStaffing ? "Předvyplněno z uloženého týdenního profilu. Změny zde se vztahují k tomuto měsíčnímu návrhu." : "Profil obsazení není dostupný; vyplňte všechna pole. Nulu zadejte výslovně."}</p>
          <div className="monthly-staffing-grid">{DAYS.map((day, index) => <div className="monthly-staffing-day" key={day}><strong>{day}</strong>{(["Ranní", "Odpolední"] as const).map((label, shiftIndex) => <label key={label}>{label}<input className="input" type="number" min="0" step="1" inputMode="numeric" aria-label={`${day}, ${label}, počet zaměstnanců`} value={staffing[index * 2 + shiftIndex] ?? ""} onChange={(event) => setStaffing((current) => current.map((value, i) => i === index * 2 + shiftIndex ? event.target.value : value))} /></label>)}</div>)}</div>
        </> : null}
        {step === 3 ? <>
          <p className="monthly-muted">Napište další pokyny. {planningMode === "ortools" ? "Lokální plánovač volný text nevyhodnocuje, ale zohlední níže uvedené střídání směn." : planningMode === "simulated" ? "Simulovaný návrh nezohlední střídání ani volný text." : planningMode === "gemini" ? "AI může přihlédnout k volnému textu, jeho splnění však nezávislá kontrola neověří. Strukturovanou preferenci střídání tento režim nepodporuje." : "Plánovač není nastaven; volný text ani preference zatím nelze zpracovat."}</p>
          {planningMode === "ortools" ? <label className="monthly-block-label"><input type="checkbox" checked={shiftRotationPreference} onChange={(event) => setShiftRotationPreference(event.target.checked)} /> Přednostně střídat ranní a odpolední směny mezi sousedními pracovními směnami, i když jsou mezi nimi dny volna. Jde o přání; obsazení a potvrzená pravidla mají přednost.</label> : null}
          <label className="monthly-block-label" htmlFor="monthly-instructions">Doplňující pokyny<textarea className="input" id="monthly-instructions" value={instructions} onChange={(event) => setInstructions(event.target.value)} /></label>
          {planningMode === "simulated" ? <label className="monthly-block-label">Simulovaný scénář<select className="input" value={scenario} onChange={(event) => setScenario(event.target.value)}><option value="complete">Simulovaný pokus o obsazení</option><option value="partial">Simulovaný částečný návrh</option><option value="unverified">Simulované neověřené podklady</option></select></label> : null}
        </> : null}
        {step === 4 ? <div className="monthly-review-summary"><h3>Souhrn před vytvořením návrhu</h3><dl><div><dt>Měsíc</dt><dd>{month}</dd></div><div><dt>Zaměstnanci</dt><dd>{readiness.employeeCount}</dd></div><div><dt>Výchozí dostupnost</dt><dd>Obě směny každý den včetně víkendů; platí zadané výjimky</dd></div><div><dt>Absence</dt><dd>{readiness.absenceCount + partialAbsences.length}</dd></div><div><dt>Vyplněné hodnoty obsazení</dt><dd>{readiness.filledStaffingCount} z 14</dd></div><div><dt>Střídání směn</dt><dd>{planningMode === "ortools" && shiftRotationPreference ? "Požadováno jako nezávazné přání" : "Bez preference"}</dd></div><div><dt>Doplňující pokyny</dt><dd>{instructions.trim() ? planningMode === "gemini" ? "Zadány; AI je může zohlednit, nezávisle ověřeny nejsou" : planningMode === "ortools" || planningMode === "simulated" ? "Zadány; tento režim je automaticky nevyhodnocuje" : "Zadány; bez nastaveného plánovače nejsou zpracovány" : "Bez doplňujících pokynů"}</dd></div></dl>{readiness.warnings.length ? <div className="monthly-missing" role="status"><strong>Upozornění k obsazení:</strong><ul>{readiness.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}{readiness.missing.length ? <div className="monthly-missing" role="alert"><strong>Před návrhem doplňte:</strong><ul>{readiness.missing.map((item) => <li key={item}>{item}</li>)}</ul></div> : <p className="monthly-ready" role="status">Povinná pole jsou vyplněna. Výsledek stále může být neúplný nebo neověřený a pak jej nebude možné potvrdit.</p>}<button className="btn btn--primary" type="submit" disabled={!canManage || busy || readiness.missing.length > 0}>{busy ? "Pracuji…" : "Vytvořit měsíční návrh"}</button></div> : null}
      </fieldset>
      <div className="monthly-step-controls"><button className="btn btn--secondary" type="button" disabled={step === 0 || busy} onClick={() => changeStep(step - 1)}>Zpět</button>{step < STEPS.length - 1 ? <button className="btn btn--primary" type="button" disabled={busy} onClick={() => changeStep(step + 1)}>Pokračovat: {STEPS[step + 1]}</button> : null}</div>
    </form>
    {error ? <p className="monthly-error" role="alert">{error}</p> : null}
    {view && view.input.month === month ? <div aria-live="polite"><h3>Výsledek návrhu</h3>{restored ? <p role="status">Obnovený uložený návrh. Původní vstupy jsou jeho součástí, ale formulář pro nový návrh nahoře není znovu vyplněný.</p> : null}<p>{view.mode === "simulated" ? "SIMULATED · simulovaný scénář · " : view.mode === "ortools" ? "LOKÁLNÍ PLÁNOVAČ · OR-TOOLS · NOT VERIFIED · " : "AI · NOT VERIFIED · "}{confirmed ? "Potvrzený rozpis" : "Návrh čeká na rozhodnutí"}. Stav kontrol: {view.validation.status}.</p><p>Pokyny: {view.draft.instructionsOutcome}</p>{view.input.shiftRotationPreference ? <p>Střídání směn bylo zadáno jako nezávazné přání. Výjimky a chybějící okrajové podklady jsou uvedeny v kontrole preference.</p> : null}<p>Navržených směn: {view.draft.assignments.length}.</p>
      {!confirmed && canManage ? <details><summary>Upravit návrh ručně</summary><fieldset disabled={busy}><legend>Ruční úprava vybraného týdne</legend><p>Vyberte den a zaměstnance. Změna se projeví v tabulce po nové kontrole celého měsíce. Při obnovení stránky se nezkontrolované úpravy ztratí.</p><div className="monthly-entry-grid"><label>Den<select className="input" value={weekDates.includes(editDate) ? editDate : ""} onChange={(event) => setEditDate(event.target.value)}><option value="">Vyberte den</option>{weekDates.filter((day) => day.startsWith(`${month}-`)).map((day) => <option key={day} value={day}>{day}</option>)}</select></label><label>Zaměstnanec<select className="input" value={editEmployee} onChange={(event) => setEditEmployee(event.target.value)}><option value="">Vyberte zaměstnance</option>{view.input.employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.displayName}</option>)}</select></label></div>
        {editEmployee && weekDates.includes(editDate) && editDate.startsWith(`${month}-`) ? <div className="monthly-form-actions">{(["morning", "afternoon"] as const).map((kind) => { const assignments = edited ?? view.draft.assignments; const present = assignments.some((item) => item.employeeId === editEmployee && item.date === editDate && item.shiftKind === kind); return <label key={kind}><input type="checkbox" checked={present} onChange={(event) => { const remaining = assignments.filter((item) => !(item.employeeId === editEmployee && item.date === editDate && item.shiftKind === kind)); setEdited(event.target.checked ? [...remaining, { employeeId: editEmployee, date: editDate, shiftKind: kind }] : remaining); }} /> {kind === "morning" ? "Ranní" : "Odpolední"}</label>; })}</div> : null}
        {edited !== null ? <p role="status">Úpravy čekají na novou kontrolu; zobrazené problémy a tabulka zatím patří předchozí verzi. Potvrzení je zablokováno.</p> : null}<button className="btn btn--secondary" type="button" disabled={edited === null} onClick={() => void recheck()}>Zkontrolovat celý měsíc</button></fieldset></details> : null}
      <details><summary>Pokrytí jednotlivých směn</summary><ul>{view.input.staffingRequirements.map((requirement) => <li key={`${requirement.date}-${requirement.shiftKind}`}>{requirement.date}, {requirement.shiftKind === "morning" ? "ranní" : "odpolední"}: {view.draft.assignments.filter((item) => item.date === requirement.date && item.shiftKind === requirement.shiftKind).length} / {requirement.requiredEmployees}</li>)}</ul></details>
      {view.draft.explanations.length ? <details><summary>Vysvětlení návrhu</summary><ul>{view.draft.explanations.map((item, index) => <li key={index}>{item.text}</li>)}</ul></details> : null}
      {view.draft.assumptions.length ? <details><summary>Předpoklady</summary><ul>{view.draft.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul></details> : null}
      {view.draft.alternatives.length ? <details><summary>Alternativy</summary><ul>{view.draft.alternatives.map((item) => <li key={item.id}>{item.summary} · {item.impact}</li>)}</ul></details> : null}
      <h4>Problémy</h4>{view.validation.problems.length ? <ul>{view.validation.problems.map((finding, index) => <li key={`${finding.code}-${index}`}>{finding.date ? `${finding.date} · ` : ""}{finding.employeeId ? `${view.input.employees.find((employee) => employee.id === finding.employeeId)?.displayName ?? "Neznámý zaměstnanec"} · ` : ""}{finding.shiftKind ? `${finding.shiftKind === "morning" ? "ranní" : "odpolední"} · ` : ""}{finding.message}</li>)}</ul> : <p>Kontrola nenašla žádný problém.</p>}
      {view.validation.preferenceFindings.length ? <details><summary>Kontrola přání ke střídání ({view.validation.preferenceFindings.length})</summary><p>Výjimky a chybějící návaznost u této měkké preference samy o sobě neblokují potvrzení. Chybějící podklady pro závazné kontroly se zobrazují zvlášť.</p><ul>{view.validation.preferenceFindings.map((finding, index) => <li key={`${finding.code}-${index}`}>{finding.date ? `${finding.date} · ` : ""}{finding.employeeId ? `${view.input.employees.find((employee) => employee.id === finding.employeeId)?.displayName ?? "Neznámý zaměstnanec"} · ` : ""}{finding.message}</li>)}</ul></details> : null}
      {view.validation.unverified.length ? <details><summary>Neověřené podklady a omezení ({view.validation.unverified.length})</summary><p>Část návrhu nelze ověřit. Rozbalte podrobnosti.</p><ul>{view.validation.unverified.map((finding, index) => <li key={`${finding.code}-${index}`}>{finding.date ? `${finding.date} · ` : ""}{finding.employeeId ? `${view.input.employees.find((employee) => employee.id === finding.employeeId)?.displayName ?? "Neznámý zaměstnanec"} · ` : ""}{finding.shiftKind ? `${finding.shiftKind === "morning" ? "ranní" : "odpolední"} · ` : ""}{finding.message}</li>)}</ul></details> : null}
      <button className="btn btn--primary" type="button" disabled={!canManage || busy || confirmed || edited !== null || !view.validation.canConfirm} onClick={() => void confirm()}>Potvrdit rozpis</button>
      {!view.validation.canConfirm ? <p>Potvrzení je zablokováno, dokud nejsou vyřešené problémy a ověřené potřebné podklady.</p> : null}
    </div> : null}
  </section>;
}
