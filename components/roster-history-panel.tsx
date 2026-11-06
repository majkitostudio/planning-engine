"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { parseRosterCsv, type RosterImportDay, type RosterImportPreviewEmployee, type RosterImportResult } from "@/lib/planning/roster-import";
import { rosterHistoryEmptyState, splitRosterPreview, withoutRosterSourceName } from "@/lib/planning/roster-history-view";
import {
  removalActionLabel,
  rosterHistoryControlLabel,
  rosterHistoryEmployeeContext,
} from "@/lib/accessibility-labels";

type Employee = { readonly id: string; readonly displayName: string };
type SavedImport = { readonly id: string; readonly periodStart: string; readonly periodEnd: string; readonly source: string; readonly version: number; readonly createdAt: string; readonly employeeCount: number; readonly knownDayCount: number };
type EditableDay = { status: "shift" | "off" | "unknown"; startTime: string; endTime: string };
type Preview = Extract<RosterImportResult, { readonly ok: true }>;
type BoundaryState = {
  readonly key: string;
  readonly status: "loading" | "available" | "unavailable" | "too_many";
  readonly before: boolean;
  readonly after: boolean;
};

function lastDateOfMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
}

function initialCell(day: RosterImportDay): EditableDay {
  return day.status === "shift"
    ? { status: "shift", startTime: day.startTime, endTime: day.endTime }
    : { status: day.status, startTime: "", endTime: "" };
}

function dayKey(sourceName: string, date: string) { return `${sourceName}|${date}`; }
function boundaryStateKey(month: string, employeeIds: readonly string[]) { return `${month}|${employeeIds.join(",")}`; }
function validTime(value: string) { return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value); }

