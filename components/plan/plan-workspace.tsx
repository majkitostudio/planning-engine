"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { MonthlyPlanningPanel, type MonthlyView } from "@/components/plan/monthly-planning-panel";
import { MonthlyRosterTable } from "@/components/plan/monthly-roster-table";
import { EmptyState } from "@/components/ui/empty-state";
import type { MonthlyProviderRuntime } from "@/lib/planning/monthly-runtime";
import type {
  StaffingProfileStatus,
  StaffingSetting,
} from "@/lib/planning/staffing-settings";
import { selectMonthlyView } from "@/lib/planning/monthly-view";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

interface PlanWorkspaceProps {
  runtime: MonthlyProviderRuntime;
  canManage: boolean;
  formOwnerId: string | null;
  initialStaffing: readonly StaffingSetting[] | null;
  staffingProfileStatus: StaffingProfileStatus;
}

export function PlanWorkspace({
  runtime,
  canManage,
  formOwnerId,
  initialStaffing,
  staffingProfileStatus,
}: PlanWorkspaceProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => currentMonthStart());
  const [draftViews, setDraftViews] = useState<Record<string, MonthlyView>>({});
  const [confirmedViews, setConfirmedViews] = useState<Record<string, MonthlyView | null>>({});
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
  const [visitedMonths, setVisitedMonths] = useState<string[]>(() => [monthKey(currentMonthStart())]);
  const loadRevision = useRef(0);
  const onMonthlyResult = useCallback((month: string, result: MonthlyView | null) => {
    setDraftViews((current) => { const next = { ...current }; if (!result || result.confirmed) delete next[month]; else next[month] = result; return next; });
    if (result?.confirmed) setConfirmedViews((current) => ({ ...current, [month]: result }));
    if (result) setLoadErrors((current) => ({ ...current, [month]: false }));
  }, []);
  const onMonthlyRemoved = useCallback((month: string, id: string) => {
    loadRevision.current++;
    setDraftViews((current) => { if (current[month]?.id !== id) return current; const next = { ...current }; delete next[month]; return next; });
    setConfirmedViews((current) => current[month]?.id === id ? { ...current, [month]: null } : current);
  }, []);

  const monthTitle = new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const visibleMonthValue = monthKey(visibleMonth);
  const monthlyView = selectMonthlyView(visibleMonthValue, draftViews[visibleMonthValue], confirmedViews[visibleMonthValue]);
  useEffect(() => {
    const controller = new AbortController();
    const revision = loadRevision.current;
    void fetch(`/api/planning/monthly?month=${encodeURIComponent(visibleMonthValue)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Načtení rozpisu selhalo."); return response.json(); })
      .then((result) => {
        if (loadRevision.current !== revision) return;
        if (!result?.ok) throw new Error("Načtení rozpisu selhalo.");
        setConfirmedViews((current) => ({ ...current, [visibleMonthValue]: result.view ?? null }));
        setLoadErrors((current) => ({ ...current, [visibleMonthValue]: false }));
      })
      .catch(() => { if (!controller.signal.aborted && loadRevision.current === revision) setLoadErrors((current) => ({ ...current, [visibleMonthValue]: true })); });
    return () => controller.abort();
  }, [visibleMonthValue]);
  function moveMonth(delta: number) {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(nextMonth);
    setVisitedMonths((current) => current.includes(monthKey(nextMonth)) ? current : [...current, monthKey(nextMonth)]);
  }

  return (
    <div className="planning-screen">
      <div className="planning-heading">
        <h1>Rozpis směn</h1>
      </div>

      <div className="month-strip" role="group" aria-label="Výběr měsíce">
        <button type="button" className="month-strip__nav" onClick={() => moveMonth(-1)} aria-label="Předchozí měsíc">
          <Icon name="chevronLeft" width={18} height={18} />
        </button>
        <p className="month-strip__title" aria-live="polite">{monthTitle}</p>
        <button type="button" className="month-strip__nav" onClick={() => moveMonth(1)} aria-label="Následující měsíc">
          <Icon name="chevronRight" width={18} height={18} />
        </button>
      </div>

      {visitedMonths.map((month) => <div key={month} hidden={month !== visibleMonthValue}><MonthlyPlanningPanel key={`${formOwnerId ?? "anonymous"}:${canManage}`} month={month} canManage={canManage} formOwnerId={formOwnerId} planningMode={runtime.configured ? runtime.mode : null} initialStaffing={initialStaffing} staffingProfileStatus={staffingProfileStatus} onResult={onMonthlyResult} onRemoved={onMonthlyRemoved} /></div>)}

      <div className="card schedule-card">
        {loadErrors[visibleMonthValue] && !draftViews[visibleMonthValue] ? (
          <EmptyState icon="box" title="Rozpis se nepodařilo načíst" description="Ověřte připojení a zkuste stránku načíst znovu." />
        ) : monthlyView ? (
          <MonthlyRosterTable view={monthlyView} />
        ) : (
          <EmptyState
            icon="calendar"
            title="Měsíční rozpis zatím není k dispozici"
            description="Vyplňte vstupy a vytvořte měsíční návrh. Celý měsíc se zobrazí po načtení nebo vytvoření rozpisu."
          />
        )}
      </div>


    </div>
  );
}
