"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { MonthlyPlanningPanel, type MonthlyView } from "@/components/plan/monthly-planning-panel";
import { MonthlyRosterTable } from "@/components/plan/monthly-roster-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  CZECH_DAYS,
  addDays,
  formatIsoDate,
  getWeekDates,
  weekLabel,
} from "@/lib/demo-data";
import type { MonthlyProviderRuntime } from "@/lib/planning/monthly-runtime";
import type { StaffingSetting } from "@/lib/planning/staffing-settings";
import { selectMonthlyView } from "@/lib/planning/monthly-view";

function isoWeekNumber(date: Date): number {
  const thursday = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  thursday.setUTCDate(thursday.getUTCDate() + 4 - (thursday.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  return Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function currentMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function initialWeekStart(): Date {
  const first = currentMonthStart();
  return addDays(first, -((first.getDay() + 6) % 7));
}

interface PlanWorkspaceProps {
  runtime: MonthlyProviderRuntime;
  canManage: boolean;
  initialStaffing: readonly StaffingSetting[] | null;
}

export function PlanWorkspace({
  runtime,
  canManage,
  initialStaffing,
}: PlanWorkspaceProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => initialWeekStart());
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => currentMonthStart());
  const [draftViews, setDraftViews] = useState<Record<string, MonthlyView>>({});
  const [confirmedViews, setConfirmedViews] = useState<Record<string, MonthlyView | null>>({});
  const [loadErrors, setLoadErrors] = useState<Record<string, boolean>>({});
  const [visitedMonths, setVisitedMonths] = useState<string[]>(() => [monthKey(currentMonthStart())]);
  const onMonthlyResult = useCallback((month: string, result: MonthlyView | null) => {
    setDraftViews((current) => { const next = { ...current }; if (!result || result.confirmed) delete next[month]; else next[month] = result; return next; });
    if (result?.confirmed) setConfirmedViews((current) => ({ ...current, [month]: result }));
    if (result) setLoadErrors((current) => ({ ...current, [month]: false }));
  }, []);

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const monthTitle = new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const monthDays = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const visibleMonthValue = monthKey(visibleMonth);
  const monthlyView = selectMonthlyView(visibleMonthValue, draftViews[visibleMonthValue], confirmedViews[visibleMonthValue]);
  const showingMonthlyView = monthlyView && weekDates.some((date) => formatIsoDate(date).startsWith(`${monthlyView.input.month}-`));
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/planning/monthly?month=${encodeURIComponent(visibleMonthValue)}`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Načtení rozpisu selhalo."); return response.json(); })
      .then((result) => {
        if (!result?.ok) throw new Error("Načtení rozpisu selhalo.");
        setConfirmedViews((current) => ({ ...current, [visibleMonthValue]: result.view ?? null }));
        setLoadErrors((current) => ({ ...current, [visibleMonthValue]: false }));
      })
      .catch(() => { if (!controller.signal.aborted) setLoadErrors((current) => ({ ...current, [visibleMonthValue]: true })); });
    return () => controller.abort();
  }, [visibleMonthValue]);
  function selectCalendarDate(day: number) {
    const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    const mondayOffset = (date.getDay() + 6) % 7;
    setWeekStart(addDays(date, -mondayOffset));
  }

  function moveMonth(delta: number) {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(nextMonth);
    setVisitedMonths((current) => current.includes(monthKey(nextMonth)) ? current : [...current, monthKey(nextMonth)]);
    const firstDay = nextMonth;
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    setWeekStart(addDays(firstDay, -mondayOffset));
  }

  return (
    <div className="planning-screen">
      <div className="planning-heading">
        <h1>Rozpis směn</h1>
        <span>{monthTitle}</span>
      </div>

      <div className="month-strip" role="group" aria-label={`Kalendář, ${monthTitle}`}>
        <button type="button" className="month-strip__nav" onClick={() => moveMonth(-1)} aria-label="Předchozí měsíc">
          <Icon name="chevronLeft" width={18} height={18} />
        </button>
        <div className="month-strip__days">
          {Array.from({ length: monthDays }, (_, index) => {
            const day = index + 1;
            const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
            const weekday = (date.getDay() + 6) % 7;
            const selected = date >= weekDates[0] && date <= weekDates[6];
            const selectedStart = selected && date.getTime() === weekDates[0].getTime();
            const selectedEnd = selected && date.getTime() === weekDates[6].getTime();
            const weekend = weekday >= 5;
            return (
              <button
                key={day}
                type="button"
                className={`month-strip__day${selected ? " month-strip__day--selected" : ""}${selectedStart ? " month-strip__day--selected-start" : ""}${selectedEnd ? " month-strip__day--selected-end" : ""}${weekend ? " month-strip__day--weekend" : ""}`}
                aria-pressed={selected}
                aria-label={`${CZECH_DAYS[weekday]} ${day}. ${visibleMonth.getMonth() + 1}. ${visibleMonth.getFullYear()}`}
                onClick={() => selectCalendarDate(day)}
              >
                <span>{CZECH_DAYS[weekday]}</span>
                <strong>{day}</strong>
              </button>
            );
          })}
        </div>
        <button type="button" className="month-strip__nav" onClick={() => moveMonth(1)} aria-label="Následující měsíc">
          <Icon name="chevronRight" width={18} height={18} />
        </button>
      </div>

      {visitedMonths.map((month) => <div key={month} hidden={month !== visibleMonthValue}><MonthlyPlanningPanel month={month} canManage={canManage} planningMode={runtime.configured ? runtime.mode : null} initialStaffing={initialStaffing} onResult={onMonthlyResult} /></div>)}

      <div className="week-banner">
        <h2>Týden {isoWeekNumber(weekStart)}</h2>
        <p>{weekLabel(weekStart)}</p>
      </div>

      <div className="card schedule-card">
        {loadErrors[visibleMonthValue] && !draftViews[visibleMonthValue] ? (
          <EmptyState icon="box" title="Rozpis se nepodařilo načíst" description="Ověřte připojení a zkuste stránku načíst znovu." />
        ) : showingMonthlyView ? (
          <MonthlyRosterTable view={monthlyView} weekDates={weekDates} />
        ) : (
          <EmptyState
            icon="calendar"
            title="Měsíční rozpis zatím není k dispozici"
            description="Vyplňte vstupy a vytvořte měsíční návrh. Vybraný týden se zobrazí po načtení nebo vytvoření měsíčního rozpisu."
          />
        )}
      </div>


    </div>
  );
}