export function RosterHistoryPanel({ canManage, initialMonth }: { readonly canManage: boolean; readonly initialMonth: string }) {
  const [month, setMonth] = useState(initialMonth);
  const [employees, setEmployees] = useState<readonly Employee[]>([]);
  const [rawText, setRawText] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [skippedEmployees, setSkippedEmployees] = useState<readonly RosterImportPreviewEmployee[]>([]);
  const [employeeMapping, setEmployeeMapping] = useState<Record<string, string>>({});
  const [dayEdits, setDayEdits] = useState<Record<string, EditableDay>>({});
  const [savedImports, setSavedImports] = useState<readonly SavedImport[]>([]);
  const [savedImportsMonth, setSavedImportsMonth] = useState("");
  const [savedImportsUnavailable, setSavedImportsUnavailable] = useState(false);
  const [boundary, setBoundary] = useState<BoundaryState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadImports(selectedMonth: string, signal?: AbortSignal) {
    try {
      const response = await fetch(`/api/planning/roster-history?month=${encodeURIComponent(selectedMonth)}`, signal ? { signal } : undefined);
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error("Uložené podklady nejsou dostupné.");
      if (!signal?.aborted) {
        setSavedImports(result.imports);
        setSavedImportsUnavailable(false);
        setSavedImportsMonth(selectedMonth);
      }
    } catch {
      if (!signal?.aborted) {
        setSavedImports([]);
        setSavedImportsUnavailable(true);
        setSavedImportsMonth(selectedMonth);
      }
    }
  }

  async function loadBoundary(selectedMonth: string, employeeIds: readonly string[], signal?: AbortSignal) {
    const key = boundaryStateKey(selectedMonth, employeeIds);
    if (!employeeIds.length || employeeIds.length > 200) return;
    try {
      const query = new URLSearchParams({ month: selectedMonth, employeeIds: employeeIds.join(",") });
      const response = await fetch(`/api/planning/roster-history?${query.toString()}`, signal ? { signal } : undefined);
      const result = await response.json();
      if (!response.ok || !result.ok || !result.boundary) throw new Error("Stav návaznosti není dostupný.");
      if (!signal?.aborted) {
        setBoundary({ key, status: "available", before: result.boundary.beforeComplete === true, after: result.boundary.afterComplete === true });
      }
    } catch {
      if (!signal?.aborted) setBoundary({ key, status: "unavailable", before: false, after: false });
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/employees", { signal: controller.signal }).then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.ok) throw new Error(result.message ?? "Seznam zaměstnanců se nepodařilo načíst.");
        setEmployees(result.employees);
      }),
      Promise.resolve().then(() => loadImports(month, controller.signal)),
    ]).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Data návaznosti se nepodařilo načíst.");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [month]);

  const employeeIds = useMemo(() => employees.map((employee) => employee.id).sort(), [employees]);
  const boundaryKey = boundaryStateKey(month, employeeIds);
  const activeBoundary = boundary?.key === boundaryKey
    ? boundary
    : employeeIds.length > 200
      ? { key: boundaryKey, status: "too_many" as const, before: false, after: false }
      : employeeIds.length > 0
        ? { key: boundaryKey, status: "loading" as const, before: false, after: false }
        : null;

  useEffect(() => {
    if (!employeeIds.length || employeeIds.length > 200) return;
    const controller = new AbortController();
    void Promise.resolve().then(() => loadBoundary(month, employeeIds, controller.signal));
    return () => controller.abort();
  }, [boundaryKey, employeeIds, month]);

  const selectedIds = Object.values(employeeMapping);
  const mappingValid = Boolean(preview && preview.employees.length > 0 && preview.employees.every((employee) => Boolean(employeeMapping[employee.sourceName])) && new Set(selectedIds).size === selectedIds.length);
  const editValid = Boolean(preview && preview.employees.every((employee) => Object.entries(employee.days).every(([date, day]) => {
    const value = dayEdits[dayKey(employee.sourceName, date)] ?? initialCell(day);
    return value.status !== "shift" || (validTime(value.startTime) && validTime(value.endTime) && value.startTime < value.endTime);
  })));
  const importsLoadState = loading || savedImportsMonth !== month ? "loading" : savedImportsUnavailable ? "unavailable" : "ready";
  const importsEmptyMessage = rosterHistoryEmptyState(importsLoadState, savedImports.length);

  function clearPreview() { setPreview(null); setSkippedEmployees([]); setEmployeeMapping({}); setDayEdits({}); setNotice(""); setError(""); }

  function clearSource() {
    setRawText(""); setFileName(""); clearPreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function updateSource(text: string, name = "") {
    setRawText(text); setFileName(name); clearPreview();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function createPreview() {
    setError(""); setNotice("");
    const result = parseRosterCsv(rawText, month, employees);
    if (!result.ok) {
      setSkippedEmployees([]);
      const messages: Record<typeof result.code, string> = {
        invalid_month: "Vyberte platný měsíc.", invalid_csv: "Text není platný export CSV se středníky.",
        invalid_header: "V exportu nebyla rozpoznána hlavička dnů.", header_month_mismatch: "Čísla dnů nebo dny v týdnu neodpovídají vybranému měsíci.",
        invalid_row: "Export obsahuje řádek bez použitelného zaměstnance nebo s neplatnou strukturou.",
        invalid_shift_time: "Export obsahuje neplatný nebo při změně času nejednoznačný čas směny. Opravte zdroj a načtěte jej znovu.",
        duplicate_person: "Stejná osoba je v exportu uvedena vícekrát. Import byl zastaven.",
      };
      setError(messages[result.code]);
      return;
    }
    const { included, skipped } = splitRosterPreview(result.employees);
    setSkippedEmployees(skipped);
    if (!included.length) {
      setPreview(null);
      setEmployeeMapping({});
      setDayEdits({});
      setError("Žádný řádek exportu neodpovídá zaměstnanci v aplikaci. Přidejte chybějící zaměstnance, nebo zkontrolujte export.");
      return;
    }
    setPreview({ ...result, employees: included });
    setEmployeeMapping(Object.fromEntries(included.flatMap((employee) => employee.employeeId ? [[employee.sourceName, employee.employeeId]] : [])));
    setDayEdits({});
  }

  function removePreviewEmployee(employee: RosterImportPreviewEmployee) {
    if (!preview || busy || deletingId) return;
    const remaining = preview.employees.filter((candidate) => candidate.sourceName !== employee.sourceName);
    setEmployeeMapping((current) => withoutRosterSourceName(current, employee.sourceName));
    setDayEdits((current) => withoutRosterSourceName(current, employee.sourceName));
    setError("");
    if (!remaining.length) {
      setPreview(null);
      setEmployeeMapping({});
      setDayEdits({});
      setNotice("Všechny řádky náhledu byly odebrány. Vložený export zůstává, můžete jej zkontrolovat znovu.");
      return;
    }
    setPreview({ ...preview, employees: remaining });
    setNotice(`Řádek „${employee.sourceName}“ byl odebrán z náhledu. Uloží se jen zbývající řádky.`);
  }

  async function savePreview() {
    if (!preview || !mappingValid || !editValid) return;
    const ids = preview.employees.map((employee) => employeeMapping[employee.sourceName]);
    const entries: { employeeId: string; date: string; status: "shift" | "off"; startTime?: string; endTime?: string }[] = [];
    preview.employees.forEach((employee) => {
      const employeeId = employeeMapping[employee.sourceName];
      Object.entries(employee.days).forEach(([date, day]) => {
        const value = dayEdits[dayKey(employee.sourceName, date)] ?? initialCell(day);
        if (value.status === "off") entries.push({ employeeId, date, status: "off" });
        else if (value.status === "shift") entries.push({ employeeId, date, status: "shift", startTime: value.startTime, endTime: value.endTime });
      });
    });
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch("/api/planning/roster-history", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ startDate: `${month}-01`, endDate: lastDateOfMonth(month), source: "copied_roster", employeeIds: ids, entries }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.message ?? "Podklady se nepodařilo uložit.");
      const savedNotice = result.duplicate ? `Tento obsah je již uložen ve verzi ${result.version}.` : `Podklady jsou uloženy jako verze ${result.version}. Změna zatím nemění potvrzený rozpis.`;
      setRawText(""); setFileName(""); setPreview(null); setSkippedEmployees([]); setEmployeeMapping({}); setDayEdits({});
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice(savedNotice);
      await loadImports(month);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Spojení se serverem selhalo."); }
    finally { setBusy(false); }
  }

  async function deleteImport(item: SavedImport) {
    if (!canManage || busy || deletingId) return;
    if (!window.confirm("Opravdu chcete tyto podklady trvale smazat? Mohou se tím stát některé kontroly návaznosti neověřené.")) return;
    setDeletingId(item.id); setError(""); setNotice("");
    try {
      const response = await fetch("/api/planning/roster-history", {
        method: "DELETE", headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok) {
        if (response.status === 404) {
          setError("Tyto podklady už nejsou uložené. Seznam se znovu načte.");
          await loadImports(month);
          await loadBoundary(month, employeeIds);
        } else {
          setError(result?.message ?? "Podklady se nepodařilo smazat. Řádek zůstává beze změny.");
        }
        return;
      }
      setNotice("Podklady byly smazány. Seznam a stav návaznosti se znovu načetly.");
      await loadImports(month);
      await loadBoundary(month, employeeIds);
    } catch {
      setError("Podklady se nepodařilo smazat kvůli chybě spojení. Řádek zůstává beze změny.");
    } finally { setDeletingId(null); }
  }

  const counts = useMemo(() => {
    if (!preview) return null;
    let shifts = 0; let off = 0; let unknown = 0;
    for (const employee of preview.employees) for (const [date, day] of Object.entries(employee.days)) {
      const value = dayEdits[dayKey(employee.sourceName, date)] ?? initialCell(day);
      if (value.status === "shift") shifts++;
      else if (value.status === "off") off++;
      else unknown++;
    }
    return { employees: preview.employees.length, shifts, off, unknown };
  }, [dayEdits, preview]);

  const boundaryMessage = !activeBoundary
    ? null
    : activeBoundary.status === "loading"
      ? "Kontroluji sedm dní před měsícem a po něm…"
      : activeBoundary.status === "unavailable"
        ? "Stav návaznosti se nepodařilo načíst. Před potvrzením proběhne serverová kontrola."
        : activeBoundary.status === "too_many"
          ? "Stav návaznosti se zde nezobrazuje pro více než 200 zaměstnanců. Před potvrzením proběhne serverová kontrola."
          : `Před měsícem: ${activeBoundary.before ? "k dispozici" : "chybí nebo jsou neúplné"} · Po měsíci: ${activeBoundary.after ? "k dispozici" : "chybí nebo jsou neúplné"}${activeBoundary.after ? "" : " · Budoucí rozpis nemusí existovat; nic se nedoplňuje odhadem."}`;

  return <section className="card roster-history" aria-labelledby="roster-history-title">
    <header className="card__head"><div><span className="roster-history__eyebrow">PODKLADY PRO KONTROLU NÁVAZNOSTI</span><h2 className="card__title" id="roster-history-title">Návaznost směn</h2><p>Načtěte měsíční export, zkontrolujte spárování a uložte jen známé směny a výslovné volno.</p></div></header>
    <div className="roster-history__body">
      <div className="roster-history__notice" role="note"><strong>Soukromí a význam dat</strong><span>CSV se přečte v tomto prohlížeči. Ukládají se pouze zkontrolované buňky a jejich přesné časy. „Dovolená“ a „Nemoc“ se nezamění za volno ani za schválenou absenci. Prázdná buňka zůstává neznámá.</span></div>

      <div className="roster-history__form-row">
        <label className="roster-history__field">Měsíc exportu<input className="input" type="month" value={month} disabled={!canManage || busy || deletingId !== null} onChange={(event) => { setMonth(event.target.value); updateSource(rawText); }} /></label>
        <label className="roster-history__field">Nebo vyberte stažený CSV<input ref={fileInputRef} className="input roster-history__file" type="file" accept=".csv,text/csv" disabled={!canManage || busy || deletingId !== null} onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          if (file.size > 5_000_000) { setError("Soubor je příliš velký; maximální velikost je 5 MB."); event.target.value = ""; return; }
          void file.text().then((text) => updateSource(text, file.name)).catch(() => setError("Soubor se nepodařilo přečíst."));
        }} /></label>
      </div>
      <label className="roster-history__field" htmlFor="roster-history-source">Vložený obsah CSV {fileName ? <span>· {fileName}</span> : null}
        <textarea id="roster-history-source" className="input roster-history__source" value={rawText} disabled={!canManage || busy || deletingId !== null} onChange={(event) => updateSource(event.target.value)} placeholder="Otevřete stažený soubor, zkopírujte celý obsah a vložte jej sem." />
      </label>
      <div className="roster-history__actions"><button type="button" className="btn btn--secondary" disabled={!canManage || busy || deletingId !== null || loading || !rawText.trim() || !month} onClick={createPreview}>Zkontrolovat export</button>{!canManage ? <span>Uložit podklady může pouze manažer.</span> : null}</div>
      {error ? <p className="roster-history__error" role="alert">{error}</p> : null}
      {notice ? <p className="roster-history__success" role="status">{notice}</p> : null}

      {skippedEmployees.length ? <details className="roster-history__skipped">
        <summary>Přeskočené řádky bez shody ({skippedEmployees.length})</summary>
        <p>Tyto řádky nejsou v evidenci zaměstnanců, proto se do podkladů neuloží. Pokud jde o nového zaměstnance, nejprve ho přidejte v sekci Zaměstnanci a export zkontrolujte znovu.</p>
        <ul>{skippedEmployees.map((employee) => {
          const knownDays = Object.values(employee.days).filter((day) => day.status !== "unknown").length;
          return <li key={employee.sourceName}><span>{employee.sourceName}</span><span>{knownDays === 0 ? "bez známých dnů" : `${knownDays} známých dnů`}</span></li>;
        })}</ul>
      </details> : null}

      {preview && counts ? <section className="roster-history__preview" aria-labelledby="roster-preview-title">
        <div className="roster-history__preview-head"><div><h3 id="roster-preview-title">Náhled {month}</h3><p>{counts.employees} řádků zaměstnanců · {counts.shifts} směn · {counts.off} dnů volna · {counts.unknown} neznámých buněk{skippedEmployees.length ? ` · ${skippedEmployees.length} řádků bez shody přeskočeno` : ""}</p></div></div>
        <p className="roster-history__hint">Každý řádek zaměstnance rozbalte. Opravte párování a neznámé buňky. U neznámého času aplikace žádnou směnu sama nevymyslí. Nadpisy pracovních pozic a řádky bez shody se přeskočí; nového zaměstnance nejprve přidejte v sekci Zaměstnanci.</p>
        {preview.employees.map((employee) => {
          const employeeContext = rosterHistoryEmployeeContext(
            employees.find((reference) => reference.id === employeeMapping[employee.sourceName])?.displayName,
            employee.sourceName,
          );
          return <details className="roster-history__employee" key={employee.sourceName}>
          <summary><span>{employee.sourceName}</span><span className="roster-history__summary-actions"><span className={`roster-history__match roster-history__match--${employee.match}`}>{employee.match === "exact" ? "Jednoznačná shoda" : employee.match === "ambiguous" ? "Vyberte osobu" : "Bez shody"}</span>{canManage ? <button type="button" className="roster-history__remove" aria-label={removalActionLabel("Odebrat řádek z náhledu", employee.sourceName)} title="Odebrat řádek z náhledu" disabled={busy || deletingId !== null} onClick={(event) => { event.preventDefault(); event.stopPropagation(); removePreviewEmployee(employee); }}>×</button> : null}</span></summary>
          <label className="roster-history__field">Zaměstnanec<select className="input" value={employeeMapping[employee.sourceName] ?? ""} disabled={!canManage || busy} onChange={(event) => setEmployeeMapping((current) => ({ ...current, [employee.sourceName]: event.target.value }))}>
            <option value="">Vyberte zaměstnance</option>{employees.map((reference) => <option key={reference.id} value={reference.id}>{reference.displayName}</option>)}
          </select></label>
          <div className="roster-history__days">{Object.entries(employee.days).map(([date, day]) => {
            const key = dayKey(employee.sourceName, date);
            const value = dayEdits[key] ?? initialCell(day);
            const dayLabel = day.status === "unknown" ? (day.sourceCell || (day.reason === "blank" ? "Prázdná buňka" : "Nerozpoznaná hodnota")) : day.sourceCell;
            return <div className={`roster-history__day${value.status === "unknown" ? " roster-history__day--unknown" : ""}`} key={date}>
              <strong>{date}</strong><span className="roster-history__source-cell">{dayLabel}</span>
              <label className="roster-history__status">Stav<select className="input" aria-label={rosterHistoryControlLabel("Stav", employeeContext, date)} value={value.status} disabled={!canManage || busy} onChange={(event) => setDayEdits((current) => ({ ...current, [key]: { ...value, status: event.target.value as EditableDay["status"] } }))}>
                <option value="unknown">Neznámý</option><option value="off">Volno</option><option value="shift">Směna</option>
              </select></label>
              {value.status === "shift" ? <div className="roster-history__times"><label>Od<input className="input" type="time" aria-label={rosterHistoryControlLabel("Od, začátek směny", employeeContext, date)} value={value.startTime} disabled={!canManage || busy} onChange={(event) => setDayEdits((current) => ({ ...current, [key]: { ...value, startTime: event.target.value } }))} /></label><label>Do<input className="input" type="time" aria-label={rosterHistoryControlLabel("Do, konec směny", employeeContext, date)} value={value.endTime} disabled={!canManage || busy} onChange={(event) => setDayEdits((current) => ({ ...current, [key]: { ...value, endTime: event.target.value } }))} /></label></div> : null}
            </div>;
          })}</div>
          </details>;
        })}
        {mappingValid ? null : <p className="roster-history__error" role="status">Každý řádek musí být spárován s jiným zaměstnancem.</p>}
        {!editValid ? <p className="roster-history__error" role="status">Doplňte platný čas u každé buňky označené jako směna.</p> : null}
        <div className="roster-history__actions"><button type="button" className="btn btn--primary" disabled={!canManage || busy || deletingId !== null || !mappingValid || !editValid} onClick={() => void savePreview()}>{busy ? "Ukládám…" : "Uložit zkontrolované podklady"}</button><button type="button" className="btn btn--secondary" disabled={busy || deletingId !== null} onClick={clearSource}>Zrušit náhled a vymazat obsah</button></div>
      </section> : null}

      <section className="roster-history__saved" aria-labelledby="roster-saved-title"><h3 id="roster-saved-title">Uložené podklady pro {month}</h3>{importsEmptyMessage ? <p role="status">{importsEmptyMessage}</p> : <ul>{savedImports.map((item) => <li className={canManage ? "roster-history__saved-row roster-history__saved-row--manage" : "roster-history__saved-row"} key={item.id}><span>{item.periodStart} až {item.periodEnd} · verze {item.version}</span><span>{item.employeeCount} osob · {item.knownDayCount} známých dnů</span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("cs-CZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time>{canManage ? <button type="button" className="roster-history__delete" aria-label={removalActionLabel("Smazat podklady", `${item.periodStart} až ${item.periodEnd}, verze ${item.version}`)} title="Smazat podklady" disabled={deletingId !== null || busy} onClick={() => void deleteImport(item)}>{deletingId === item.id ? "…" : "×"}</button> : null}</li>)}</ul>}</section>
      {boundaryMessage ? <div className="roster-history__boundary" role="status"><strong>Stav návaznosti</strong><span>{boundaryMessage}</span></div> : null}
      <p className="roster-history__footnote">Uložení podkladů nemění potvrzený rozpis. Měsíční návrh je při nové kontrole znovu porovná s okolní historií.</p>
    </div>
  </section>;
}
