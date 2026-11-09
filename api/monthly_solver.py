"""Authenticated server-to-server endpoint; never logs requests or rosters."""

import hmac
import json
import os
from http.server import BaseHTTPRequestHandler

from scripts.monthly_solver import solve

MAX_BODY_BYTES = 3_000_000
MODEL_VERSION = "monthly-cpsat-v1"


class handler(BaseHTTPRequestHandler):
    def log_message(self, _format, *_args):
        pass

    def respond(self, status, value):
        body = json.dumps(value, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        token = os.environ.get("PLANNING_ORTOOLS_TOKEN", "")
        supplied = self.headers.get("Authorization", "")
        if len(token) < 32 or not hmac.compare_digest(supplied.encode("utf-8"), ("Bearer " + token).encode("utf-8")):
            self.respond(404, {"status": "unavailable"})
            return
        length = self.headers.get("Content-Length", "")
        if not length.isascii() or not length.isdecimal() or len(length) > 10:
            self.respond(400, {"status": "invalid_input"})
            return
        size = int(length)
        if size <= 0 or size > MAX_BODY_BYTES:
            self.respond(413, {"status": "invalid_input"})
            return
        try:
            body = self.rfile.read(size)
            if len(body) != size:
                raise ValueError()
            payload = json.loads(body)
        except (ValueError, UnicodeError):
            self.respond(400, {"status": "invalid_input"})
            return
        self.respond(200, {**solve(payload), "modelVersion": MODEL_VERSION})
