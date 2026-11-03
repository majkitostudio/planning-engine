import datetime as dt
import unittest

from monthly_solver import _has_minimum_rest, solve


def sample():
    dates = [f"2026-11-{day:02}" for day in range(1, 31)]
    return {
        "input": {
            "month": "2026-11",
            "employees": [{"id": "synthetic-1"}],
            "absences": [],
            "availability": [],
            "staffingRequirements": [
                {"date": date, "shiftKind": kind,
                 "requiredEmployees": int(date == "2026-11-02" and kind == "morning")}
                for date in dates for kind in ("morning", "afternoon")
            ],
        },
        "boundary": {
            "before": {"complete": True, "assignments": []},
            "after": {"complete": True, "assignments": []},
        },
        "timeoutSeconds": 10,
    }


def month_with_requirements(month, employees, required_dates):
    year, number = map(int, month.split("-"))
    day_count = __import__("calendar").monthrange(year, number)[1]
    dates = [f"{month}-{day:02}" for day in range(1, day_count + 1)]
    payload = sample()
    payload["input"]["month"] = month
    payload["input"]["employees"] = [{"id": f"synthetic-{index}"} for index in range(employees)]
    payload["input"]["staffingRequirements"] = [
        {"date": date, "shiftKind": kind,
         "requiredEmployees": int((date, kind) in required_dates)}
        for date in dates for kind in ("morning", "afternoon")
    ]
    return payload


class SolverInputTests(unittest.TestCase):
    def test_exactly_35_hours_of_rest_meets_the_minimum(self):
        previous_end = dt.datetime(2026, 1, 1, 21, tzinfo=dt.timezone.utc)

        self.assertTrue(_has_minimum_rest(previous_end, previous_end + dt.timedelta(hours=35)))
        self.assertFalse(_has_minimum_rest(previous_end, previous_end + dt.timedelta(hours=34, minutes=59)))

    def test_solves_a_synthetic_month_and_returns_only_required_assignments(self):
        result = solve(sample())

        self.assertEqual(result["status"], "feasible")
        self.assertEqual(result["assignments"], [{
            "employeeId": "synthetic-1", "date": "2026-11-02", "shiftKind": "morning"
        }])

    def test_rejects_non_boolean_availability(self):
        payload = sample()
        payload["input"]["availability"] = [{
            "employeeId": "synthetic-1", "date": "2026-11-02",
            "shiftKind": "morning", "available": 0
        }]

        self.assertEqual(solve(payload)["status"], "invalid_input")

    def test_rejects_non_boolean_boundary_completeness(self):
        payload = sample()
        payload["boundary"]["before"]["complete"] = "false"

        self.assertEqual(solve(payload)["status"], "invalid_input")

    def test_respects_explicit_unavailability(self):
        payload = sample()
        payload["input"]["availability"] = [{
            "employeeId": "synthetic-1", "date": "2026-11-02",
            "shiftKind": "morning", "available": False
        }]

        self.assertEqual(solve(payload)["status"], "infeasible")

    def test_respects_approved_absence(self):
        payload = sample()
        payload["input"]["absences"] = [{
            "id": "synthetic-absence", "employeeId": "synthetic-1", "from": "2026-11-02",
            "to": "2026-11-02", "type": "vacation", "status": "approved"
        }]

        self.assertEqual(solve(payload)["status"], "infeasible")

    def test_never_labels_unproven_boundary_data_as_infeasible(self):
        payload = sample()
        payload["input"]["employees"] = []
        payload["boundary"]["before"]["complete"] = False

        self.assertEqual(solve(payload)["status"], "invalid_input")

    def test_honors_the_actual_35_hour_rest_window(self):
        required = {(f"2026-12-{day:02}", "morning") for day in range(2, 9)}
        payload = month_with_requirements("2026-12", 1, required)

        self.assertEqual(solve(payload)["status"], "infeasible")

    def test_does_not_reject_more_than_six_consecutive_days_when_rest_reaches_35_hours(self):
        required = {(f"2026-12-{day:02}", "morning") for day in range(2, 8)}
        required.add(("2026-12-09", "morning"))
        payload = month_with_requirements("2026-12", 1, required)

        self.assertEqual(solve(payload)["status"], "feasible")

    def test_finds_full_29_employee_november_test_month(self):
        payload = month_with_requirements("2026-11", 29, set())
        for requirement in payload["input"]["staffingRequirements"]:
            weekend = __import__("datetime").date.fromisoformat(requirement["date"]).weekday() >= 5
            requirement["requiredEmployees"] = (7 if weekend else 15) if requirement["shiftKind"] == "morning" else (3 if weekend else 7)
        payload["boundary"]["before"]["complete"] = False
        payload["boundary"]["after"]["complete"] = False

        result = solve(payload)
        self.assertEqual(result["status"], "feasible")
        self.assertEqual(len(result["assignments"]), 552)


if __name__ == "__main__":
    unittest.main()
