"""Repeatable synthetic local benchmark; does not test hosting or persistence."""

import json
import time
from concurrent.futures import ProcessPoolExecutor

import monthly_solver


def synthetic_request():
    days = [f"2026-11-{day:02d}" for day in range(1, 31)]
    people = [f"employee-{index}" for index in range(100)]
    return {
        "input": {
            "month": "2026-11",
            "employees": [{"id": person, "employmentType": "full_time"} for person in people],
            "absences": [],
            "availability": [{"employeeId": person, "date": day, "shiftKind": kind, "available": True}
                             for person in people for day in days for kind in monthly_solver.KINDS],
            "staffingRequirements": [{"date": day, "shiftKind": kind, "requiredEmployees": 20}
                                     for day in days for kind in monthly_solver.KINDS],
        },
        "boundary": {"before": {"complete": True, "assignments": []}, "after": {"complete": True, "assignments": []}},
        "timeoutSeconds": 10,
    }


def measure(request):
    started = time.perf_counter()
    result = monthly_solver.solve(request)
    found = result["status"] in ("OPTIMAL", "FEASIBLE")
    return {
        "wallSeconds": round(time.perf_counter() - started, 3),
        "status": result["status"],
        "assignments": len(result["assignments"]) if found else None,
        "missing": sum(item["missing"] for item in result["shortages"]) if found else None,
    }


def main():
    request = synthetic_request()
    sequential = [measure(request) for _ in range(3)]
    started = time.perf_counter()
    with ProcessPoolExecutor(max_workers=2) as pool:
        concurrent = list(pool.map(measure, (request, request)))
    concurrent_wall = round(time.perf_counter() - started, 3)
    immediate = {**request, "timeoutSeconds": 1e-9}
    high_demand = synthetic_request()
    for item in high_demand["input"]["staffingRequirements"]:
        item["requiredEmployees"] = 45
    print(json.dumps({
        "syntheticEmployees": 100,
        "inputBytes": len(json.dumps(request, separators=(",", ":")).encode("utf-8")),
        "sequential": sequential,
        "twoProcesses": concurrent,
        "twoProcessesWallSeconds": concurrent_wall,
        "tinySolverTimeLimit": measure(immediate),
        "highDemand45PerShift": measure(high_demand),
    }, indent=2))


if __name__ == "__main__":
    main()
