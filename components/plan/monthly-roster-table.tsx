import { CZECH_DAYS, SHIFT_META, formatDayMonth, formatIsoDate } from "@/lib/demo-data";
import type { MonthlyView } from "./monthly-planning-panel";

export function MonthlyRosterTable({ view, weekDates }: { view: MonthlyView; weekDates: Date[] }) {
  const title = view.confirmed ? "Potvrzený rozpis" : "Nepotvrzený návrh";
  return <div className="table-wrap"><table className="roster">
    <caption>{title} · {view.input.month}{view.mode === "simulated" ? " · SIMULATED" : ""}</caption>
    <thead><tr><th scope="col" className="roster__employee-col">Zaměstnanec</th>{weekDates.map((date, index) => <th key={formatIsoDate(date)} scope="col" className={index >= 5 ? "roster__day roster__day--weekend" : "roster__day"}><span className="roster__day-name">{CZECH_DAYS[index]}</span><span className="roster__day-date">{formatDayMonth(date)}</span></th>)}</tr></thead>
    <tbody>{view.input.employees.map((employee) => <tr key={employee.id}><th scope="row" className="roster__employee-col">{employee.displayName}</th>{weekDates.map((day, index) => {
      const date = formatIsoDate(day);
      const items = view.draft.assignments.filter((assignment) => assignment.employeeId === employee.id && assignment.date === date);
      return <td key={date} className={index >= 5 ? "roster__cell roster__cell--weekend" : "roster__cell"}>{!date.startsWith(`${view.input.month}-`) ? <span aria-label="Mimo měsíc">—</span> : items.map((item, itemIndex) => <span key={`${item.shiftKind}-${itemIndex}`} className={`shift ${SHIFT_META[item.shiftKind].className}`} title={SHIFT_META[item.shiftKind][index >= 5 ? "weekendLabel" : "label"]}><span className="shift__code">{item.shiftKind === "morning" ? "R" : "O"}</span><span className="shift__time">{SHIFT_META[item.shiftKind][index >= 5 ? "weekendLabel" : "label"]}</span></span>)}</td>;
    })}</tr>)}</tbody>
  </table></div>;
}
