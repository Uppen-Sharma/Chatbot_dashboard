"""
Dashboard Service
=================
All business logic for the dashboard API.  Routes call into this module
and never touch the database or build response dicts themselves.

Metric functions (get_stats, get_peak_usage, get_faqs) now execute live
SQL queries instead of returning hardcoded data.  All computations are
derived from the three tables that exist in the database:
  conversations  →  user activity, session durations, date-bucketed counts
  messages       →  most-asked questions (FAQ) via GROUP BY user_message
  feedback       →  satisfaction rate (like / dislike ratio)
"""

from typing import List, Optional
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func, and_

from src.db.models import Conversation, Message, Feedback
from src.core.utils import format_dur, format_date, parse_date_range


# Internal Filter Helpers

def _cf(start_dt, end_dt) -> list:
    """WHERE clauses for Conversation.created_at."""
    f = []
    if start_dt:
        f.append(Conversation.created_at >= start_dt)
    if end_dt:
        f.append(Conversation.created_at <= end_dt)
    return f


def _mf(start_dt, end_dt) -> list:
    """WHERE clauses for Message.created_at."""
    f = []
    if start_dt:
        f.append(Message.created_at >= start_dt)
    if end_dt:
        f.append(Message.created_at <= end_dt)
    return f


def _ff(start_dt, end_dt) -> list:
    """WHERE clauses for Feedback.created_at."""
    f = []
    if start_dt:
        f.append(Feedback.created_at >= start_dt)
    if end_dt:
        f.append(Feedback.created_at <= end_dt)
    return f


# Peak-Usage Lookup Tables

# MySQL DAYOFWEEK(): 1=Sun, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat
_DOW_ORDER = [2, 3, 4, 5, 6, 7, 1]              # Mon → Sun
_DOW_META = {
    2: ("Mon", "Monday"),
    3: ("Tue", "Tuesday"),
    4: ("Wed", "Wednesday"),
    5: ("Thu", "Thursday"),
    6: ("Fri", "Friday"),
    7: ("Sat", "Saturday"),
    1: ("Sun", "Sunday"),
}

_MONTH_ORDER = list(range(1, 13))
_MONTH_META = {
    1:  ("Jan", "January"),   2:  ("Feb", "February"),
    3:  ("Mar", "March"),     4:  ("Apr", "April"),
    5:  ("May", "May"),       6:  ("Jun", "June"),
    7:  ("Jul", "July"),      8:  ("Aug", "August"),
    9:  ("Sep", "September"), 10: ("Oct", "October"),
    11: ("Nov", "November"),  12: ("Dec", "December"),
}


def _split_heights(total_pct: int):
    """Split a total 0-95 percentage into stacked Low / Med / High segments.

    The layered-pill chart expects:
      val3 (High front layer)  = top 25 %
      val2 (Med middle layer)  = next 40 %
      val1 (Low back layer)    = remaining ~35 %
    """
    val3 = round(total_pct * 0.25)
    val2 = round(total_pct * 0.40)
    val1 = max(0, total_pct - val3 - val2)
    return val1, val2, val3


# Live Metric Queries

async def get_stats(
    start: Optional[str], end: Optional[str], db: AsyncSession
) -> List[dict]:
    """
    Return KPI stat cards computed from live database data.

    Cards returned:
      1. Active Users      — distinct emails with conversations in the date range
      2. Total Conversations — total sessions in the date range
      3. Satisfaction Rate  — like/(like+dislike) from the feedback table
    """
    start_dt, end_dt, _ = parse_date_range(start, end)
    conv_filters = _cf(start_dt, end_dt)
    fb_filters   = _ff(start_dt, end_dt)

    # Active users in selected period
    q_active = select(func.count(func.distinct(Conversation.user_email)))
    if conv_filters:
        q_active = q_active.where(and_(*conv_filters))
    active_users: int = (await db.execute(q_active)).scalar() or 0

    # Total distinct users ever (for the "X / Y total" sub-value)
    total_users: int = (
        await db.execute(
            select(func.count(func.distinct(Conversation.user_email)))
        )
    ).scalar() or 0

    # Total conversations in range
    q_convos = select(func.count(Conversation.id))
    if conv_filters:
        q_convos = q_convos.where(and_(*conv_filters))
    total_convos: int = (await db.execute(q_convos)).scalar() or 0

    # Satisfaction rate from feedback
    q_fb = select(
        func.count(Feedback.id).label("total"),
        func.sum(func.if_(Feedback.feedback_type == "like", 1, 0)).label("likes"),
    )
    if fb_filters:
        q_fb = q_fb.where(and_(*fb_filters))
    fb_row = (await db.execute(q_fb)).one_or_none()
    total_fb: int = int((fb_row.total or 0) if fb_row else 0)
    likes:    int = int((fb_row.likes or 0) if fb_row else 0)

    sat_rate = round((likes / total_fb) * 100) if total_fb > 0 else None
    badge = (
        "No Data"  if sat_rate is None  else
        "Good"     if sat_rate >= 75    else
        "Moderate" if sat_rate >= 50    else
        "Bad"
    )

    engagement_pct = round((active_users / total_users) * 100) if total_users > 0 else 0

    return [
        {
            "title":    "Active Users",
            "value":    str(active_users),
            "subValue": f"/ {total_users}",
            "trend":    f"{engagement_pct}% Engagement Rate",
            "up":       engagement_pct > 50,
            "iconName": "Zap",
        },
        {
            "title":    "Total Conversations",
            "value":    f"{total_convos:,}",
            "trend":    "Selected Period",
            "up":       True,
            "iconName": "Eye",
        },
        {
            "title":    "Satisfaction Rate",
            "value":    f"{sat_rate}%" if sat_rate is not None else "N/A",
            "badge":    badge,
            "iconName": "Lightbulb",
        },
    ]


