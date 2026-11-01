import json

MAX_BYTES = 2_000_000


class BoundaryError(ValueError):
    pass


def _check_position(p):
    if not isinstance(p, (list, tuple)) or len(p) < 2:
        raise BoundaryError('Coordinates must be [longitude, latitude] pairs.')
    lng, lat = p[0], p[1]
    for v in (lng, lat):
        if isinstance(v, bool) or not isinstance(v, (int, float)):
            raise BoundaryError('Coordinates must be numbers.')
    if not (-180 <= lng <= 180 and -90 <= lat <= 90):
        raise BoundaryError(
            'Coordinates are out of range. The file must use longitude/latitude (WGS84, EPSG:4326).'
        )


def _check_ring(ring):
    if not isinstance(ring, list) or len(ring) < 4:
        raise BoundaryError('Each outline needs at least 4 points.')
    for p in ring:
        _check_position(p)
    if list(ring[0][:2]) != list(ring[-1][:2]):
        raise BoundaryError('An outline is not closed (first and last point differ).')


def _check_polygon(coords):
    if not isinstance(coords, list) or not coords:
        raise BoundaryError('Polygon has no coordinates.')
    for ring in coords:
        _check_ring(ring)


def normalize_boundary(raw, name):
    """Return a GeoJSON Feature (Polygon/MultiPolygon) or raise BoundaryError."""
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raise BoundaryError('The file is not valid JSON.')
    if not isinstance(raw, dict):
        raise BoundaryError('The file is not valid GeoJSON.')
    if len(json.dumps(raw)) > MAX_BYTES:
        raise BoundaryError('The boundary file is too large (max 2 MB).')

    obj = raw
    if obj.get('type') == 'FeatureCollection':
        feats = obj.get('features')
        if not isinstance(feats, list) or len(feats) != 1:
            raise BoundaryError('The file must contain exactly one barangay outline.')
        obj = feats[0]
    geometry = obj.get('geometry') if obj.get('type') == 'Feature' else obj
    if not isinstance(geometry, dict):
        raise BoundaryError('No outline found in the file.')

    gtype, coords = geometry.get('type'), geometry.get('coordinates')
    if gtype == 'Polygon':
        _check_polygon(coords)
    elif gtype == 'MultiPolygon':
        if not isinstance(coords, list) or not coords:
            raise BoundaryError('MultiPolygon has no coordinates.')
        for poly in coords:
            _check_polygon(poly)
    else:
        raise BoundaryError('The outline must be a Polygon or MultiPolygon.')

    return {
        'type': 'Feature',
        'properties': {'adm4_en': name},
        'geometry': {'type': gtype, 'coordinates': coords},
    }


def _in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            inside = not inside
        j = i
    return inside


def _in_polygon(x, y, rings):
    if not _in_ring(x, y, rings[0]):
        return False
    return not any(_in_ring(x, y, hole) for hole in rings[1:])


def point_in_boundary(lng, lat, feature):
    """feature = the normalized GeoJSON Feature stored on Barangay.boundary."""
    geom = feature['geometry']
    if geom['type'] == 'Polygon':
        return _in_polygon(lng, lat, geom['coordinates'])
    return any(_in_polygon(lng, lat, poly) for poly in geom['coordinates'])