import time
from django.db import connection


class TimingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        stats = {'n': 0, 'ms': 0.0}

        def wrapper(execute, sql, params, many, context):
            t = time.perf_counter()
            try:
                return execute(sql, params, many, context)
            finally:
                stats['n'] += 1
                stats['ms'] += (time.perf_counter() - t) * 1000

        t0 = time.perf_counter()
        with connection.execute_wrapper(wrapper):
            response = self.get_response(request)
        total = (time.perf_counter() - t0) * 1000
        print(f"[timing] {request.path} total={total:.0f}ms db={stats['ms']:.0f}ms queries={stats['n']}")
        return response