async def get_peak_usage(
    start: Optional[str], end: Optional[str], db: AsyncSession
) -> List[dict]:
    """
    Return bar-chart data for peak usage.  The view type is chosen
    automatically based on how many days the selected range spans:

      delta ==  0 days       -> Hourly View   hour-by-hour (only hours with data)
      delta  1-14 days       -> Daily View    each individual date (only dates with data)
      delta 15-90 days       -> Weekly View   Mon-Sun aggregated pattern (only days with data)
      delta 91-730 days      -> Monthly View  months within selected range only
      delta 730+ days        -> Yearly View   one bar per calendar year
      no range (delta = -1)  -> Weekly View   default overview

    Examples:
      Jan 1  -> Jan 7   =   6 days  -> Daily   (6 date bars)
      Jan 1  -> Jan 14  =  13 days  -> Daily   (13 date bars)
      Jan 1  -> Jan 31  =  30 days  -> Weekly  (Mon-Sun pattern for January)
      Jan 1  -> Apr 1   =  90 days  -> Weekly  (Mon-Sun pattern for Q1)
      Jan 1  -> Apr 17  = 107 days  -> Monthly (Jan / Feb / Mar / Apr only)
      Jan 1  -> Dec 31  = 364 days  -> Monthly (Jan through Dec)
      2020   -> 2026    = 2300days  -> Yearly  (2020 / 2021 / ... / 2026)
    """
    start_dt, end_dt, delta_days = parse_date_range(start, end)
    conv_filters = _cf(start_dt, end_dt)

    # Choose view type based on range length
    if delta_days == 0:
        # Same day: break down by hour
        group_expr = func.hour(Conversation.created_at)
        view_type  = "Hourly View"
        mode       = "hourly"

    elif 1 <= delta_days <= 14:
        # Up to 2 weeks: show each specific date as its own bar
        group_expr = func.date(Conversation.created_at)
        view_type  = "Daily View"
        mode       = "daily"

    elif delta_days <= 90:
        # 2 weeks to 3 months: show Mon-Sun aggregated usage pattern
        group_expr = func.dayofweek(Conversation.created_at)
        view_type  = "Weekly View"
        mode       = "weekly"

    elif delta_days <= 730:
        # 3 months to 2 years: show month-by-month totals (range-filtered)
        group_expr = func.month(Conversation.created_at)
        view_type  = "Monthly View"
        mode       = "monthly"

    elif delta_days > 730:
        # More than 2 years: one bar per calendar year
        group_expr = func.year(Conversation.created_at)
        view_type  = "Yearly View"
        mode       = "yearly"

    else:
        # No date range given (delta_days == -1): default weekly pattern
        group_expr = func.dayofweek(Conversation.created_at)
        view_type  = "Weekly View"
        mode       = "weekly"


    q = (
        select(
            group_expr.label("bucket"),
            func.count(Conversation.id).label("count"),
        )
        .group_by(group_expr)
        .order_by(group_expr)
    )
    if conv_filters:
        q = q.where(and_(*conv_filters))

    result = await db.execute(q)
    rows   = result.all()
    raw    = {r.bucket: r.count for r in rows}

    # No data at all — return empty list (frontend shows empty state)
    if not rows:
        return []

    # Scale all counts so the tallest bar = 95 %
    max_count = max(r.count for r in rows) or 1

    # Hourly mode: only hours where conversations happened
    if mode == "hourly":
        chart_data = []
        for r in sorted(rows, key=lambda x: x.bucket):
            hour = int(r.bucket)
            pct  = round(r.count / max_count * 95)
            v1, v2, v3 = _split_heights(pct)
            label = f"{hour:02d}h"
            hover = f"{hour:02d}:00 - {hour:02d}:59"
            chart_data.append({
                "label":      label,
                "val1":       v1,
                "val2":       v2,
                "val3":       v3,
                "viewType":   view_type,
                "hoverLabel": hover,
            })
        return chart_data

    # Daily mode: only dates that have data
    if mode == "daily":
        chart_data = []
        for r in rows:   # already ORDER BY date from the SQL query
            pct = round(r.count / max_count * 95)
            v1, v2, v3 = _split_heights(pct)
            label = (
                r.bucket.strftime("%b %d")
                if hasattr(r.bucket, "strftime")
                else str(r.bucket)
            )
            chart_data.append({
                "label":      label,
                "val1":       v1,
                "val2":       v2,
                "val3":       v3,
                "viewType":   view_type,
                "hoverLabel": f"{label} Usage",
            })
        return chart_data

    # Weekly mode: only days-of-week that have data, in Mon-Sun order
    if mode == "weekly":
        chart_data = []
        for dow in _DOW_ORDER:       # preserves Mon->Sun chronological order
            count = raw.get(dow, 0)
            if count == 0:
                continue             # skip days with no conversations
            pct = round(count / max_count * 95)
            v1, v2, v3 = _split_heights(pct)
            label, full = _DOW_META[dow]
            chart_data.append({
                "label":      label,
                "val1":       v1,
                "val2":       v2,
                "val3":       v3,
                "viewType":   view_type,
                "hoverLabel": f"{full} Usage",
            })
        return chart_data

    # Monthly mode: only months within the selected date range
    if mode == "monthly":
        # Walk month-by-month from start to end so order is always chronological.
        # This correctly handles cross-year ranges (e.g. Sep 2025 -> Mar 2026).
        if start_dt and end_dt:
            ordered_months = []
            seen = set()
            curr = start_dt.replace(day=1, hour=0, minute=0, second=0)
            stop = end_dt.replace(day=1, hour=0, minute=0, second=0)
            while curr <= stop:
                if curr.month not in seen:
                    ordered_months.append(curr.month)
                    seen.add(curr.month)
                # Advance one month
                if curr.month == 12:
                    curr = curr.replace(year=curr.year + 1, month=1)
                else:
                    curr = curr.replace(month=curr.month + 1)
        else:
            # No bounds given — show only months that have data
            ordered_months = sorted(raw.keys())

        chart_data = []
        for month in ordered_months:
            count = raw.get(month, 0)
            pct   = round(count / max_count * 95)
            v1, v2, v3 = _split_heights(pct)
            label, full = _MONTH_META[month]
            chart_data.append({
                "label":      label,
                "val1":       v1,
                "val2":       v2,
                "val3":       v3,
                "viewType":   view_type,
                "hoverLabel": f"{full} Usage",
            })
        return chart_data

    # Yearly mode: each calendar year as one bar
    # Build the year range from query results (or fall back to date params)
    if rows:
        min_year = min(raw.keys())
        max_year = max(raw.keys())
    else:
        min_year = start_dt.year if start_dt else 2020
        max_year = end_dt.year   if end_dt   else datetime.now().year

    chart_data = []
    for year in range(min_year, max_year + 1):
        count = raw.get(year, 0)
        pct   = round(count / max_count * 95)
        v1, v2, v3 = _split_heights(pct)
        chart_data.append({
            "label":      str(year),
            "val1":       v1,
            "val2":       v2,
            "val3":       v3,
            "viewType":   view_type,
            "hoverLabel": f"{year} Usage",
        })
    return chart_data





