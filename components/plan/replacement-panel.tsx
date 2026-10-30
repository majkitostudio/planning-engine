"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import type {
  AssignmentChange,
  ReplacementOption,
  ReplacementRunResult,
  ShiftKind,
} from "@/lib/planning/domain/types";
import type {
  PlanningReplacementApiResponse,
  PlanningReplacementConfirmApiResponse,
} from "@/lib/planning/api-types";

const WEEK_START = "2026-10-05";
const INCIDENT_DATE = "2026-10-06";
const BASE_PROPOSAL_ID = "replacement-base-1";

const EMPLOYEE_LABELS: Record<string, string> = {
  e1: "Syntetický zaměstnanec e1",
  e8: "Syntetický zaměstnanec e8",
};

function assignmentLabel(change: AssignmentChange): string {
  const employee = EMPLOYEE_LABELS[change.assignment.employeeId] ?? change.assignment.employeeId;
  const shift = change.assignment.shiftKind === "morning" ? "ranní" : "odpolední";
  return `${employee} · ${change.assignment.date} · ${shift}`;
}

function validationLabel(option: ReplacementOption): string {
  if (option.status === "valid") return "VALID — připraveno ke kontrole";
  if (isVacationDecisionOnly(option)) return "ČEKÁ NA ROZHODNUTÍ MANAGERA";
  if (option.status === "not_verified") return "NOT VERIFIED — nelze potvrdit";
  return "NEEDS CHANGES — nelze potvrdit";
}

function statusVariant(option: ReplacementOption): "success" | "warning" | "danger" {
  if (option.status === "valid") return "success";
  if (isVacationDecisionOnly(option)) return "warning";
  return option.status === "not_verified" ? "warning" : "danger";
}

function resultMessage(data: PlanningReplacementApiResponse | PlanningReplacementConfirmApiResponse): string {
  if (data.ok) return "";
  return data.rejected.message;
}

function optionSummary(option: ReplacementOption): string {
  const target = option.coverage.find(
    (line) => line.date === INCIDENT_DATE && line.shiftKind === "afternoon",
  );
  if (!target) return "Pokrytí cílové směny nebylo vráceno.";
  return `${target.assignedEmployees}/${target.requiredEmployees} lidí na řešené směně`;
}

function isVacationDecisionOnly(option: ReplacementOption): boolean {
  return (
    option.impact.timeOffChanges.length > 0 &&
    option.impact.timeOffChanges.every((change) => change.kind === "approved_vacation") &&
    option.validation.problems.length > 0 &&
    option.validation.problems.every((problem) => problem.code === "ABSENCE_APPROVED") &&
    option.validation.unverifiedChecks.length === 0
  );
}

function timeOffChangeId(employeeId: string, date: string): string {
  return `${employeeId}|${date}`;
}

