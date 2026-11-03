import { describe, expect, it } from "vitest";
import { parseRosterCsv } from "./roster-import";

const weekdayNames = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];
function headerFor(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return ["Jméno", ...Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const weekday = new Date(Date.UTC(year, monthNumber - 1, day)).getUTCDay();
    return `${day} ${weekdayNames[weekday]}`;
  })];
}

const month = "2026-11";
const header = headerFor(month);
const makeRow = (name: string, entries: Readonly<Record<number, string>>) => [name, ...header.slice(1).map((_, index) => entries[index + 1] ?? "")];
const csv = [
  header.join(";"),
  makeRow("10010: Test team", {}).join(";"),
  makeRow("Nováková Jana", { 1: "Volno", 2: "07:45-16:30", 3: "10:45-21:00", 4: "Nemoc" }).join(";"),
].join("\r\n");

describe("převod exportu rosteru", () => {
  it("zachová přesné směny, výslovné volno a neznámé buňky bez uložení surových řádků", () => {
    const preview = parseRosterCsv(csv, month, [{ id: "e1", displayName: "Nováková Jana" }]);

    if (!preview.ok) throw new Error(preview.code);
    if (!preview.ok) return;
    expect(preview.employees).toHaveLength(1);
    expect(preview.employees[0]).toMatchObject({ employeeId: "e1", match: "exact" });
    expect(preview.employees[0].days["2026-11-01"]).toMatchObject({ status: "off" });
    expect(preview.employees[0].days["2026-11-02"]).toMatchObject({ status: "shift", startTime: "07:45", endTime: "16:30" });
    expect(preview.employees[0].days["2026-11-04"]).toMatchObject({ status: "unknown", reason: "unsupported_cell" });
    expect(preview.employees[0].days["2026-11-05"]).toMatchObject({ status: "unknown", reason: "blank" });
  });

  it("ponechá nejednoznačné a nespárované osoby k ručnímu rozhodnutí", () => {
    const ambiguous = parseRosterCsv(csv, month, [
      { id: "e1", displayName: "Nováková Jana" },
      { id: "e2", displayName: "Novakova Jana" },
    ]);
    const unmatched = parseRosterCsv(csv, month, [{ id: "e3", displayName: "Jiná Osoba" }]);

    if (!ambiguous.ok) throw new Error(ambiguous.code);
    if (!unmatched.ok) throw new Error(unmatched.code);
    expect(ambiguous.employees[0].match).toBe("ambiguous");
    expect(unmatched.employees[0].match).toBe("unmatched");
  });

  it("přečte více syntetických zaměstnanců a zastaví duplicitní řádek", () => {
    const secondRow = makeRow("Testovní Petr", { 1: "07:45-16:30" }).join(";");
    const multiple = parseRosterCsv(`${csv}\r\n${secondRow}`, month, [
      { id: "e1", displayName: "Nováková Jana" }, { id: "e2", displayName: "Testovní Petr" },
    ]);
    const duplicate = parseRosterCsv(`${csv}\r\n${makeRow("Nováková Jana", {}).join(";")}`, month, []);

    expect(multiple.ok && multiple.employees).toHaveLength(2);
    expect(duplicate).toMatchObject({ ok: false, code: "duplicate_person" });
  });

  it("odmítne neúplný export, neplatný interval a hlavičku s jiným kalendářním měsícem", () => {
    expect(parseRosterCsv("", month, []).ok).toBe(false);
    const invalidTime = [header.join(";"), makeRow("Nováková Jana", { 1: "07:45-07:45" }).join(";")].join("\n");
    expect(parseRosterCsv(invalidTime, month, []).ok).toBe(false);
    const wrongMonth = headerFor("2026-10").join(";") + "\n" + makeRow("Nováková Jana", {}).join(";");
    expect(parseRosterCsv(wrongMonth, month, []).ok).toBe(false);
  });
});
