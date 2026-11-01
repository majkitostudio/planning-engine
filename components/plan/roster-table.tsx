import {
  CZECH_DAYS,
  SHIFT_META,
  formatDayMonth,
  type DemoEmployee,
} from "@/lib/demo-data";

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
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => (
            <tr key={employee.id}>
              <th scope="row" className="roster__employee-col">
                <span className="employee">
                  <span>
                    <span className="employee__name">{employee.name}</span>
                    <span className="employee__role">Ukázková data</span>
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
                  <span
                    className={`shift ${SHIFT_META[shift].className}`}
                    aria-label={`${SHIFT_META[shift].option}`}
                    title={SHIFT_META[shift][index >= 5 ? "weekendLabel" : "label"]}
                  >
                    {shift === "off" ? null : (
                      <>
                        <span className="shift__code">
                          {shift === "morning" ? "R" : shift === "afternoon" ? "O" : SHIFT_META[shift].label}
                        </span>
                        <span className="shift__time">
                          {SHIFT_META[shift][index >= 5 ? "weekendLabel" : "label"]}
                        </span>
                      </>
                    )}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
