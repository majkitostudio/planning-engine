import { Avatar } from "@/components/ui/avatar";
import {
  CZECH_DAYS,
  SHIFT_META,
  formatDayMonth,
  type DemoEmployee,
} from "@/lib/demo-data";

const STATUS_LABEL: Record<DemoEmployee["status"], string> = {
  ok: "Bez konfliktu",
  warning: "Upozornění",
  conflict: "Konflikt",
};

export function RosterTable({
  employees,
  weekDates,
}: {
  employees: DemoEmployee[];
  weekDates: Date[];
}) {
  return (
    <div className="table-wrap">
      <table className="roster">
        <caption className="sr-only">
          Ukázkový rozpis směn na týden od {formatDayMonth(weekDates[0])} do{" "}
          {formatDayMonth(weekDates[weekDates.length - 1])}. Data jsou smyšlená.
        </caption>
        <thead>
          <tr>
            <th scope="col" className="roster__employee-col">
              Zaměstnanec
            </th>
            {weekDates.map((date, index) => (
              <th
                key={date.toISOString()}
                scope="col"
                className={index >= 5 ? "roster__day roster__day--weekend" : "roster__day"}
              >
                <span className="roster__day-name">{CZECH_DAYS[index]}</span>
                <span className="roster__day-date">{formatDayMonth(date)}</span>
              </th>
            ))}
            <th scope="col" className="roster__status-col">
              <span className="sr-only">Stav</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <th scope="row" className="roster__employee-col">
                <span className="employee">
                  <Avatar name={employee.name} color={employee.color} />
                  <span>
                    <span className="employee__name">{employee.name}</span>
                    <span className="employee__role">{employee.role}</span>
                  </span>
                </span>
              </th>
              {employee.shifts.map((shift, index) => (
                <td
                  key={`${employee.id}-${index}`}
                  className={
                    index >= 5 ? "roster__cell roster__cell--weekend" : "roster__cell"
                  }
                >
                  <span className={`shift ${SHIFT_META[shift].className}`}>
                    {SHIFT_META[shift].label}
                  </span>
                </td>
              ))}
              <td className="roster__status-col">
                <span
                  className={`status-dot status-dot--${employee.status}`}
                  role="img"
                  aria-label={STATUS_LABEL[employee.status]}
                  title={STATUS_LABEL[employee.status]}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
