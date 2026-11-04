import { CZECH_DAYS, SHIFT_META, formatDayMonth, formatIsoDate } from "@/lib/demo-data";
import { monthlyRosterCaption } from "@/lib/planning/monthly-view";
import type { MonthlyView } from "./monthly-planning-panel";

export function MonthlyRosterTable({ view, weekDates }: { view: MonthlyView; weekDates: Date[] }) {
  return <div className="table-wrap"><table className="roster">
    <caption>{monthlyRosterCaption({ confirmed: view.confirmed ?? false, month: view.input.month, mode: view.mode })}</caption>
    <thead><tr><th scope="col" className="roster__employee-col">Zaměstnanec</th>{weekDates.map((date, index) => <th key={formatIsoDate(date)} scope="col" className={index >= 5 ? "roster__day roster__day--weekend" : "roster__day"}><span className="roster__day-name">{CZECH_DAYS[index]}</span><span className="roster__day-date">{formatDayMonth(date)}</span></th>)}</tr></thead>
    <tbody>{view.input.employees.map((employee) => <tr key={employee.id}><th scope="row" className="roster__employee-col">{employee.displayName}</th>{weekDates.map((day, index) => {
      const date = formatIsoDate(day);
      const items = view.draft.assignments.filter((assignment) => assignment.employeeId === employee.id && assignment.date === date);
      const range = view.input.planningRange;
      const fixed = range && (date < range.startDate || date > range.endDate) ? view.input.rosterHistory?.days.find((entry) => entry.employeeId === employee.id && entry.date === date) : undefined;
      return <td key={date} className={index >= 5 ? "roster__cell roster__cell--weekend" : "roster__cell"}>{!date.startsWith(`${view.input.month}-`) ? <span aria-label="Mimo měsíc">—</span> : fixed?.status === "shift" ? <span className={`shift ${fixed.shiftKind ? SHIFT_META[fixed.shiftKind].className : ""}`} title="Převzatá směna"><span className="shift__code">P</span><span className="shift__time">{fixed.startTime}–{fixed.endTime}</span></span> : fixed?.status === "off" ? <span className="shift shift--off" title="Převzaté volno" aria-label="Převzaté volno">Volno</span> : range && (date < range.startDate || date > range.endDate) ? <span title={fixed?.status === "conflict" ? "Rozpor v podkladech" : "Neznámý den"}>?</span> : items.map((item, itemIndex) => <span key={`${item.shiftKind}-${itemIndex}`} className={`shift ${SHIFT_META[item.shiftKind].className}`} title={SHIFT_META[item.shiftKind][index >= 5 ? "weekendLabel" : "label"]}><span className="shift__code">{item.shiftKind === "morning" ? "R" : "O"}</span><span className="shift__time">{SHIFT_META[item.shiftKind][index >= 5 ? "weekendLabel" : "label"]}</span></span>)}</td>;
    })}</tr>)}</tbody>
  </table></div>;
}
