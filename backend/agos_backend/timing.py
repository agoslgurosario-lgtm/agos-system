import time
from django.db import connection

class TimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    def __call__(self, request):
        t = time.perf_counter()
        n0 = len(connection.queries)
        response = self.get_response(request)
        print(f"[timing] {request.path} {(time.perf_counter()-t)*1000:.0f}ms")
        return response