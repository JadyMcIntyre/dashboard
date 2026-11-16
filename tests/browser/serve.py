"""Serve the compiled site to concurrent local browser tests."""

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class TestServer(ThreadingHTTPServer):
    request_queue_size = 64


class TestHandler(SimpleHTTPRequestHandler):
    def log_request(self, code="-", size="-"):
        if str(code).startswith(("4", "5")):
            super().log_request(code, size)


with TestServer(("127.0.0.1", 4173), partial(TestHandler, directory="dist")) as server:
    server.serve_forever()
