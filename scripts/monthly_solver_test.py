import datetime as dt
import unittest
from zoneinfo import ZoneInfo

from monthly_solver import _has_minimum_rest, _is_unambiguous_local_datetime, solve


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
    def test_custom_local_times_adjacent_to_clock_change_remain_valid(self):
        zone = ZoneInfo("Europe/Prague")

        self.assertTrue(_is_unambiguous_local_datetime(dt.date(2026, 3, 29), dt.time(3, 30), zone))
        self.assertTrue(_is_unambiguous_local_datetime(dt.date(2026, 10, 25), dt.time(1, 30), zone))
        self.assertTrue(_is_unambiguous_local_datetime(dt.date(2026, 10, 25), dt.time(3, 30), zone))

    def test_partial_month_rejects_nonexistent_and_ambiguous_custom_local_times(self):
        cases = [
            ("2026-03", "2026-03-30", "2026-03-31", "2026-03-29"),
            ("2026-10", "2026-10-26", "2026-10-31", "2026-10-25"),
        ]

        for month, range_start, range_end, transition_day in cases:
            with self.subTest(day=transition_day):
                payload = month_with_requirements(month, 1, set())
                payload["input"]["planningRange"] = {"startDate": range_start, "endDate": range_end}
                year, number = map(int, month.split("-"))
                day_count = __import__("calendar").monthrange(year, number)[1]
                payload["input"]["fixedDays"] = [
                    {"employeeId": "synthetic-0", "date": f"{month}-{day:02}", "status": "shift", "startTime": "02:30", "endTime": "04:00"}
                    if f"{month}-{day:02}" == transition_day
                    else {"employeeId": "synthetic-0", "date": f"{month}-{day:02}", "status": "off"}
                    for day in range(1, day_count + 1)
                    if not range_start <= f"{month}-{day:02}" <= range_end
                ]

                self.assertEqual(solve(payload)["status"], "invalid_input")

    def test_partial_month_preserves_fixed_days_and_returns_only_new_assignments(self):
        payload = sample()
        payload["input"]["planningRange"] = {"startDate": "2026-11-15", "endDate": "2026-11-30"}
        payload["input"]["fixedDays"] = [
            {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "shift", "startTime": "07:45", "endTime": "16:30", "shiftKind": "morning"}
            if day == 2 else {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "off"}
            for day in range(1, 15)
        ]
        for requirement in payload["input"]["staffingRequirements"]:
            requirement["requiredEmployees"] = int(requirement["date"] == "2026-11-16" and requirement["shiftKind"] == "morning")
        result = solve(payload)
        self.assertEqual(result["status"], "feasible")
        self.assertEqual(result["assignments"], [{"employeeId": "synthetic-1", "date": "2026-11-16", "shiftKind": "morning"}])

    def test_partial_month_uses_custom_fixed_times_for_rest(self):
        payload = sample()
        payload["input"]["planningRange"] = {"startDate": "2026-11-15", "endDate": "2026-11-30"}
        payload["input"]["fixedDays"] = [
            {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "shift", "startTime": "08:05", "endTime": "20:00"}
            if day >= 9 else {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "off"}
            for day in range(1, 15)
        ]
        for requirement in payload["input"]["staffingRequirements"]:
            requirement["requiredEmployees"] = int(requirement["date"] == "2026-11-15" and requirement["shiftKind"] == "morning")
        self.assertEqual(solve(payload)["status"], "infeasible")

    def test_partial_month_rejects_missing_fixed_day(self):
        payload = sample()
        payload["input"]["planningRange"] = {"startDate": "2026-11-15", "endDate": "2026-11-30"}
        payload["input"]["fixedDays"] = []
        self.assertEqual(solve(payload)["status"], "invalid_input")

    def test_partial_month_uses_actual_custom_end_time_across_range_boundary(self):
        payload = sample()
        payload["input"]["planningRange"] = {"startDate": "2026-11-12", "endDate": "2026-11-30"}
        payload["input"]["fixedDays"] = [
            {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "shift", "startTime": "08:05", "endTime": "20:00"}
            if day >= 6 else {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "off"}
            for day in range(1, 12)
        ]
        for requirement in payload["input"]["staffingRequirements"]:
            requirement["requiredEmployees"] = int(requirement["date"] == "2026-11-13" and requirement["shiftKind"] == "morning")
        self.assertEqual(solve(payload)["status"], "feasible")
        payload["input"]["fixedDays"][-1]["endTime"] = "21:00"
        self.assertEqual(solve(payload)["status"], "infeasible")

    def test_partial_month_counts_fixed_weekend_work_in_same_week(self):
        payload = sample()
        payload["input"]["planningRange"] = {"startDate": "2026-11-09", "endDate": "2026-11-13"}
        payload["input"]["fixedDays"] = [
            {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "shift", "startTime": "08:05", "endTime": "20:00"}
            if day == 14 else {"employeeId": "synthetic-1", "date": f"2026-11-{day:02}", "status": "off"}
            for day in range(1, 31) if not 9 <= day <= 13
        ]
        for requirement in payload["input"]["staffingRequirements"]:
            requirement["requiredEmployees"] = int(requirement["date"] in {f"2026-11-{day:02}" for day in range(9, 14)} and requirement["shiftKind"] == "morning")
        self.assertEqual(solve(payload)["status"], "infeasible")

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

    def test_alternates_consecutive_work_shifts_across_days_off_when_requested(self):
        payload = month_with_requirements("2026-11", 2, {
            ("2026-11-02", kind) for kind in ("morning", "afternoon")
        } | {
            ("2026-11-04", kind) for kind in ("morning", "afternoon")
        } | {
            ("2026-11-06", kind) for kind in ("morning", "afternoon")
        })
        payload["input"]["shiftRotationPreference"] = True

        result = solve(payload)

        self.assertEqual(result["status"], "feasible")
        by_employee = {}
        for item in result["assignments"]:
            by_employee.setdefault(item["employeeId"], []).append(item["shiftKind"])
        self.assertEqual(len(by_employee), 2)
        for shifts in by_employee.values():
            self.assertEqual(len(shifts), 3)
            self.assertTrue(all(previous != following for previous, following in zip(shifts, shifts[1:])))

    def test_rejects_non_boolean_shift_rotation_preference(self):
        payload = sample()
        payload["input"]["shiftRotationPreference"] = "true"

        self.assertEqual(solve(payload)["status"], "invalid_input")

    def test_uses_known_previous_month_shift_as_rotation_context(self):
        payload = month_with_requirements("2026-11", 2, {
            ("2026-11-01", kind) for kind in ("morning", "afternoon")
        })
        payload["input"]["shiftRotationPreference"] = True
        payload["boundary"]["before"]["assignments"] = [
            {"employeeId": "synthetic-0", "date": "2026-10-31", "shiftKind": "afternoon"},
            {"employeeId": "synthetic-1", "date": "2026-10-31", "shiftKind": "morning"},
        ]

        result = solve(payload)

        self.assertEqual(result["status"], "feasible")
        first_day = {item["employeeId"]: item["shiftKind"] for item in result["assignments"] if item["date"] == "2026-11-01"}
        self.assertEqual(first_day, {"synthetic-0": "morning", "synthetic-1": "afternoon"})

    def test_keeps_staffing_and_availability_ahead_of_rotation_preference(self):
        required = {("2026-11-02", "morning"), ("2026-11-04", "morning")}
        payload = month_with_requirements("2026-11", 1, required)
        payload["input"]["shiftRotationPreference"] = True
        payload["input"]["availability"] = [
            {"employeeId": "synthetic-0", "date": date, "shiftKind": "afternoon", "available": False}
            for date in ("2026-11-02", "2026-11-04")
        ]

        result = solve(payload)

        self.assertEqual(result["status"], "feasible")
        self.assertEqual(result["assignments"], [
            {"employeeId": "synthetic-0", "date": "2026-11-02", "shiftKind": "morning"},
            {"employeeId": "synthetic-0", "date": "2026-11-04", "shiftKind": "morning"},
        ])

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

    def test_rest_uses_shifts_before_month_boundary(self):
        payload = month_with_requirements("2026-11", 1, {("2026-11-01", "morning")})
        payload["boundary"]["before"]["assignments"] = [
            {"employeeId": "synthetic-0", "date": f"2026-10-{day:02}", "shiftKind": "afternoon"}
            for day in range(25, 31)
        ]
        self.assertEqual(solve(payload)["status"], "infeasible")

    def test_rest_uses_shifts_after_month_boundary(self):
        required = {(f"2026-11-{day:02}", "afternoon") for day in range(25, 31)}
        payload = month_with_requirements("2026-11", 1, required)
        payload["boundary"]["after"]["assignments"] = [
            {"employeeId": "synthetic-0", "date": "2026-12-02", "shiftKind": "morning"}
        ]
        self.assertEqual(solve(payload)["status"], "infeasible")

    def test_does_not_reject_more_than_six_consecutive_days_when_rest_reaches_35_hours(self):
        required = {(f"2026-12-{day:02}", "morning") for day in range(2, 8)}
        required.add(("2026-12-09", "morning"))
        payload = month_with_requirements("2026-12", 1, required)

        self.assertEqual(solve(payload)["status"], "feasible")

    def test_fund_objective_prefers_employee_with_matching_fund(self):
        payload = month_with_requirements("2026-11", 2, {
            ("2026-11-02", "morning"),
            ("2026-11-04", "morning"),
        })
        payload["input"]["workFunds"] = [
            {"employeeId": "synthetic-0", "hours": 17.5, "excusedHours": 0},
            {"employeeId": "synthetic-1", "hours": 0, "excusedHours": 0},
        ]

        result = solve(payload)

        self.assertEqual(result["status"], "feasible")
        self.assertEqual({item["employeeId"] for item in result["assignments"]}, {"synthetic-0"})

    def test_part_time_weekday_uses_half_shift_duration(self):
        payload = month_with_requirements("2026-11", 2, {
            ("2026-11-02", "morning"),
        })
        payload["input"]["employees"] = [
            {"id": "synthetic-0", "employmentType": "part_time"},
            {"id": "synthetic-1", "employmentType": "full_time"},
        ]
        payload["input"]["workFunds"] = [
            {"employeeId": "synthetic-0", "hours": 7.25, "excusedHours": 0},
            {"employeeId": "synthetic-1", "hours": 0, "excusedHours": 0},
        ]

        result = solve(payload)

        self.assertEqual(result["status"], "feasible")
        self.assertEqual({item["employeeId"] for item in result["assignments"]}, {"synthetic-0"})

    def test_part_time_employee_can_work_weekend_full_length_shift(self):
        payload = month_with_requirements("2026-11", 2, {
            ("2026-11-07", "morning"),
        })
        payload["input"]["employees"] = [
            {"id": "synthetic-0", "employmentType": "part_time"},
            {"id": "synthetic-1", "employmentType": "full_time"},
        ]
        payload["input"]["workFunds"] = [
            {"employeeId": "synthetic-0", "hours": 8.75, "excusedHours": 0},
            {"employeeId": "synthetic-1", "hours": 0, "excusedHours": 0},
        ]

        result = solve(payload)

        self.assertEqual(result["status"], "feasible")
        self.assertEqual({item["employeeId"] for item in result["assignments"]}, {"synthetic-0"})

    def test_partial_month_accepts_fixed_part_time_weekday_shift_times(self):
        payload = month_with_requirements("2026-11", 1, {
            ("2026-11-16", "morning"),
        })
        payload["input"]["employees"] = [{"id": "synthetic-0", "employmentType": "part_time"}]
        payload["input"]["planningRange"] = {"startDate": "2026-11-15", "endDate": "2026-11-30"}
        payload["input"]["fixedDays"] = [
            {"employeeId": "synthetic-0", "date": f"2026-11-{day:02}", "status": "shift", "startTime": "07:45", "endTime": "15:00", "shiftKind": "morning"}
            if day == 2 else
            {"employeeId": "synthetic-0", "date": f"2026-11-{day:02}", "status": "off"}
            for day in range(1, 15)
        ]

        result = solve(payload)

        self.assertEqual(result["status"], "feasible")
        self.assertEqual(result["assignments"], [{"employeeId": "synthetic-0", "date": "2026-11-16", "shiftKind": "morning"}])

    def test_rejects_invalid_work_fund(self):
        cases = [
            [{"employeeId": "unknown", "hours": 1, "excusedHours": 0}],
            [{"employeeId": "synthetic-1", "hours": -1, "excusedHours": 0}],
            [{"employeeId": "synthetic-1", "hours": 1, "excusedHours": -1}],
            [{"employeeId": "synthetic-1", "hours": True, "excusedHours": 0}],
            [{"employeeId": "synthetic-1", "hours": "1", "excusedHours": 0}],
            [{"employeeId": "synthetic-1", "hours": 1001, "excusedHours": 0}],
            [
                {"employeeId": "synthetic-1", "hours": 1, "excusedHours": 0},
                {"employeeId": "synthetic-1", "hours": 2, "excusedHours": 0},
            ],
        ]
        for work_funds in cases:
            with self.subTest(work_funds=work_funds):
                payload = sample()
                payload["input"]["workFunds"] = work_funds
                self.assertEqual(solve(payload)["status"], "invalid_input")

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
