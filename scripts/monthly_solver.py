"""Local CP-SAT solver for one monthly draft. JSON in/out; never logs input."""

import calendar
import datetime as dt
import json
import re
import sys
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from ortools.sat.python import cp_model

KINDS = ("morning", "afternoon")
MAX_EMPLOYEES = 200
MINIMUM_REST = dt.timedelta(hours=35)


class InvalidInput(Exception):
    pass


def _has_minimum_rest(previous_end, next_start):
    return next_start - previous_end >= MINIMUM_REST


def _require(condition):
    if not condition:
        raise InvalidInput


def _validate(payload):
    _require(isinstance(payload, dict) and set(payload) >= {"input", "boundary"})
    data = payload["input"]
    boundary = payload["boundary"]
    _require(isinstance(data, dict) and isinstance(boundary, dict))
    month = data.get("month")
    _require(isinstance(month, str) and re.fullmatch(r"\d{4}-(0[1-9]|1[0-2])", month))
    year, month_number = map(int, month.split("-"))
    first = dt.date(year, month_number, 1)
    last = dt.date(year, month_number, calendar.monthrange(year, month_number)[1])
    dates = [first + dt.timedelta(days=i) for i in range((last - first).days + 1)]
    date_set = {date.isoformat() for date in dates}

    employees = data.get("employees")
    _require(isinstance(employees, list) and 0 < len(employees) <= MAX_EMPLOYEES)
    people = [item.get("id") if isinstance(item, dict) else None for item in employees]
    _require(all(isinstance(person, str) and person for person in people) and len(set(people)) == len(people))
    people_set = set(people)

    requirements = {}
    staffing = data.get("staffingRequirements")
    _require(isinstance(staffing, list) and len(staffing) == len(dates) * len(KINDS))
    for item in staffing:
        _require(isinstance(item, dict) and item.get("date") in date_set and item.get("shiftKind") in KINDS)
        count = item.get("requiredEmployees")
        _require(isinstance(count, int) and not isinstance(count, bool) and count >= 0)
        key = (item["date"], item["shiftKind"])
        _require(key not in requirements)
        requirements[key] = count
    _require(len(requirements) == len(dates) * len(KINDS))

    absences = data.get("absences")
    _require(isinstance(absences, list))
    for item in absences:
        _require(isinstance(item, dict) and item.get("employeeId") in people_set)
        _require(item.get("status") in ("approved", "pending", "rejected"))
        try:
            start = dt.date.fromisoformat(item.get("from", ""))
            end = dt.date.fromisoformat(item.get("to", ""))
        except (TypeError, ValueError):
            raise InvalidInput
        _require(start <= end and item.get("type") in ("vacation", "sick", "other"))

    availability = {}
    items = data.get("availability")
    _require(isinstance(items, list))
    for item in items:
        _require(isinstance(item, dict) and item.get("employeeId") in people_set)
        _require(item.get("date") in date_set and item.get("shiftKind") in KINDS)
        _require(type(item.get("available")) is bool)
        key = (item["employeeId"], item["date"], item["shiftKind"])
        _require(key not in availability)
        availability[key] = item["available"]

    shift_rotation = data.get("shiftRotationPreference", False)
    _require(type(shift_rotation) is bool)

    history = {}
    history_complete = {}
    for side in ("before", "after"):
        value = boundary.get(side)
        _require(isinstance(value, dict) and type(value.get("complete")) is bool)
        history_complete[side] = value["complete"]
        assignments = value.get("assignments")
        _require(isinstance(assignments, list))
        for item in assignments:
            _require(isinstance(item, dict) and item.get("employeeId") in people_set and item.get("shiftKind") in KINDS)
            try:
                day = dt.date.fromisoformat(item.get("date", ""))
            except (TypeError, ValueError):
                raise InvalidInput
            _require((side == "before" and day < first) or (side == "after" and day > last))
            key = (item["employeeId"], day, item["shiftKind"])
            _require(key not in history)
            history[key] = True
    by_person_day = set()
    for person, day, _kind in history:
        key = (person, day)
        _require(key not in by_person_day)
        by_person_day.add(key)

    timeout = payload.get("timeoutSeconds", 30)
    _require(isinstance(timeout, (int, float)) and not isinstance(timeout, bool) and 0.05 <= timeout <= 30)
    return data, first, last, dates, people, requirements, availability, history, history_complete, shift_rotation, float(timeout)


