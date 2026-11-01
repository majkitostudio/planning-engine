"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/icons";
import { RosterTable } from "@/components/plan/roster-table";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import { PlanningResult } from "@/components/plan/planning-result";
import { ReplacementPanel } from "@/components/plan/replacement-panel";
import type { PlanningRunView, PlanningFailureView } from "@/lib/planning/view-model";
import {
  DEMO_ABSENCES,
  DEMO_ALERTS,
  DEMO_EMPLOYEES,
  DEMO_FREQUENT,
  DEMO_OVERVIEW,
  DEMO_REQUESTS,
  DEMO_STATS,
  DEMO_WEEK_START,
  CZECH_DAYS,
  SHIFT_META,
  addDays,
  formatIsoDate,
  getWeekDates,
  isSupportedDemoWeek,
  shiftCount,
  weekLabel,
  type ShiftKind,
} from "@/lib/demo-data";
import type { PlanningRuntime } from "@/lib/planning/server-config";
import type { SimulatedScenarioSummary } from "@/lib/planning/simulated/scenarios";
import type { ReplacementTargetSummary } from "@/lib/planning/replacement-service";

const TABS = [
  { key: "smeny", label: "Směny" },
  { key: "pozadavky", label: "Požadavky", count: 12 },
  { key: "absence", label: "Absence", count: 3 },
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

interface PlanWorkspaceProps {
  runtime: PlanningRuntime;
  replacementTargetSummary: ReplacementTargetSummary | null;
}

export function PlanWorkspace({
  runtime,
  replacementTargetSummary,
}: PlanWorkspaceProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => DEMO_WEEK_START);
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => DEMO_WEEK_START);
  const [tab, setTab] = useState<TabKey>("smeny");
  const [query, setQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<"all" | ShiftKind>("all");
  const [notice, setNotice] = useState<string | null>(null);

  // Planning result state
  const [planningView, setPlanningView] = useState<PlanningRunView | null>(null);
  const [planningFailure, setPlanningFailure] = useState<PlanningFailureView | null>(null);
  const [isPlanningLoading, setIsPlanningLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>("complete");

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const monthTitle = new Intl.DateTimeFormat("cs-CZ", {
    month: "long",
    year: "numeric",
  }).format(visibleMonth);
  const monthDays = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const isSupportedWeek = isSupportedDemoWeek(weekDates[0]);
  const unsupportedWeekNotice = `DEMO: Simulovaný běh je dostupný jen pro týden ${weekLabel(DEMO_WEEK_START)}. Zvolený týden lze prohlížet, ale nelze ho naplánovat.`;

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

  function moveWeek(delta: number) {
    const nextWeek = addDays(weekStart, delta * 7);
    setWeekStart(nextWeek);
    setVisibleMonth(nextWeek);
    setPlanningView(null);
    setPlanningFailure(null);
    setNotice(null);
  }

  function selectCalendarDate(day: number) {
    const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day);
    const mondayOffset = (date.getDay() + 6) % 7;
    setWeekStart(addDays(date, -mondayOffset));
    setPlanningView(null);
    setPlanningFailure(null);
    setNotice(null);
  }

  function moveMonth(delta: number) {
    const nextMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + delta, 1);
    setVisibleMonth(nextMonth);
    const firstDay = nextMonth;
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    setWeekStart(addDays(firstDay, -mondayOffset));
    setPlanningView(null);
    setPlanningFailure(null);
    setNotice(null);
  }

  async function runPlanning() {
    if (!runtime.configured) {
      setNotice("Plánování není nakonfigurované. Nastavte PLANNING_PROVIDER.");
      return;
    }

    if (!isSupportedWeek) {
      setNotice(unsupportedWeekNotice);
      return;
    }

    setIsPlanningLoading(true);
    setPlanningView(null);
    setPlanningFailure(null);
    setNotice(null);

    try {
      const response = await fetch("/api/planning/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: selectedScenario,
          weekStart: formatIsoDate(weekDates[0]),
        }),
      });

      const data = await response.json();

      if (data.ok && data.view) {
        setPlanningView(data.view);
      } else if (data.failure) {
        setPlanningFailure(data.failure);
      } else if (data.rejected) {
        setPlanningFailure({
          code: data.rejected.code,
          title: data.rejected.code,
          message: data.rejected.message,
          details: data.rejected.blockers
            ? { blockers: data.rejected.blockers }
            : undefined,
        });
      }
    } catch (error) {
      setPlanningFailure({
        code: "ai_failed",
        title: "Síťová chyba",
        message: error instanceof Error ? error.message : "Neznámá chyba při volání API.",
      });
    } finally {
      setIsPlanningLoading(false);
    }
  }

  async function confirmPlanning(proposalId: string) {
    setIsPlanningLoading(true);
    try {
      const response = await fetch("/api/planning/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });

      const data = await response.json();

      if (data.ok && data.view) {
        setPlanningView(data.view);
        if (!data.alreadyConfirmed) {
          setNotice("Návrh byl úspěšně potvrzen.");
        }
      } else if (data.rejected) {
        setNotice(data.rejected.message);
      }
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Chyba při potvrzování návrhu.",
      );
    } finally {
      setIsPlanningLoading(false);
    }
  }

  function onTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + TABS.length) % TABS.length;
    setTab(TABS[nextIndex].key);
    document.getElementById(`tab-${TABS[nextIndex].key}`)?.focus();
  }

  const scenarios: readonly SimulatedScenarioSummary[] = runtime.configured
    ? runtime.scenarios
    : [];

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

      <details className="planning-disclosure">
        <summary>
          <Icon name="chevronRight" width={18} height={18} />
          Generace rozpisu směn
        </summary>
        <div className="planning-disclosure__body">
          <div className="page-head">
        <div className="page-head__lead">
          <span className="page-head__icon" aria-hidden="true">
            <Icon name="calendar" width={22} height={22} />
          </span>
          <div>
            <h1 className="page-head__title">Plán směn</h1>
            <p className="page-head__sub">
              Připravte návrh směn pro vybraný týden z dostupných vstupů.
              AI zohlední zaměstnance, absence, požadavky a potřebné obsazení.
            </p>
          </div>
        </div>

        <div className="page-head__actions">
          <div className="period" role="group" aria-label="Plánovací týden">
            <span className="period__icon" aria-hidden="true">
              <Icon name="calendar" width={17} height={17} />
            </span>
            <span className="period__label" aria-live="polite">
              {weekLabel(weekStart)}
            </span>
            <button
              type="button"
              className="period__btn"
              aria-label="Předchozí týden"
              onClick={() => moveWeek(-1)}
            >
              <Icon name="chevronLeft" width={16} height={16} />
            </button>
            <button
              type="button"
              className="period__btn"
              aria-label="Následující týden"
              onClick={() => moveWeek(1)}
            >
              <Icon name="chevronRight" width={16} height={16} />
            </button>
          </div>
        </div>
          </div>

          <div className="demo-notice" role="note">
        <span className="demo-notice__icon" aria-hidden="true">
          <Icon name="info" width={17} height={17} />
        </span>
        <p>
          <strong>Demonstrační data.</strong> Jména, počty i přiřazení jsou
          smyšlené ukázky. Výsledek není platný ani schválený rozpis.
        </p>
          </div>

          {notice ? (
        <div className="notice-block">
          <Alert variant="warning">
            <strong>Upozornění.</strong> {notice}
          </Alert>
        </div>
          ) : null}

      {/* Planning Result Section - NEW */}
          <PlanningResult
        view={planningView}
        failure={planningFailure}
        onConfirm={confirmPlanning}
        onRun={runPlanning}
        scenarios={scenarios}
        selectedScenario={selectedScenario}
        setSelectedScenario={setSelectedScenario}
        isLoading={isPlanningLoading}
        runtimeNotice={
          isSupportedWeek
            ? runtime.configured
              ? runtime.notice
              : runtime.reason
            : unsupportedWeekNotice
        }
        providerMode={runtime.configured ? runtime.mode : "simulated"}
          />

          <ReplacementPanel
        enabled={runtime.configured && runtime.mode === "simulated"}
        targetSummary={replacementTargetSummary}
          />
        </div>
      </details>

      <div className="week-banner">
        <h2>Týden {isoWeekNumber(weekStart)}</h2>
        <p>{weekLabel(weekStart)}</p>
      </div>

      <div className="card schedule-card">
        {filteredEmployees.length > 0 ? (
          <RosterTable employees={filteredEmployees} weekDates={weekDates} />
        ) : (
          <EmptyState
            icon="search"
            title="Nikdo neodpovídá filtru"
            description="Upravte hledání nebo filtr v části Filtry a další přehledy."
          />
        )}
        <p className="table-note">
          Ukázková data · přiřazení směn se s volbou týdne nemění.
        </p>
      </div>

      <details className="schedule-details">
        <summary>
          <Icon name="chevronRight" width={18} height={18} />
          Filtry, další přehledy a upozornění
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
                    {"count" in item ? (
                      <span className="tab__count">{item.count}</span>
                    ) : null}
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
                  onClick={() =>
                    setNotice(
                      "Export bude dostupný po napojení databáze. Nyní jde o ukázkové rozhraní.",
                    )
                  }
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
                  ? `${filteredEmployees.length} z ${DEMO_EMPLOYEES.length} zaměstnanců`
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
                  Ukázková data · seznam není vázán na zvolený týden · nejde o
                  skutečné požadavky zaměstnanců.
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
                  Ukázková data · seznam není vázán na zvolený týden · nejde o
                  skutečné absence.
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
                  Ukázkový seznam · nejde o skutečné zaměstnance.
                </p>
              </div>
            ) : null}
          </div>

          <div className="footer-status">
            <span>Ukázková data · neproběhl skutečný výpočet</span>
            <span className="footer-status__right">
              <span className="footer-status__dot footer-status__dot--amber" aria-hidden="true" />
              Jádro je hotové, UI napojené na orchestrátor (Fáze 2)
            </span>
          </div>
        </div>

        <aside className="plan-rail" aria-label="Přehledy a upozornění">
          <section className="card" aria-labelledby="rail-overview">
            <div className="card__head">
              <div>
                <h2 className="card__title" id="rail-overview">
                  Rychlý přehled
                </h2>
                <p className="card__sub">Ukázkové souhrny</p>
              </div>
              <span className="card__head-icon" aria-hidden="true">
                <Icon name="dashboard" width={18} height={18} />
              </span>
            </div>
            <div className="rail-list">
              {DEMO_OVERVIEW.map((row) => (
                <div className="rail-row" key={row.label}>
                  <span
                    className={`rail-row__icon rail-row__icon--${row.tone}`}
                    aria-hidden="true"
                  >
                    <Icon name={row.icon} width={15} height={15} />
                  </span>
                  <span className="rail-row__label">{row.label}</span>
                  <span className="rail-row__value">{row.value}</span>
                  {row.delta ? (
                    <span className={`rail-row__delta delta--${row.trend}`}>
                      {row.delta}
                    </span>
                  ) : (
                    <span className="rail-row__arrow" aria-hidden="true">
                      <Icon name="chevronRight" width={15} height={15} />
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section
            className="card card--alert"
            id="upozorneni"
            aria-labelledby="rail-alerts"
          >
            <div className="card__head">
              <div>
                <h2 className="card__title" id="rail-alerts">
                  Aktuální upozornění
                </h2>
                <p className="card__sub">Ukázková data</p>
              </div>
              <Badge variant="danger" dot={false}>
                7
              </Badge>
            </div>
            <div className="alert-list">
              {DEMO_ALERTS.map((alert) => (
                <div className="alert-item" key={alert.label}>
                  <Icon name="alert" width={15} height={15} />
                  <span className="alert-item__label">{alert.label}</span>
                  <span className="alert-item__count">{alert.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card" aria-labelledby="rail-frequent">
            <div className="card__head">
              <div>
                <h2 className="card__title" id="rail-frequent">
                  Nejčastější požadavky
                </h2>
                <p className="card__sub">Ukázkové souhrny</p>
              </div>
              <span className="card__head-icon" aria-hidden="true">
                <Icon name="users" width={18} height={18} />
              </span>
            </div>
            <div className="rail-list">
              {DEMO_FREQUENT.map((row) => (
                <div className="rail-row" key={row.label}>
                  <span
                    className={`rail-row__icon rail-row__icon--${row.tone}`}
                    aria-hidden="true"
                  >
                    <Icon name={row.icon} width={15} height={15} />
                  </span>
                  <span className="rail-row__label">{row.label}</span>
                  <span className="rail-row__value">{row.value}</span>
                  <span className={`rail-row__delta delta--${row.trend}`}>
                    {row.delta}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="ai-card" aria-labelledby="rail-ai">
            <div className="ai-card__head">
              <span className="ai-card__icon" aria-hidden="true">
                <Icon name="sparkles" width={16} height={16} />
              </span>
              <h2 className="ai-card__title" id="rail-ai">
                Plánovací asistent
              </h2>
              <Badge variant={runtime.configured ? "success" : "warning"} dot={false}>
                {runtime.configured ? "Aktivní" : "Nekonfigurovaný"}
              </Badge>
            </div>
            <p className="ai-card__text">
              {runtime.configured
                ? `${runtime.mode === "simulated" ? "Ukázka používá připravená data" : "Reálné volání Gemini (NOT VERIFIED)"}. Vyberte případ a spusťte návrh.`
                : "Ukázka není připravená. Pro spuštění dema nastavte režim simulated."}
            </p>
            {runtime.configured && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={runPlanning}
                disabled={isPlanningLoading}
              >
                <Icon name="sparkles" width={17} height={17} />
                Spustit ukázku
              </button>
            )}
          </section>
        </aside>
      </div>

      <div className="stat-grid">
        {DEMO_STATS.map((stat) => (
          <StatCard
            key={stat.key}
            icon={stat.icon}
            tone={stat.tone}
            label={stat.label}
            value={stat.value}
            meta={stat.meta}
            trend={stat.trend}
            detailHref={stat.detail ? "#upozorneni" : undefined}
          />
        ))}
      </div>
      </details>
    </div>
  );
}
