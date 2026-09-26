"""
Single source of truth for node ↔ hotspot assignment changes.

Every path that attaches or detaches a hotspot (the PATCH on
sensor-nodes/<id>/, unassign/, retire/, mark-maintenance/,
mark-available/) must go through here, or the assignment history
will have gaps. Invariant: at most one open row (ended_at IS NULL)
per node.
"""
from django.db import transaction
from django.utils import timezone

from django.db.models import Q
from .models import NodeAssignmentHistory


def get_open_assignment(node):
    """The node's current (unclosed) assignment row, or None."""
    return NodeAssignmentHistory.objects.filter(
        node=node, ended_at__isnull=True
    ).order_by('-started_at').first()


def close_open_assignment(node, reason, user=None, when=None):
    """
    Closes whatever open row the node has. Safe to call when there
    isn't one (a node assigned before this feature existed, or one
    that was never deployed). Returns the closed row, or None.
    """
    row = get_open_assignment(node)
    if row is None:
        return None
    end_time = when or timezone.now()
    if end_time < row.started_at:
        end_time = row.started_at
    row.ended_at = end_time
    row.end_reason = reason
    row.ended_by = user
    row.save(update_fields=['ended_at', 'end_reason', 'ended_by'])
    return row


def open_assignment(node, hotspot, started_at=None, user=None):
    """
    Opens a new row from the given hotspot, snapshotting the names so
    the history survives the hotspot or barangay being deleted later.
    """
    barangay = hotspot.barangay if hotspot else None
    return NodeAssignmentHistory.objects.create(
        node=node,
        hotspot=hotspot,
        hotspot_name=hotspot.name if hotspot else '',
        barangay=barangay,
        barangay_name=barangay.barangay_name if barangay else '',
        started_at=started_at or timezone.now(),
        assigned_by=user,
    )


@transaction.atomic
def assign_node(node, hotspot, installed_at=None, user=None):
    """
    Attaches `hotspot` to `node`: closes any open row as Reassigned,
    opens a new one, and syncs the node's own fields. Used by the
    assign/move paths and by mark-available.
    """
    started_at = installed_at or timezone.now()

    close_open_assignment(node, reason='Reassigned', user=user)

    node.hotspot = hotspot
    node.barangay = hotspot.barangay
    node.availability_status = 'Occupied'
    node.installed_at = started_at
    node.save(update_fields=[
        'hotspot', 'barangay', 'availability_status', 'installed_at'
    ])

    return open_assignment(node, hotspot, started_at=started_at, user=user)


@transaction.atomic
def release_node(node, reason, user=None, availability_status='Available'):
    """
    Detaches the node's hotspot and barangay, closing its open row with
    `reason` (Unassigned | Maintenance | Retired). Pass
    availability_status='Retired' for the retire path.
    """
    closed = close_open_assignment(node, reason=reason, user=user)

    node.hotspot = None
    node.barangay = None
    node.availability_status = availability_status
    node.save(update_fields=['hotspot', 'barangay', 'availability_status'])

    return closed


@transaction.atomic
def sync_assignment_change(node, previous_hotspot_id, user=None, installed_at=None):
    """
    History-only reconciliation for the PATCH path, where the serializer
    has already written the node's fields. Compares what the node has
    now against what it had before and writes the matching rows.
    """
    now_id = node.hotspot_id

    if previous_hotspot_id == now_id:
        # Same hotspot — only an install-date edit can matter here.
        if installed_at:
            row = get_open_assignment(node)
            if row:
                row.started_at = installed_at
                row.save(update_fields=['started_at'])
        return

    started_at = installed_at or node.installed_at or timezone.now()

    if now_id is None:
        close_open_assignment(node, reason='Unassigned', user=user)
        return

    close_open_assignment(
        node,
        reason='Reassigned' if previous_hotspot_id else 'Reassigned',
        user=user,
    )
    open_assignment(node, node.hotspot, started_at=started_at, user=user)


def hotspot_at(node, timestamp):
    """
    Returns (hotspot, hotspot_name, barangay, barangay_name) as of
    `timestamp`, from the assignment history (D1). Falls back to the
    node's current hotspot/barangay when no history row covers that
    timestamp — events older than the seeded history, or from a gap
    while the node was unassigned.
    """
    row = NodeAssignmentHistory.objects.filter(
        node=node, started_at__lte=timestamp
    ).filter(
        Q(ended_at__isnull=True) | Q(ended_at__gt=timestamp)
    ).order_by('-started_at').first()

    if row:
        return row.hotspot, row.hotspot_name, row.barangay, row.barangay_name

    return (
        node.hotspot,
        node.hotspot.name if node.hotspot else '',
        node.barangay,
        node.barangay.barangay_name if node.barangay else '',
    )