async def get_faqs(
    start: Optional[str], end: Optional[str], db: AsyncSession
) -> List[dict]:
    """
    Return the top 5 most frequently asked questions from the messages table.

    The query groups rows by the exact user_message text, counts occurrences,
    and picks one bot_response (MIN is deterministic in MySQL) as the answer.
    This turns real chatbot conversation data into a live FAQ list.
    """
    start_dt, end_dt, _ = parse_date_range(start, end)

    base_filters = [
        Message.user_message.isnot(None),
        Message.bot_response.isnot(None),
    ]
    msg_filters = _mf(start_dt, end_dt)
    if msg_filters:
        base_filters.extend(msg_filters)

    q = (
        select(
            Message.user_message.label("question"),
            # MIN() picks one representative answer deterministically
            func.min(Message.bot_response).label("answer"),
            func.count(Message.id).label("count"),
        )
        .where(and_(*base_filters))
        .group_by(Message.user_message)
        .order_by(func.count(Message.id).desc())
        .limit(5)
    )

    result = await db.execute(q)
    rows   = result.all()

    if not rows:
        return []

    return [
        {
            # Truncate very long questions to 200 chars for readability
            "question": (r.question[:200] + "…") if len(r.question) > 200 else r.question,
            "answer":   r.answer or "No answer available.",
            "count":    r.count,
        }
        for r in rows
    ]


