"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icons";
import { MonthlyPlanningPanel, type MonthlyView } from "@/components/plan/monthly-planning-panel";
import { MonthlyRosterTable } from "@/components/plan/monthly-roster-table";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  DEMO_ABSENCES,
  DEMO_EMPLOYEES,
  DEMO_REQUESTS,
  CZECH_DAYS,
  SHIFT_META,
  addDays,
  formatIsoDate,
  getWeekDates,
  shiftCount,
  weekLabel,
  type ShiftKind,
} from "@/lib/demo-data";
import type { MonthlyProviderRuntime } from "@/lib/planning/monthly-runtime";
import type { StaffingSetting } from "@/lib/planning/staffing-settings";
import { selectMonthlyView } from "@/lib/planning/monthly-view";

const TABS = [
  { key: "smeny", label: "Směny" },
  { key: "pozadavky", label: "Požadavky" },
  { key: "absence", label: "Absence" },
  { key: "zamestnanci", label: "Zaměstnanci" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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
  const [tab, setTab] = useState<TabKey>("smeny");
  const [query, setQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<"all" | ShiftKind>("all");
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
  const normalizedQuery = query.trim().toLowerCase();

  const filteredEmployees = DEMO_EMPLOYEES.filter((employee) => {
    const matchesQuery =
      !normalizedQuery ||
      employee.name.toLowerCase().includes(normalizedQuery) ||
      employee.role.toLowerCase().includes(normalizedQuery);
    const matchesShift =
      shiftFilter === "all" || employee.shifts.includes(shiftFilter);
    return matchesQuery && matchesShift;
  });

  const filteredRequests = DEMO_REQUESTS.filter(
    (request) =>
      !normalizedQuery ||
      request.employee.toLowerCase().includes(normalizedQuery) ||
      request.type.toLowerCase().includes(normalizedQuery),
  );

  const filteredAbsences = DEMO_ABSENCES.filter(
    (absence) =>
      !normalizedQuery ||
      absence.employee.toLowerCase().includes(normalizedQuery) ||
      absence.type.toLowerCase().includes(normalizedQuery),
  );

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

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + TABS.length) % TABS.length;
    setTab(TABS[nextIndex].key);
    document.getElementById(`tab-${TABS[nextIndex].key}`)?.focus();
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

      {visitedMonths.map((month) => <div key={month} hidden={month !== visibleMonthValue}><MonthlyPlanningPanel month={month} canManage={canManage} simulated={runtime.configured && runtime.mode === "simulated"} initialStaffing={initialStaffing} weekDates={weekDates.map(formatIsoDate)} onResult={onMonthlyResult} /></div>)}

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

      <details className="schedule-details">
        <summary>
          <Icon name="chevronRight" width={18} height={18} />
          Filtry a doplňující ukázkové přehledy
        </summary>
      <div className="layout-2col">
        <div className="plan-main">
          <div className="card">
            <div className="card__head card__head--split">
              <div className="tabs" role="tablist" aria-label="Zobrazení plánu">
                {TABS.map((item, index) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    id={`tab-${item.key}`}
                    aria-selected={tab === item.key}
                    aria-controls={`panel-${item.key}`}
                    tabIndex={tab === item.key ? 0 : -1}
                    className="tab"
                    onClick={() => setTab(item.key)}
                    onKeyDown={(event) => onTabKeyDown(event, index)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="toolbar">
                {tab === "smeny" ? (
                  <label className="select">
                    <span className="sr-only">Filtr typu směny</span>
                    <select
                      value={shiftFilter}
                      onChange={(event) =>
                        setShiftFilter(event.target.value as "all" | ShiftKind)
                      }
                    >
                      <option value="all">Všechny směny</option>
                      {(Object.keys(SHIFT_META) as ShiftKind[]).map((kind) => (
                        <option key={kind} value={kind}>
                          {SHIFT_META[kind].option}
                        </option>
                      ))}
                    </select>
                    <span className="select__chevron" aria-hidden="true">
                      <Icon name="chevronDown" width={15} height={15} />
                    </span>
                  </label>
                ) : null}

                <button
                  type="button"
                  className="icon-btn icon-btn--bordered"
                  aria-label="Export (připravované)"
                  title="Export bude dostupný po napojení dat"
                  disabled
                >
                  <Icon name="download" width={17} height={17} />
                </button>
              </div>
            </div>

            <div className="table-toolbar">
              <label className="search">
                <Icon name="search" width={17} height={17} />
                <span className="sr-only">Hledat zaměstnance</span>
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Hledat zaměstnance…"
                />
              </label>
              <span className="table-toolbar__meta" aria-live="polite">
                {tab === "smeny"
                  ? `${filteredEmployees.length} výsledků v syntetickém seznamu`
                  : null}
              </span>
            </div>

            {tab === "smeny" ? (
              <div role="tabpanel" id="panel-smeny" aria-labelledby="tab-smeny">
                <p className="table-note">
                  Rozpis směn je zobrazen nad touto částí. Hledání a filtr typu
                  směny upravují jeho řádky.
                </p>
              </div>
            ) : null}

            {tab === "pozadavky" ? (
              <div
                role="tabpanel"
                id="panel-pozadavky"
                aria-labelledby="tab-pozadavky"
              >
                {filteredRequests.length > 0 ? (
                  <ul className="data-list">
                    {filteredRequests.map((request) => (
                      <li className="data-row" key={request.id}>
                        <Avatar
                          name={request.employee}
                          color={request.color}
                          size="sm"
                        />
                        <span className="data-row__main">
                          <span className="data-row__title">
                            {request.employee}
                          </span>
                          <span className="data-row__sub">
                            Ukázkový požadavek
                          </span>
                        </span>
                        <span className="data-row__tag">{request.type}</span>
                        <span className="data-row__meta">{request.term}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon="search"
                    title="Žádný požadavek neodpovídá hledání"
                    description="Zkuste jiné jméno nebo typ požadavku."
                  />
                )}
                <p className="table-note">
                  Syntetické ukázkové požadavky · nejsou načtené z uložených záznamů.
                </p>
              </div>
            ) : null}

            {tab === "absence" ? (
              <div role="tabpanel" id="panel-absence" aria-labelledby="tab-absence">
                {filteredAbsences.length > 0 ? (
                  <ul className="data-list">
                    {filteredAbsences.map((absence) => (
                      <li className="data-row" key={absence.id}>
                        <Avatar
                          name={absence.employee}
                          color={absence.color}
                          size="sm"
                        />
                        <span className="data-row__main">
                          <span className="data-row__title">
                            {absence.employee}
                          </span>
                          <span className="data-row__sub">Ukázková absence</span>
                        </span>
                        <span className="data-row__tag">{absence.type}</span>
                        <span className="data-row__meta">{absence.term}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon="search"
                    title="Žádná absence neodpovídá hledání"
                    description="Zkuste jiné jméno nebo typ absence."
                  />
                )}
                <p className="table-note">
                  Syntetické ukázkové absence · nejsou načtené z uložených záznamů.
                </p>
              </div>
            ) : null}

            {tab === "zamestnanci" ? (
              <div
                role="tabpanel"
                id="panel-zamestnanci"
                aria-labelledby="tab-zamestnanci"
              >
                {filteredEmployees.length > 0 ? (
                  <ul className="data-list">
                    {filteredEmployees.map((employee) => (
                      <li className="data-row" key={employee.id}>
                        <Avatar name={employee.name} color={employee.color} size="sm" />
                        <span className="data-row__main">
                          <span className="data-row__title">{employee.name}</span>
                          <span className="data-row__sub">{employee.role}</span>
                        </span>
                        <span className="data-row__tag">
                          {shiftCount(employee.shifts)} směn
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState
                    icon="search"
                    title="Nikdo neodpovídá hledání"
                    description="Zkuste jiné jméno nebo roli."
                  />
                )}
                <p className="table-note">
                  Syntetický ukázkový seznam · skutečné záznamy se spravují samostatně.
                </p>
              </div>
            ) : null}
          </div>

          <div className="footer-status">
            <span>Rozpis se zobrazuje z měsíčního návrhu; tato obrazovka nespouští nový výpočet.</span>
            <span className="footer-status__right">
              <span className="footer-status__dot footer-status__dot--amber" aria-hidden="true" />
              Souvislý měsíční průchod: NOT VERIFIED
            </span>
          </div>
        </div>

        <aside className="plan-rail" aria-label="Stav plánovacího asistenta">
        <section className="ai-card" aria-labelledby="rail-ai">
          <div className="ai-card__head">
            <span className="ai-card__icon" aria-hidden="true"><Icon name="sparkles" width={16} height={16} /></span>
            <h2 className="ai-card__title" id="rail-ai">Plánování směn</h2>
            <Badge variant={runtime.configured ? "success" : "warning"} dot={false}>{runtime.configured ? (runtime.mode === "simulated" ? "Simulovaný režim" : runtime.mode === "ortools" ? "Lokální plánovač · neověřeno" : "AI nakonfigurována · neověřeno") : "Nekonfigurováno"}</Badge>
          </div>
          <p className="ai-card__text">{runtime.configured ? (runtime.mode === "simulated" ? "Návrh používá simulované scénáře; nejde o skutečné plánování." : runtime.mode === "ortools" ? "Návrh sestaví místní plánovač. Kvalita ani vhodnost pravidel pro provoz nejsou ověřené." : "Měsíční návrh lze odeslat nakonfigurované AI. Kvalita výstupu pro provoz není ověřená.") : "Měsíční návrh zatím nelze vytvořit. Formulář zůstává dostupný pro přípravu vstupů."}</p>
        </section>
      </aside>
      </div>
      </details>
    </div>
  );
}