export function ReplacementPanel({ enabled }: { enabled: boolean }) {
  const [absentEmployeeId, setAbsentEmployeeId] = useState("e1");
  const [shiftKind, setShiftKind] = useState<ShiftKind>("afternoon");
  const [result, setResult] = useState<ReplacementRunResult | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [acceptedVacationChange, setAcceptedVacationChange] = useState(false);
  const selectedOption = result?.options.find((option) => option.id === selectedOptionId);
  const selectedVacationChanges = selectedOption?.impact.timeOffChanges.filter(
    (change) => change.kind === "approved_vacation",
  ) ?? [];
  const requiresVacationAcceptance = selectedVacationChanges.length > 0;

  async function generateOptions() {
    setIsLoading(true);
    setMessage(null);
    setResult(null);
    setSelectedOptionId(null);
    setAcceptedVacationChange(false);
    setIsConfirmed(false);

    try {
      const response = await fetch("/api/planning/replacement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: WEEK_START,
          baseProposalId: BASE_PROPOSAL_ID,
          incident: {
            id: "incident-1",
            status: "open",
            date: INCIDENT_DATE,
            shiftKind,
            absentEmployeeId,
          },
        }),
      });
      const data = (await response.json()) as PlanningReplacementApiResponse;
      if (!data.ok) {
        setMessage(resultMessage(data));
        return;
      }
      setResult(data.result);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chyba při vytváření variant náhrady.");
    } finally {
      setIsLoading(false);
    }
  }

  async function confirmOption() {
    if (!result || !selectedOptionId) return;

    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/planning/replacement/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          replacementId: result.request.id,
          optionId: selectedOptionId,
          acceptedTimeOffChangeIds: acceptedVacationChange
            ? selectedVacationChanges.map((change) =>
                timeOffChangeId(change.employeeId, change.originalDate),
              )
            : [],
        }),
      });
      const data = (await response.json()) as PlanningReplacementConfirmApiResponse;
      if (!data.ok) {
        setMessage(resultMessage(data));
        return;
      }
      setResult(data.result);
      setIsConfirmed(true);
      setMessage(data.alreadyConfirmed ? "Tato varianta již byla potvrzena." : "Náhrada byla potvrzena jako nová verze týdne.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chyba při potvrzování náhrady.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="planning-result" aria-labelledby="replacement-panel-title">
      <div className="card">
        <div className="card__head card__head--split">
          <div>
            <div className="row" style={{ gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <h2 className="card__title" id="replacement-panel-title" style={{ margin: 0 }}>
                Operativní náhrada směny
              </h2>
              <Badge variant="info" dot={false}>SYNTHETIC PILOT</Badge>
            </div>
            <p className="card__sub" style={{ marginTop: "6px" }}>
              Výpadek celé směny v týdnu 5.–11. 10. 2026. Původní potvrzený plán se před potvrzením nemění.
            </p>
          </div>
          <Badge variant={isConfirmed ? "success" : "warning"} dot={true}>
            {isConfirmed ? "Potvrzená nová verze" : "Návrh — čeká na managera"}
          </Badge>
        </div>

        <div className="card__body">
          <div className="demo-notice" role="note" style={{ marginBottom: "16px" }}>
            <span className="demo-notice__icon" aria-hidden="true">
              <Icon name="info" width={17} height={17} />
            </span>
            <p>
              <strong>Bez potvrzení se nic nemění.</strong> AI pouze navrhne varianty; změny, pokrytí a validaci dopočítá server.
            </p>
          </div>

          <div className="defs" style={{ marginBottom: "16px" }}>
            <div className="def">
              <span className="def__label">Aktuální cílová směna</span>
              <span className="def__value">7/7 · 6 po výpadku</span>
            </div>
            <div className="def">
              <span className="def__label">Základní verze</span>
              <span className="def__value mono">{BASE_PROPOSAL_ID}</span>
            </div>
          </div>

          <div className="row" style={{ gap: "10px", alignItems: "end", flexWrap: "wrap" }}>
            <label className="select" style={{ minWidth: "220px" }}>
              <span className="small muted">Chybějící zaměstnanec</span>
              <select value={absentEmployeeId} onChange={(event) => setAbsentEmployeeId(event.target.value)} disabled={isLoading || isConfirmed}>
                <option value="e1">Syntetický zaměstnanec e1</option>
              </select>
              <span className="select__chevron" aria-hidden="true"><Icon name="chevronDown" width={15} height={15} /></span>
            </label>
            <label className="select" style={{ minWidth: "180px" }}>
              <span className="small muted">Celá směna</span>
              <select value={shiftKind} onChange={(event) => setShiftKind(event.target.value as ShiftKind)} disabled={isLoading || isConfirmed}>
                <option value="afternoon">Úterý · odpolední</option>
              </select>
              <span className="select__chevron" aria-hidden="true"><Icon name="chevronDown" width={15} height={15} /></span>
            </label>
            <button type="button" className="btn btn--primary" onClick={generateOptions} disabled={!enabled || isLoading || isConfirmed} aria-busy={isLoading}>
              {isLoading && !result ? <span className="spinner" aria-hidden="true" /> : <Icon name="sparkles" width={17} height={17} />}
              Vytvořit varianty náhrady
            </button>
          </div>

          {!enabled ? (
            <div style={{ marginTop: "16px" }}>
              <Alert variant="warning">
                <strong>Replacement provider není nakonfigurovaný.</strong> Pro tento syntetický pilot nastavte PLANNING_PROVIDER=simulated.
              </Alert>
            </div>
          ) : null}

          {message ? (
            <div style={{ marginTop: "16px" }}>
              <Alert variant="warning">{message}</Alert>
            </div>
          ) : null}

          {result ? (
            <div className="stack-lg" style={{ marginTop: "20px" }}>
              <div className="row" style={{ justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                <div>
                  <h3 style={{ fontSize: "14px", fontWeight: 600, margin: 0 }}>Varianty náhrady</h3>
                  <p className="small muted" style={{ marginTop: "4px" }}>
                    {result.options.length} variant · stav běhu: {result.completeness === "complete" ? "complete" : "partial"}
                  </p>
                </div>
                <Badge variant={result.completeness === "complete" ? "success" : "warning"} dot={false}>
                  {result.completeness === "complete" ? "3 varianty" : "Méně než 3 varianty"}
                </Badge>
              </div>

              <div className="replacement-options" role="radiogroup" aria-label="Výběr varianty náhrady">
                {result.options.map((option) => (
                  <ReplacementOptionCard
                    key={option.id}
                    option={option}
                    selected={selectedOptionId === option.id}
                    disabled={isConfirmed}
                    onSelect={() => {
                      setSelectedOptionId(option.id);
                      setAcceptedVacationChange(false);
                    }}
                  />
                ))}
              </div>

              {requiresVacationAcceptance ? (
                <label className="check" style={{ display: "flex", gap: "10px", alignItems: "start" }}>
                  <input
                    type="checkbox"
                    checked={acceptedVacationChange}
                    onChange={(event) => setAcceptedVacationChange(event.target.checked)}
                    disabled={isLoading || isConfirmed}
                  />
                  <span>
                    Jako manager potvrzuji, že zaměstnance kontaktuji a výslovně
                    přijímám změnu schválené dovolené. Náhradní volno zatím nemá
                    přiřazené datum a musí se domluvit samostatně.
                  </span>
                </label>
              ) : null}

              <div className="row" style={{ gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
                <button type="button" className="btn btn--primary" onClick={confirmOption} disabled={!selectedOptionId || isLoading || isConfirmed || result.completeness !== "complete" || (requiresVacationAcceptance && !acceptedVacationChange)}>
                  {isLoading ? <span className="spinner" aria-hidden="true" /> : <Icon name="checkCircle" width={17} height={17} />}
                  Potvrdit vybranou variantu jako manager
                </button>
                {result.completeness !== "complete" ? <span className="small muted">Potvrzení je blokované, protože výsledek není kompletní.</span> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ReplacementOptionCard({
  option,
  selected,
  disabled,
  onSelect,
}: {
  option: ReplacementOption;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  return (
    <label className="replacement-option" data-selected={selected ? "true" : "false"}>
      <input type="radio" name="replacement-option" checked={selected} onChange={onSelect} disabled={disabled || (option.status !== "valid" && !isVacationDecisionOnly(option))} />
      <span className="replacement-option__body">
        <span className="row" style={{ justifyContent: "space-between", gap: "8px", alignItems: "start" }}>
          <span>
            <strong>{option.draft.summary}</strong>
            <span className="small muted" style={{ display: "block", marginTop: "4px" }}>
              Kandidát: {EMPLOYEE_LABELS[option.draft.candidateEmployeeId] ?? option.draft.candidateEmployeeId}
            </span>
          </span>
          <Badge variant={statusVariant(option)} dot={false}>{validationLabel(option)}</Badge>
        </span>

        <span className="replacement-option__facts">
          <span><strong>Pokrytí:</strong> {optionSummary(option)}</span>
          <span><strong>Dopad:</strong> {option.impact.kind === "none" ? "bez vedlejší změny" : option.impact.kind === "domino" ? "domino řetězec" : "vedlejší změny"}</span>
          <span><strong>Změny:</strong> {option.changes.filter((change) => change.type !== "unchanged").length}</span>
        </span>

        <span className="small muted">{option.draft.rationale}</span>

        {option.changes.some((change) => change.type !== "unchanged") ? (
          <span className="replacement-option__changes">
            {option.changes.filter((change) => change.type !== "unchanged").map((change, index) => (
              <span key={`${change.type}-${change.assignment.employeeId}-${change.assignment.date}-${index}`}>
                <Badge variant={change.type === "removed" ? "danger" : "info"} dot={false}>{change.type === "removed" ? "ODEBRAT" : "PŘIDAT"}</Badge>{" "}
                {assignmentLabel(change)}
              </span>
            ))}
          </span>
        ) : null}

        {option.impact.dominoChain.length > 0 ? (
          <span className="small muted">Domino řetězec: {option.impact.dominoChain.map((assignment) => assignment.employeeId).join(" → ")}</span>
        ) : null}

        {option.impact.timeOffChanges.map((change) => (
          <span className="small muted" key={`${change.employeeId}-${change.originalDate}`}>
            Změna volna: {EMPLOYEE_LABELS[change.employeeId] ?? change.employeeId} · {change.originalDate} · schválená dovolená;
            náhradní volno zatím bez přiřazeného data.
          </span>
        ))}

        {option.draft.tradeOffs?.map((tradeOff) => <span className="small muted" key={tradeOff}>Kompromis: {tradeOff}</span>)}
        {option.impact.unverifiedReasons.map((reason) => <span className="small muted" key={reason}>NOT VERIFIED: {reason}</span>)}
        {option.validation.unverifiedChecks.map((check) => <span className="small muted" key={`${check.code}-${check.message}`}>NOT VERIFIED: {check.message}</span>)}
        {option.validation.problems.map((problem) => <span className="small" style={{ color: "var(--red)" }} key={`${problem.code}-${problem.message}`}>{problem.message}</span>)}
      </span>
    </label>
  );
}
