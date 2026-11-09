"""Isolated monthly CP-SAT model. Structured synthetic DTO; no application integration.

Availability and boundary completeness remain subject to independent validation.
Never log the request or the resulting roster.
"""

import calendar
import datetime as dt
import math
import re
from collections import defaultdict
from functools import lru_cache
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ortools.sat.python import cp_model

KINDS = ("morning", "afternoon")
UTC = dt.timezone.utc
REST = dt.timedelta(hours=35)


class InvalidInput(ValueError):
    pass


def require(condition):
    if not condition:
        raise InvalidInput()


def date_value(value):
    require(isinstance(value, str) and re.fullmatch(r"\d{4}-\d{2}-\d{2}", value))
    return dt.date.fromisoformat(value)


def local_instant(day, value, zone):
    require(isinstance(value, str) and re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value))
    naive = dt.datetime.combine(day, dt.time.fromisoformat(value))
    candidates = set()
    for fold in (0, 1):
        instant = naive.replace(tzinfo=zone, fold=fold).astimezone(UTC)
        if instant.astimezone(zone).replace(tzinfo=None) == naive:
            candidates.add(instant)
    require(len(candidates) == 1)
    return candidates.pop()


@lru_cache(maxsize=2048)
def shift_interval(day, kind, zone):
    start = "07:45" if kind == "morning" else ("12:45" if day.weekday() >= 5 else "13:15")
    end = "16:30" if kind == "morning" else "21:00"
    return local_instant(day, start, zone), local_instant(day, end, zone)


def parse(payload):
    require(isinstance(payload, dict) and isinstance(payload.get("input"), dict) and isinstance(payload.get("boundary"), dict))
    data, boundary = payload["input"], payload["boundary"]
    month = data.get("month")
    require(isinstance(month, str) and re.fullmatch(r"\d{4}-(?:0[1-9]|1[0-2])", month))
    year, number = map(int, month.split("-"))
    first = dt.date(year, number, 1)
    dates = [first + dt.timedelta(days=i) for i in range(calendar.monthrange(year, number)[1])]
    last = dates[-1]
    require(data.get("planningRange") is None and data.get("rosterHistory") is None)
    employees = data.get("employees")
    require(isinstance(employees, list) and 0 < len(employees) <= 200)
    require(all(isinstance(e, dict) and isinstance(e.get("id"), str) and e["id"].strip() and e.get("employmentType") == "full_time" for e in employees))
    people = [e["id"] for e in employees]
    require(len(people) == len(set(people)))
    known = set(people)
    requirements = {}
    require(isinstance(data.get("staffingRequirements"), list))
    for item in data["staffingRequirements"]:
        require(isinstance(item, dict))
        day, kind, count = date_value(item.get("date")), item.get("shiftKind"), item.get("requiredEmployees")
        require(day in dates and kind in KINDS and type(count) is int and 0 <= count <= 1_000_000)
        require((day, kind) not in requirements)
        requirements[day, kind] = count
    availability = {}
    require(isinstance(data.get("availability"), list))
    for item in data["availability"]:
        require(isinstance(item, dict))
        person, day, kind, available = item.get("employeeId"), date_value(item.get("date")), item.get("shiftKind"), item.get("available")
        require(person in known and day in dates and kind in KINDS and type(available) is bool)
        require((person, day, kind) not in availability)
        availability[person, day, kind] = available
    absences = defaultdict(list)
    require(isinstance(data.get("absences"), list))
    for item in data["absences"]:
        require(isinstance(item, dict) and item.get("employeeId") in known and item.get("status") in ("approved", "pending", "rejected"))
        start, end = date_value(item.get("from")), date_value(item.get("to"))
        require(start <= end and item.get("type") in ("vacation", "sick", "other"))
        if item["status"] == "approved":
            absences[item["employeeId"]].append((start, end))
    zone = ZoneInfo("Europe/Prague")
    history = defaultdict(list)
    complete = {}
    for side in ("before", "after"):
        part = boundary.get(side)
        require(isinstance(part, dict) and type(part.get("complete")) is bool and isinstance(part.get("assignments"), list))
        complete[side] = part["complete"]
        seen = set()
        for item in part["assignments"]:
            require(isinstance(item, dict) and item.get("employeeId") in known)
            person, day, kind = item["employeeId"], date_value(item.get("date")), item.get("shiftKind")
            require(day < first if side == "before" else day > last)
            require((person, day) not in seen)
            seen.add((person, day))
            if kind in KINDS:
                start, end = shift_interval(day, kind, zone)
                if "startTime" in item or "endTime" in item:
                    require(local_instant(day, item.get("startTime"), zone) == start and local_instant(day, item.get("endTime"), zone) == end)
            else:
                require(kind is None)
                start, end = local_instant(day, item.get("startTime"), zone), local_instant(day, item.get("endTime"), zone)
                require(start < end)
            history[person, day].append((start, end))
    timeout = payload.get("timeoutSeconds", 30)
    require(type(timeout) in (int, float) and math.isfinite(timeout) and 0 < timeout <= 300)
    return dates, people, requirements, availability, absences, history, complete, zone, timeout