# Live User / Chat Queries

async def fetch_enriched_users(db: AsyncSession) -> List[dict]:
    """
    Build an enriched user list from the conversations + feedback tables.

    For each unique user email we compute:
      - convos      : total conversation count
      - lastActive  : formatted date of their most recent message
      - avgDur      : average session duration (last_message_at - created_at)
      - rating      : 0–5 star rating derived from like/dislike feedback ratio
      - progress    : 0–100 bar value, scaled relative to the longest session
    """
    # Subquery 1: aggregate conversation stats per user email
    conv_sq = (
        select(
            Conversation.user_email.label("email"),
            func.count(Conversation.id).label("conv_count"),
            func.max(Conversation.last_message_at).label("last_active"),
            func.avg(
                func.unix_timestamp(Conversation.last_message_at)
                - func.unix_timestamp(Conversation.created_at)
            ).label("avg_dur_sec"),
        )
        .group_by(Conversation.user_email)
        .subquery("conv_sq")
    )

    # Subquery 2: aggregate feedback tallies per user email
    fb_sq = (
        select(
            Feedback.user_email.label("email"),
            func.sum(func.if_(Feedback.feedback_type == "like", 1, 0)).label("likes"),
            func.count(Feedback.id).label("total_fb"),
        )
        .group_by(Feedback.user_email)
        .subquery("fb_sq")
    )

    # Join both subqueries on email
    stmt = (
        select(
            conv_sq.c.email,
            conv_sq.c.conv_count,
            conv_sq.c.last_active,
            conv_sq.c.avg_dur_sec,
            fb_sq.c.likes,
            fb_sq.c.total_fb,
        )
        .select_from(conv_sq)
        .outerjoin(fb_sq, conv_sq.c.email == fb_sq.c.email)
    )

    result = await db.execute(stmt)
    rows   = result.all()

    max_dur = max((r.avg_dur_sec or 0 for r in rows), default=1) or 1

    users = []
    for r in rows:
        avg_sec  = r.avg_dur_sec or 0
        likes    = int(r.likes    or 0)
        total_fb = int(r.total_fb or 0)

        rating   = round((likes / total_fb) * 5) if total_fb > 0 else 0
        progress = min(100, round((avg_sec / max_dur) * 100)) if max_dur > 0 else 0
        username = r.email.split("@")[0]

        users.append({
            "id":         r.email,
            "email":      r.email,
            "name":       username.capitalize(),
            "handle":     f"@{username}",
            "convos":     r.conv_count,
            "lastActive": format_date(r.last_active),
            "rating":     rating,
            "avgDur":     format_dur(avg_sec),
            "progress":   progress,
        })

    return users


async def fetch_user_chats(user_id: str, db: AsyncSession) -> List[dict]:
    """Return all conversations for a given user, newest first."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_email == user_id)
        .order_by(Conversation.created_at.desc())
    )
    chats = result.scalars().all()
    return [
        {
            "id":            c.id,
            "title":         c.title or "New Conversation",
            "lastMessage":   c.last_message,
            "lastMessageAt": c.last_message_at.isoformat() if c.last_message_at else None,
            "totalMessages": c.total_messages,
        }
        for c in chats
    ]


async def fetch_chat_messages(chat_id: str, db: AsyncSession) -> List[dict]:
    """
    Return all messages for a conversation as alternating user/bot pairs.
    Each DB row produces one user message and (optionally) one bot response.
    """
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == chat_id)
        .order_by(Message.created_at.asc())
    )
    messages = result.scalars().all()

    formatted = []
    for m in messages:
        formatted.append({
            "id":        f"{m.id}-user",
            "type":      "user",
            "text":      m.user_message,
            "timestamp": m.created_at.isoformat() if m.created_at else None,
        })
        if m.bot_response:
            ts = m.responded_at or m.created_at
            formatted.append({
                "id":        f"{m.id}-bot",
                "type":      "bot",
                "text":      m.bot_response,
                "timestamp": ts.isoformat() if ts else None,
            })

    return formatted


async def remove_conversation_data(chat_id: str, db: AsyncSession) -> dict:
    """
    Hard-delete all data belonging to a conversation:
      1. Feedback rows
      2. Conversation (CASCADE removes child messages automatically)
    """
    await db.execute(delete(Feedback).where(Feedback.conversation_id == chat_id))
    await db.execute(delete(Conversation).where(Conversation.id == chat_id))
    await db.commit()
    return {"success": True, "message": f"Conversation {chat_id} and all related data deleted."}
