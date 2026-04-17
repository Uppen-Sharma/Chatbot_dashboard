"""
Utility Helpers
===============
Shared, stateless helper functions used across the backend.
Keep this module free of any framework or database imports.
"""

from datetime import datetime
from typing import Optional, Tuple


def format_dur(seconds) -> str:
    """Convert a float of seconds into a human-readable 'Xm Ys' string.

    Examples:
        format_dur(90)   → '1m 30s'
        format_dur(60)   → '1m'
        format_dur(45)   → '45s'
        format_dur(None) → 'N/A'
    """
    if seconds is None or seconds <= 0:
        return "N/A"
    total = int(seconds)
    m, s = divmod(total, 60)
    if m and s:
        return f"{m}m {s}s"
    return f"{m}m" if m else f"{s}s"


def format_date(dt) -> str:
    """Format a datetime object as a short 'Mon D' string (e.g. 'Apr 8').

    Returns 'N/A' when dt is None.
    """
    if dt is None:
        return "N/A"
    return f"{dt.strftime('%b')} {dt.day}"


def parse_date_range(
    start: Optional[str],
    end: Optional[str],
) -> Tuple[Optional[datetime], Optional[datetime], int]:
    """Parse ISO date strings ('YYYY-MM-DD') into datetime objects.

    The end date is extended to 23:59:59 so that same-day queries include
    all events that happened on that day.

    Returns:
        (start_dt, end_dt, delta_days)
        delta_days == -1  when either bound is absent (no date filter applied)
        delta_days ==  0  when start == end (same-day selection -> hourly view)
        delta_days >   0  normal multi-day range
    """
    start_dt = end_dt = None
    delta_days = -1          # -1 = "no range specified"
    try:
        if start:
            start_dt = datetime.strptime(start, "%Y-%m-%d")
        if end:
            end_dt = datetime.strptime(end, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59
            )
        if start_dt and end_dt:
            delta_days = (end_dt - start_dt).days
    except ValueError:
        pass  # Invalid strings — treat as "no filter"
    return start_dt, end_dt, delta_days