def solve(payload):
    try:
        data, first, last, dates, people, requirements, availability, history, history_complete, shift_rotation, timeout = _validate(payload)
    except (InvalidInput, TypeError, ValueError, KeyError, OverflowError):
        return {"status": "invalid_input"}

    model = cp_model.CpModel()
    choices = {
        (person, day, kind): model.new_bool_var(f"x_{person_index}_{day_index}_{kind_index}")
        for person_index, person in enumerate(people)
        for day_index, day in enumerate(dates)
        for kind_index, kind in enumerate(KINDS)
    }

    def shift(person, day, kind):
        if day < first or day > last:
            return int(history.get((person, day, kind), False))
        return choices[(person, day, kind)]

    def works(person, day):
        return sum(shift(person, day, kind) for kind in KINDS)

    for day in dates:
        for kind in KINDS:
            model.add(sum(shift(person, day, kind) for person in people) == requirements[(day.isoformat(), kind)])
        for person in people:
            model.add(works(person, day) <= 1)
            for kind in KINDS:
                absent = any(
                    item["employeeId"] == person and item["status"] == "approved"
                    and item["from"] <= day.isoformat() <= item["to"]
                    for item in data["absences"]
                )
                if absent or availability.get((person, day.isoformat(), kind)) is False:
                    model.add(shift(person, day, kind) == 0)

    try:
        zone = ZoneInfo("Europe/Prague")
    except ZoneInfoNotFoundError:
        return {"status": "unavailable"}

    def moment(day, kind, end):
        if kind == "morning":
            clock = dt.time(16, 30) if end else dt.time(7, 45)
        elif end:
            clock = dt.time(21, 0)
        else:
            clock = dt.time(12, 45) if day.weekday() >= 5 else dt.time(13, 15)
        return dt.datetime.combine(day, clock, zone).astimezone(dt.timezone.utc)

    for person in people:
        # A six-day working streak must be followed by 35 continuous hours off.
        for start_offset in range(-6, len(dates)):
            start = first + dt.timedelta(days=start_offset)
            streak = [start + dt.timedelta(days=index) for index in range(6)]
            sixth = streak[-1]
            for distance in (1, 2):
                next_day = sixth + dt.timedelta(days=distance)
                if next_day < first or start > last:
                    continue
                for streak_kind in KINDS:
                    for next_kind in KINDS:
                        if not _has_minimum_rest(moment(sixth, streak_kind, True), moment(next_day, next_kind, False)):
                            model.add(
                                sum(works(person, day) for day in streak[:5])
                                + shift(person, sixth, streak_kind)
                                + shift(person, next_day, next_kind) <= 6
                            )

        monday = first - dt.timedelta(days=first.weekday())
        while monday <= last:
            sunday = monday + dt.timedelta(days=6)
            complete = (monday >= first or history_complete["before"]) and (sunday <= last or history_complete["after"])
            if complete:
                weekend = model.new_bool_var(f"weekend_{people.index(person)}_{monday.isoformat()}")
                model.add_max_equality(weekend, [shift(person, monday + dt.timedelta(days=index), kind) for index in (5, 6) for kind in KINDS])
                model.add(sum(works(person, monday + dt.timedelta(days=index)) for index in range(7)) <= 5).only_enforce_if(weekend)
            monday += dt.timedelta(days=7)

    if shift_rotation:
        rotation_penalties = []
        for person in people:
            latest_before = max((day for (history_person, day, _kind) in history
                                 if history_person == person and day < first), default=None) if history_complete["before"] else None
            previous_morning = model.new_bool_var(f"last_morning_before_{people.index(person)}")
            previous_afternoon = model.new_bool_var(f"last_afternoon_before_{people.index(person)}")
            model.add(previous_morning == int(latest_before is not None and history.get((person, latest_before, "morning"), False)))
            model.add(previous_afternoon == int(latest_before is not None and history.get((person, latest_before, "afternoon"), False)))

            after_assignments = [day for (history_person, day, _kind) in history
                                 if history_person == person and day > last] if history_complete["after"] else []
            final_day = max(after_assignments, default=last)
            day = first
            while day <= final_day:
                morning = shift(person, day, "morning")
                afternoon = shift(person, day, "afternoon")
                worked = works(person, day)
                for kind, current, previous in (
                    ("morning", morning, previous_morning),
                    ("afternoon", afternoon, previous_afternoon),
                ):
                    repeat = model.new_bool_var(f"repeat_{people.index(person)}_{day.isoformat()}_{kind}")
                    model.add(repeat <= current)
                    model.add(repeat <= previous)
                    model.add(repeat >= current + previous - 1)
                    rotation_penalties.append(repeat)

                    carry = model.new_bool_var(f"carry_{people.index(person)}_{day.isoformat()}_{kind}")
                    model.add(carry <= previous)
                    model.add(carry + worked <= 1)
                    model.add(carry >= previous - worked)
                    following = model.new_bool_var(f"last_{people.index(person)}_{day.isoformat()}_{kind}")
                    model.add(following == current + carry)
                    if kind == "morning":
                        previous_morning = following
                    else:
                        previous_afternoon = following
                day += dt.timedelta(days=1)
        if rotation_penalties:
            model.minimize(sum(rotation_penalties))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = timeout
    solver.parameters.num_search_workers = 1
    try:
        status = solver.solve(model)
    except Exception:
        return {"status": "error"}
    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return {
            "status": "feasible",
            "assignments": [
                {"employeeId": person, "date": day.isoformat(), "shiftKind": kind}
                for (person, day, kind), variable in choices.items() if solver.value(variable)
            ],
        }
    if status == cp_model.INFEASIBLE:
        return {"status": "infeasible"}
    return {"status": "unknown"}


if __name__ == "__main__":
    try:
        result = solve(json.load(sys.stdin))
    except Exception:
        result = {"status": "error"}
    print(json.dumps(result, ensure_ascii=False, separators=(",", ":")))
