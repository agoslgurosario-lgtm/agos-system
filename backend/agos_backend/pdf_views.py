import re

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.permissions import IsAdminOrMENRO
from agos_backend.pdf_utils import render_to_pdf

MAX_ROWS = 20000
MAX_COLUMNS = 30
MAX_CELL_LENGTH = 1000


class TablePdfExportView(APIView):
    """
    POST /api/export/table-pdf/
    Body: { title, columns: [str], rows: [[str|number]], orientation?: 'portrait'|'landscape' }

    Renders the table a page already shows into the standard AGOS report PDF. iPhone and
    iPad Safari ignore window.print(), so the web app sends the same rows it would print.
    """
    permission_classes = [IsAdminOrMENRO]

    def post(self, request):
        data = request.data
        title = str(data.get('title') or '').strip()[:200]
        columns = data.get('columns')
        rows = data.get('rows')
        orientation = data.get('orientation') if data.get('orientation') in ('portrait', 'landscape') else 'landscape'

        if not title:
            return Response({'error': 'A title is required.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(columns, list) or not columns or len(columns) > MAX_COLUMNS:
            return Response({'error': 'Columns are missing or invalid.'}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(rows, list) or len(rows) > MAX_ROWS:
            return Response({'error': f'Rows are missing or more than {MAX_ROWS}.'}, status=status.HTTP_400_BAD_REQUEST)

        columns = [str(c)[:100] for c in columns]
        clean_rows = []
        for row in rows:
            if not isinstance(row, list):
                return Response({'error': 'Every row must be a list.'}, status=status.HTTP_400_BAD_REQUEST)
            clean_rows.append([str(cell)[:MAX_CELL_LENGTH] for cell in row[:MAX_COLUMNS]])

        filename = re.sub(r'[^A-Za-z0-9._-]+', '-', title).strip('-').lower() or 'report'

        return render_to_pdf(
            report_title=title,
            columns=columns,
            rows=clean_rows,
            generated_by=f"{request.user.first_name} {request.user.last_name}",
            orientation=orientation,
            filename=f"{filename}.pdf",
        )
