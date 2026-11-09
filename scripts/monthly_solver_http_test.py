"""Synthetic local HTTP tests; no credentials, databases, or roster data."""
import http.client
import importlib.util
import json
import os
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("solver_http", Path(__file__).resolve().parents[1] / "api" / "monthly_solver.py")
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
TOKEN = "x" * 32


class EndpointTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), module.handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def request(self, body, token=TOKEN, headers=None):
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        request_headers = {"Authorization": "Bearer " + token, **(headers or {})}
        connection.request("POST", "/api/monthly_solver", body=body, headers=request_headers)
        response = connection.getresponse()
        status, data = response.status, json.loads(response.read())
        connection.close()
        return status, data

    def test_authentication_fails_closed(self):
        with patch.dict(os.environ, {"PLANNING_ORTOOLS_TOKEN": TOKEN}), patch.object(module, "solve") as solve:
            self.assertEqual(self.request(b"{}", "wrong")[0], 404)
            solve.assert_not_called()
        with patch.dict(os.environ, {"PLANNING_ORTOOLS_TOKEN": "short"}):
            self.assertEqual(self.request(b"{}", "short")[0], 404)

    def test_valid_post_and_invalid_json(self):
        with patch.dict(os.environ, {"PLANNING_ORTOOLS_TOKEN": TOKEN}), patch.object(module, "solve", return_value={"status": "UNKNOWN"}) as solve:
            self.assertEqual(self.request(b"{}")[1], {"status": "UNKNOWN", "modelVersion": "monthly-cpsat-v1"})
            solve.assert_called_once_with({})
            self.assertEqual(self.request(b"{")[0], 400)

    def test_body_limit(self):
        with patch.dict(os.environ, {"PLANNING_ORTOOLS_TOKEN": TOKEN}), patch.object(module, "solve") as solve:
            self.assertEqual(self.request(b"", headers={"Content-Length": str(module.MAX_BODY_BYTES + 1)})[0], 413)
            solve.assert_not_called()


if __name__ == "__main__":
    unittest.main()
