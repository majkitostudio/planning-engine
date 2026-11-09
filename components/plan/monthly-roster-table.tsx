import { CZECH_DAYS } from "@/lib/demo-data";
import { monthlyRosterCaption } from "@/lib/planning/monthly-view";
import { getConfirmedShiftWindow } from "@/lib/planning/domain/confirmed";
import { datesInMonth } from "@/lib/planning/domain/month";
import { isWeekendDate, weekdayIndex } from "@/lib/planning/domain/time";
import type { MonthlyView } from "./monthly-planning-panel";

const WEEKDAY_NAMES = ["pondělí", "úterý", "středa", "čtvrtek", "pátek", "sobota", "neděle"];

export function MonthlyRosterTable({ view }: { view: MonthlyView }) {
  const dates = datesInMonth(view.input.month);
  const assignmentsByCell = new Map<string, typeof view.draft.assignments>();
  for (const assignment of view.draft.assignments) {
    const key = `${assignment.employeeId}|${assignment.date}`;
    assignmentsByCell.set(key, [...(assignmentsByCell.get(key) ?? []), assignment]);
  }
  const historyByCell = new Map(
    (view.input.rosterHistory?.days ?? []).map((entry) => [`${entry.employeeId}|${entry.date}`, entry]),
  );
  const completeAndValidated = !view.input.planningRange
    && view.validation.status === "valid"
    && view.validation.canConfirm;

  return <div className="monthly-roster">
    <div className="monthly-roster__legend" aria-label="Legenda rozpisu">
      <span><b className="monthly-roster__key monthly-roster__key--morning">R</b> Ranní</span>
      <span><b className="monthly-roster__key monthly-roster__key--afternoon">O</b> Odpolední</span>
      <span><b className="monthly-roster__key monthly-roster__key--off">V</b> Volno</span>
      <span><b className="monthly-roster__key monthly-roster__key--unknown">?</b> Neznámé / nedokončené</span>
    </div>
    <div className="table-wrap monthly-roster__scroll" role="region" aria-label={`Měsíční rozpis ${view.input.month}`} tabIndex={0}>
      <table className="roster roster--monthly">
        <caption>{monthlyRosterCaption({ confirmed: view.confirmed ?? false, month: view.input.month, mode: view.mode })}</caption>
        <thead><tr>
          <th scope="col" className="roster__employee-col">Zaměstnanec</th>
          {dates.map((date) => {
            const weekday = weekdayIndex(date);
            return <th key={date} scope="col" className={`roster__day${isWeekendDate(date) ? " roster__day--weekend" : ""}${weekday === 0 ? " roster__day--week-start" : ""}`} aria-label={`${WEEKDAY_NAMES[weekday]} ${date}`}>
              <span className="roster__day-name">{CZECH_DAYS[weekday]}</span>
              <span className="roster__day-date">{Number(date.slice(-2))}.</span>
            </th>;
          })}
        </tr></thead>
        <tbody>{view.input.employees.map((employee) => <tr key={employee.id}>
          <th scope="row" className="roster__employee-col">{employee.displayName}</th>
          {dates.map((date) => {
            const weekday = weekdayIndex(date);
            const key = `${employee.id}|${date}`;
            const items = assignmentsByCell.get(key) ?? [];
            const range = view.input.planningRange;
            const outsideRange = Boolean(range && (date < range.startDate || date > range.endDate));
            const fixed = outsideRange ? historyByCell.get(key) : undefined;
            const className = `roster__cell${isWeekendDate(date) ? " roster__cell--weekend" : ""}${weekday === 0 ? " roster__cell--week-start" : ""}`;

            if (fixed?.status === "shift") {
              const shiftLabel = fixed.shiftKind === "morning" ? "Ranní" : fixed.shiftKind === "afternoon" ? "Odpolední" : "Převzatá směna";
              return <td key={date} className={className}><span className="monthly-roster__cell monthly-roster__cell--fixed" aria-label={`${shiftLabel}, převzatá směna`} title={`Převzatá směna ${fixed.startTime}–${fixed.endTime}`}>{fixed.shiftKind === "morning" ? "R" : fixed.shiftKind === "afternoon" ? "O" : "P"}</span></td>;
            }
            if (fixed?.status === "off") {
              return <td key={date} className={className}><span className="monthly-roster__cell monthly-roster__cell--off" aria-label="Převzaté volno" title="Převzaté volno">V</span></td>;
            }
            if (outsideRange || fixed?.status === "conflict") {
              return <td key={date} className={className}><span className="monthly-roster__cell monthly-roster__cell--unknown" aria-label={fixed?.status === "conflict" ? "Rozpor v podkladech" : "Mimo rozsah návrhu, stav neznámý"} title={fixed?.status === "conflict" ? "Rozpor v podkladech" : "Mimo rozsah návrhu, stav neznámý"}>?</span></td>;
            }
            if (items.length > 0) {
              const labels = items.map((item) => {
                const window = getConfirmedShiftWindow(item.shiftKind, isWeekendDate(date), employee.employmentType);
                return `${item.shiftKind === "morning" ? "Ranní" : "Odpolední"} ${window.start}–${window.end}`;
              });
              return <td key={date} className={className} aria-label={labels.join(", ")} title={labels.join(", ")}>
                {items.map((item, itemIndex) => <span key={`${item.shiftKind}-${itemIndex}`} className={`monthly-roster__cell ${item.shiftKind === "morning" ? "monthly-roster__cell--morning" : "monthly-roster__cell--afternoon"}`} aria-hidden="true">{item.shiftKind === "morning" ? "R" : "O"}</span>)}
              </td>;
            }
            return <td key={date} className={className}>
              {completeAndValidated
                ? <span className="monthly-roster__cell monthly-roster__cell--off" aria-label="Volno" title="Volno">V</span>
                : <span className="monthly-roster__cell monthly-roster__cell--unknown" aria-label="Neznámé nebo nedokončené" title="Neznámé nebo nedokončené">?</span>}
            </td>;
          })}
        </tr>)}</tbody>
      </table>
    </div>
  </div>;
}