def _solve(payload):
    try:
        dates, people, requirements, availability, absences, history, complete, zone, timeout = parse(payload)
    except ZoneInfoNotFoundError:
        return {"status": "unavailable"}
    except (InvalidInput, TypeError, ValueError, OverflowError, KeyError):
        return {"status": "invalid_input"}

    first, last = dates[0], dates[-1]
    model = cp_model.CpModel()
    variables = {(person, day, kind): model.new_bool_var(f"x_{p}_{d}_{k}")
                 for p, person in enumerate(people) for d, day in enumerate(dates) for k, kind in enumerate(KINDS)}
    deficits = {}
    for day in dates:
        for kind in KINDS:
            required = requirements.get((day, kind))
            choices = [variables[person, day, kind] for person in people]
            if required is None:
                model.add(sum(choices) == 0)
            else:
                deficit = model.new_int_var(0, required, f"missing_{day}_{kind}")
                model.add(sum(choices) + deficit == required)
                deficits[day, kind] = deficit
        for person in people:
            model.add(sum(variables[person, day, kind] for kind in KINDS) <= 1)
            for kind in KINDS:
                if availability.get((person, day, kind)) is False or any(start <= day <= end for start, end in absences[person]):
                    model.add(variables[person, day, kind] == 0)

    def options(person, day):
        if first <= day <= last:
            return [(variables[person, day, kind], *shift_interval(day, kind, zone)) for kind in KINDS]
        return [(1, start, end) for start, end in history.get((person, day), [])]

    def works(person, day):
        if first <= day <= last:
            return sum(variables[person, day, kind] for kind in KINDS)
        return int(bool(history.get((person, day))))

    for p, person in enumerate(people):
        for offset in range(-7, len(dates)):
            start = first + dt.timedelta(days=offset)
            streak = [start + dt.timedelta(days=i) for i in range(6)]
            sixth = streak[-1]
            for distance in (1, 2):
                following = sixth + dt.timedelta(days=distance)
                if following < first or start > last:
                    continue
                for previous_choice, _, previous_end in options(person, sixth):
                    for next_choice, next_start, _ in options(person, following):
                        if next_start - previous_end < REST:
                            model.add(sum(works(person, day) for day in streak[:5]) + previous_choice + next_choice <= 6)
        monday = first - dt.timedelta(days=first.weekday())
        while monday <= last:
            sunday = monday + dt.timedelta(days=6)
            if (monday >= first or complete["before"]) and (sunday <= last or complete["after"]):
                weekend = model.new_bool_var(f"weekend_{p}_{monday}")
                model.add_max_equality(weekend, [works(person, monday + dt.timedelta(days=i)) for i in (5, 6)])
                model.add(sum(works(person, monday + dt.timedelta(days=i)) for i in range(7)) <= 5).only_enforce_if(weekend)
            monday += dt.timedelta(days=7)
    model.minimize(sum(deficits.values()))
    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = 1
    try:
        status = solver.solve(model)
        if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {
                "status": solver.status_name(status),
                "assignments": [{"employeeId": person, "date": day.isoformat(), "shiftKind": kind}
                                for (person, day, kind), var in variables.items() if solver.value(var)],
                "shortages": [{"date": day.isoformat(), "shiftKind": kind, "missing": solver.value(var)}
                              for (day, kind), var in deficits.items() if solver.value(var)],
                "missingRequirements": [{"date": day.isoformat(), "shiftKind": kind} for day in dates for kind in KINDS if (day, kind) not in requirements],
                "missingAvailability": [{"employeeId": person, "date": day.isoformat(), "shiftKind": kind}
                                        for (person, day, kind), var in variables.items()
                                        if solver.value(var) and (person, day, kind) not in availability],
                "boundaryComplete": complete,
            }
        if status == cp_model.INFEASIBLE:
            return {"status": "INFEASIBLE"}
        if status == cp_model.UNKNOWN:
            return {"status": "UNKNOWN"}
        return {"status": "error"}
    except Exception:
        return {"status": "error"}


def solve(payload):
    try:
        return _solve(payload)
    except Exception:
        return {"status": "error"}
