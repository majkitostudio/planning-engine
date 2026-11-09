import copy
import datetime as dt
import unittest
from unittest.mock import patch

from ortools.sat.python import cp_model
import monthly_solver as solver


def fixture(month="2026-11", people=1):
    return {"input": {"month": month,
                      "employees": [{"id": f"e{i}", "employmentType": "full_time"} for i in range(people)],
                      "staffingRequirements": [], "availability": [], "absences": []},
            "boundary": {"before": {"complete": True, "assignments": []}, "after": {"complete": True, "assignments": []}},
            "timeoutSeconds": 10}


def requirement(request, day, count=1, kind="morning"):
    request["input"]["staffingRequirements"].append({"date": day, "shiftKind": kind, "requiredEmployees": count})


class MonthlySolverTest(unittest.TestCase):
    def test_partial_and_missing_are_distinct(self):
        request = fixture()
        requirement(request, "2026-11-02", 2)
        requirement(request, "2026-11-03", 0)
        result = solver.solve(request)
        self.assertEqual(result["status"], "OPTIMAL")
        self.assertEqual(result["shortages"], [{"date": "2026-11-02", "shiftKind": "morning", "missing": 1}])
        self.assertEqual(len(result["assignments"]), 1)
        self.assertEqual(result["missingAvailability"], result["assignments"])
        self.assertNotIn({"date": "2026-11-03", "shiftKind": "morning"}, result["missingRequirements"])
        self.assertIn({"date": "2026-11-03", "shiftKind": "afternoon"}, result["missingRequirements"])

    def test_approved_absence_and_unavailability(self):
        request = fixture(people=2)
        requirement(request, "2026-11-02")
        request["input"]["absences"].append({"employeeId": "e0", "from": "2026-11-02", "to": "2026-11-02", "status": "approved", "type": "vacation"})
        request["input"]["availability"].append({"employeeId": "e1", "date": "2026-11-02", "shiftKind": "morning", "available": False})
        result = solver.solve(request)
        self.assertEqual(result["assignments"], [])
        self.assertEqual(result["shortages"][0]["missing"], 1)

    def test_custom_boundary_rest(self):
        request = fixture()
        request["boundary"]["before"]["complete"] = False
        requirement(request, "2026-11-01")
        for day in range(25, 31):
            request["boundary"]["before"]["assignments"].append({"employeeId": "e0", "date": f"2026-10-{day}", "startTime": "12:00", "endTime": "21:00"})
        result = solver.solve(request)
        self.assertEqual(result["shortages"][0]["missing"], 1)
        request["boundary"]["before"]["assignments"][-1]["endTime"] = "20:00"
        self.assertEqual(solver.solve(request)["shortages"], [])

    def test_after_boundary_rest(self):
        request = fixture()
        for day in range(25, 31):
            requirement(request, f"2026-11-{day}", kind="afternoon")
        request["boundary"]["after"]["assignments"].append({"employeeId": "e0", "date": "2026-12-02", "startTime": "07:45", "endTime": "16:30"})
        result = solver.solve(request)
        self.assertGreaterEqual(sum(item["missing"] for item in result["shortages"]), 1)

    def test_dst_local_times(self):
        zone = solver.ZoneInfo("Europe/Prague")
        for day in (dt.date(2026, 3, 29), dt.date(2026, 10, 25)):
            with self.assertRaises(solver.InvalidInput):
                solver.local_instant(day, "02:30", zone)
        for day, expected in ((dt.date(2026, 3, 28), 33.75), (dt.date(2026, 10, 24), 35.75)):
            end = solver.local_instant(day, "21:00", zone)
            start = solver.local_instant(day + dt.timedelta(days=2), "07:45", zone)
            self.assertEqual((start - end).total_seconds() / 3600, expected)

    def test_dst_rest_across_month_boundary(self):
        for month, previous, start, expect_shortage in (("2024-04", "2024-03", 25, True), ("2021-11", "2021-10", 25, False)):
            with self.subTest(month=month):
                request = fixture(month)
                request["boundary"]["before"]["complete"] = False
                requirement(request, f"{month}-01")
                request["boundary"]["before"]["assignments"] = [
                    {"employeeId": "e0", "date": f"{previous}-{day}", "startTime": "12:00", "endTime": "21:00"}
                    for day in range(start, start + 6)
                ]
                result = solver.solve(request)
                self.assertEqual(result["status"], "OPTIMAL")
                self.assertEqual(bool(result["shortages"]), expect_shortage)

    def test_invalid_inputs_and_runtime_error(self):
        request = fixture()
        cases = []
        invalid = copy.deepcopy(request); invalid["input"]["employees"][0]["employmentType"] = "part_time"; cases.append(invalid)
        invalid = copy.deepcopy(request); invalid["input"]["month"] = "2026-13"; cases.append(invalid)
        invalid = copy.deepcopy(request); requirement(invalid, "2026-11-01", -1); cases.append(invalid)
        invalid = copy.deepcopy(request); invalid["timeoutSeconds"] = float("nan"); cases.append(invalid)
        invalid = copy.deepcopy(request); invalid["boundary"]["before"]["assignments"] = [{"employeeId": "e0", "date": "2026-10-25", "startTime": "02:30", "endTime": "04:00"}]; cases.append(invalid)
        for invalid in cases:
            self.assertEqual(solver.solve(invalid), {"status": "invalid_input"})
        with patch.object(solver.cp_model.CpSolver, "solve", side_effect=RuntimeError()):
            self.assertEqual(solver.solve(request), {"status": "error"})
        with patch.object(solver.cp_model.CpSolver, "solve", return_value=cp_model.UNKNOWN):
            self.assertEqual(solver.solve(request), {"status": "UNKNOWN"})
        with patch.object(solver, "ZoneInfo", side_effect=solver.ZoneInfoNotFoundError("missing")):
            self.assertEqual(solver.solve(request), {"status": "unavailable"})
        with patch.object(solver.cp_model.CpSolver, "solve", return_value=cp_model.FEASIBLE), \
             patch.object(solver.cp_model.CpSolver, "value", return_value=0):
            self.assertEqual(solver.solve(request)["status"], "FEASIBLE")

    def test_incomplete_history_is_exposed(self):
        request = fixture()
        request["boundary"]["before"]["complete"] = False
        self.assertFalse(solver.solve(request)["boundaryComplete"]["before"])

    def test_weekend_requires_two_days_off(self):
        request = fixture()
        for day in range(2, 8):
            requirement(request, f"2026-11-{day:02d}")
        result = solver.solve(request)
        self.assertEqual(result["status"], "OPTIMAL")
        self.assertEqual(len(result["assignments"]), 5)
        self.assertEqual(sum(item["missing"] for item in result["shortages"]), 1)

    def test_repeatable_small_input(self):
        request = fixture(people=3)
        for day in range(2, 9):
            requirement(request, f"2026-11-{day:02d}")
        self.assertEqual(solver.solve(request), solver.solve(request))

    def test_infeasible_fixed_history(self):
        request = fixture()
        request["boundary"]["before"]["assignments"] = [{"employeeId": "e0", "date": f"2026-10-{day}", "shiftKind": "morning"} for day in range(26, 32)]
        self.assertEqual(solver.solve(request), {"status": "INFEASIBLE"})


if __name__ == "__main__":
    unittest.main()
