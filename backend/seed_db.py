#!/usr/bin/env python3
"""
Database Seed Script -- chat_bot_data
=====================================
Generates realistic random test data spanning 2020-01-01 -> today.

What gets created:
  - 20 unique users (via distinct user_email values)
  - ~600-900 conversations distributed across 6 years
  - 3-12 messages per conversation
  - ~30% of messages get feedback (like or dislike)

Weighting:
  - More conversations in recent years (2024-2026)
  - Business hours (9am-6pm) get more traffic
  - Monday-Friday get more traffic than weekends

Usage (from the backend/ directory):
    python seed_db.py

    # Override DB credentials via env vars if needed:
    DB_USER=admin DB_PASS=secret python seed_db.py
"""

import asyncio
import os
import random
import uuid
from datetime import datetime, timedelta

import aiomysql

# ─── DB Config  (reads from env, falls back to defaults) ──────────────────────
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", 3306))
DB_USER = os.getenv("DB_USER", "root")
DB_PASS = os.getenv("DB_PASS", "root")
DB_NAME = os.getenv("DB_NAME", "chat_bot_data")

# ─── Seed Bounds ──────────────────────────────────────────────────────────────
START_DATE = datetime(2020, 1, 1)
END_DATE   = datetime.now()

random.seed(42)  # Reproducible results -- remove to get different data each run

# ─── Users ────────────────────────────────────────────────────────────────────
USERS = [
    "priya.sharma@acmecorp.com",
    "james.wilson@techfleet.in",
    "sarah.chen@globallogix.com",
    "ravi.kumar@connectsys.io",
    "emily.carter@urbanmobility.net",
    "daniel.okafor@ridepro.com",
    "aisha.patel@nexustech.co",
    "liam.nguyen@velocitycorp.in",
    "amara.diallo@fleetmaster.com",
    "noah.brooks@cargosmart.net",
    "nina.ivanova@trackify.io",
    "carlos.reyes@driveline.com",
    "fatima.al-hassan@routeiq.in",
    "tom.harrison@syncfleet.com",
    "mei.liu@rapidroute.net",
    "samuel.osei@logitrack.io",
    "ana.costa@maplogix.com",
    "kenji.tanaka@fleetops.co",
    "zara.ahmed@movesmart.in",
    "ethan.murphy@drivedata.net",
]

# ─── Conversation Topics (used to generate realistic titles) ──────────────────
TOPICS = [
    "Password Reset Help",
    "Vehicle Location Query",
    "Export Report Request",
    "Driver Assignment Issue",
    "Fleet Maintenance Alert",
    "Route Optimisation Query",
    "Fuel Report Question",
    "Dashboard Navigation Help",
    "Trip History Enquiry",
    "User Access Management",
    "Geofence Configuration",
    "Alert Settings Help",
    "API Integration Query",
    "Billing Information Request",
    "Driver Performance Review",
    "Vehicle Registration Update",
    "Account Settings Change",
    "Notification Preferences",
    "Data Export Format Query",
    "Support Ticket Follow-up",
    "Speed Limit Alert Config",
    "SOS Response Enquiry",
    "Idle Time Report",
    "Temperature Sensor Data",
    "ETA Calculation Help",
    "Multi-stop Route Planning",
    "Vehicle Inspection Checklist",
    "Daily Mileage Summary",
]

# ─── Realistic Chatbot Question-Answer Pairs ──────────────────────────────────
QA_PAIRS = [
    (
        "How do I reset my password?",
        "Go to **Settings -> Account -> Security** and click *Reset Password*. Enter your registered email address and we'll send a reset link. The link expires in 30 minutes.",
    ),
    (
        "Where is my vehicle right now?",
        "Open the **Live Map** from the main dashboard. All active vehicles appear as coloured pins with their current speed and status (Running / Idle / Offline). Click any pin for detailed info.",
    ),
    (
        "How do I export a report?",
        "Navigate to **Reports -> Export**. Choose your report type (Trips, Fuel, Idle Time, etc.), set the date range, then click *Download as CSV* or *Download as PDF*.",
    ),
    (
        "How can I assign a driver to a vehicle?",
        "Go to **Fleet -> Vehicles**, select the vehicle, then click *Assign Driver*. Search for the driver by name or ID and confirm. The assignment takes effect immediately.",
    ),
    (
        "I am not receiving maintenance alerts, what should I do?",
        "Check **Settings -> Notifications** and ensure Maintenance Alerts are enabled. Also verify your email or SMS number is correct. If alerts are enabled but not arriving, check your spam folder or contact support.",
    ),
    (
        "How do I create a geofence?",
        "Open the **Map** view and click *Draw Geofence* in the top toolbar. Drag to draw a boundary area. Name the geofence, select which vehicles it applies to, and save. You will receive alerts when vehicles enter or exit.",
    ),
    (
        "How do I view the fuel consumption report?",
        "Go to **Reports -> Fuel**. Select the vehicle(s) and date range. The report shows litres consumed, cost, and efficiency trends. You can compare multiple vehicles side by side.",
    ),
    (
        "Can I download trip history for a specific driver?",
        "Yes. Go to **Reports -> Trips**, filter by Driver Name, set your date range, and click Export. You will get a detailed log including start/end locations, distance, duration, and average speed.",
    ),
    (
        "How do I add a new user to the dashboard?",
        "Go to **Settings -> Users -> Invite User**. Enter their email address and assign a role (Admin, Manager, or Viewer). They'll receive an invite email to set their password.",
    ),
    (
        "What does the orange vehicle icon mean on the map?",
        "An **orange icon** means the vehicle is **idle** -- the engine is running but the vehicle hasn't moved in the last 5 minutes. A green icon means it's moving, and grey means the vehicle is offline.",
    ),
    (
        "How do I set up speed alerts?",
        "Go to **Alerts -> Speed Limit**. Set your speed threshold (e.g. 80 km/h), select the vehicles to monitor, and choose your notification method (email, SMS, or in-app). Save to activate.",
    ),
    (
        "The map is not loading, how do I fix it?",
        "Try a **hard refresh** (Ctrl+Shift+R). If the map still doesn't load, check your internet connection and ensure WebGL is enabled in your browser. Clearing the browser cache usually resolves persistent map issues.",
    ),
    (
        "How do I configure idle time alerts?",
        "Navigate to **Alerts -> Idle Time**. Set the idle duration threshold (e.g. 10 minutes), choose which vehicles to monitor, and set up your preferred notification method. The system will alert you each time a vehicle exceeds the idle limit.",
    ),
    (
        "Can I see historical routes on the map?",
        "Yes. Open **Reports -> Trip Playback**. Select the vehicle and date, then press Play to watch the route being replayed on the map. You can adjust playback speed and pause at any point.",
    ),
    (
        "How do I update a vehicle's registration number?",
        "Go to **Fleet -> Vehicles**, click the vehicle you want to update, then select *Edit Vehicle*. Update the registration number field and click Save.",
    ),
    (
        "What is the SOS button for?",
        "The **SOS button** in the driver mobile app sends an emergency alert to all dashboard administrators with the vehicle's current GPS location. A push notification and email are sent immediately.",
    ),
    (
        "How do I generate a daily mileage report?",
        "Go to **Reports -> Mileage**, select *Daily* from the grouping dropdown, choose your vehicle(s) and date range, then click Generate. The report shows total km per vehicle per day.",
    ),
    (
        "Why is the GPS location showing incorrectly?",
        "GPS accuracy can be affected by poor satellite signal (underground parking, tunnels, dense buildings). Wait 2-3 minutes for the signal to recalibrate. If the issue persists, the device may need a firmware update -- contact your hardware support team.",
    ),
    (
        "How do I change my notification email address?",
        "Go to **Settings -> Profile -> Contact Information**. Update your email address and click Save. A verification email will be sent to the new address -- click the link to confirm the change.",
    ),
    (
        "Can I set different permission levels for different users?",
        "Yes. Go to **Settings -> Users**, click a user, then select *Edit Role*. Available roles are: **Admin** (full access), **Manager** (manage fleet and reports), and **Viewer** (read-only access to maps and reports).",
    ),
    (
        "How do I see which vehicles are due for service?",
        "Open **Fleet -> Maintenance**. Vehicles due for service in the next 30 days are highlighted in amber. Overdue vehicles appear in red. Click any vehicle to view its service history and schedule the next service.",
    ),
    (
        "Is there a mobile app available?",
        "Yes! The **Driver App** is available on both iOS and Android. Search for the app in your respective store. The Admin Dashboard is also fully responsive and works on mobile browsers.",
    ),
    (
        "How do I interpret the driver score?",
        "The **Driver Score** (0-100) is calculated based on: speeding events (-5 pts each), harsh braking (-3 pts), sharp cornering (-2 pts), and idle time (-1 pt per 10 min). Smooth, on-time driving maintains a high score.",
    ),
    (
        "How do I bulk import vehicles?",
        "Go to **Fleet -> Vehicles -> Import**. Download the CSV template, fill in the vehicle details, and re-upload the file. The system validates each row and shows any errors before committing the import.",
    ),
    (
        "What data does the temperature sensor capture?",
        "If your vehicle has a temperature sensor installed, it records the cargo compartment temperature every 5 minutes. View this data under **Reports -> Sensor Data**. Alerts can be configured for temperature thresholds.",
    ),
]

# ─── Helper Functions ─────────────────────────────────────────────────────────

def new_id() -> str:
    return str(uuid.uuid4())


def weighted_datetime() -> datetime:
    """
    Generate a random datetime between START_DATE and END_DATE.
    Weighted so that:
      - recent years have more conversations
      - business hours (9am-6pm) are busier
      - weekdays are busier than weekends
    """
    # Year weights: ramp up over time
    year_pool = (
        [2020] * 5
        + [2021] * 8
        + [2022] * 12
        + [2023] * 18
        + [2024] * 25
        + [2025] * 22
        + [2026] * 10   # only Jan-Apr 2026
    )
    year = random.choice(year_pool)

    # Build a valid date within that year
    year_start = datetime(year, 1, 1)
    if year == END_DATE.year:
        year_end = END_DATE
    else:
        year_end = datetime(year, 12, 31, 23, 59, 59)

    # Pick a random day with weekday weighting
    days_in_year = (year_end - year_start).days
    for _ in range(50):  # max attempts to find a weekday
        day_offset = random.randint(0, days_in_year)
        candidate = year_start + timedelta(days=day_offset)
        # Mon-Fri: 85% chance to keep, Sat-Sun: 30% chance
        if candidate.weekday() < 5 or random.random() < 0.30:
            break

    # Business-hour weighted time of day
    hour = random.choices(
        range(24),
        weights=[1, 1, 1, 1, 1, 2, 3, 5, 8, 9, 9, 9, 8, 9, 9, 8, 7, 6, 5, 3, 2, 2, 1, 1],
    )[0]
    minute = random.randint(0, 59)
    second = random.randint(0, 59)

    return candidate.replace(hour=hour, minute=minute, second=second)


def make_conversation_title() -> str:
    return random.choice(TOPICS)


def pick_qa_pairs(n: int):
    """Pick n Q&A pairs without full replacement (repeats allowed for FAQ effect)."""
    # Weight some pairs higher so they appear as "frequently asked"
    weights = [4, 4, 3, 2, 3, 2, 3, 2, 2, 2, 2, 2, 2, 2, 1, 1, 2, 1, 1, 1, 2, 1, 1, 1, 1]
    # Pad weights if QA_PAIRS is longer
    w = (weights + [1] * len(QA_PAIRS))[:len(QA_PAIRS)]
    return random.choices(QA_PAIRS, weights=w, k=n)


# ─── Main Seeder ──────────────────────────────────────────────────────────────

async def seed():
    print("=" * 60)
    print("  Chatbot Dashboard -- Database Seeder")
    print(f"  Target: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")
    print(f"  Range : {START_DATE.date()} -> {END_DATE.date()}")
    print("=" * 60)

    conn = await aiomysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASS,
        db=DB_NAME,
        charset="utf8mb4",
        autocommit=False,
    )

    async with conn.cursor() as cur:

        # ── Clear existing data (FK-safe order) ──────────────────────────────
        print("\n[1/5] Clearing existing data …")
        await cur.execute("SET FOREIGN_KEY_CHECKS = 0")
        await cur.execute("DELETE FROM feedback")
        await cur.execute("DELETE FROM messages")
        await cur.execute("DELETE FROM conversations")
        await cur.execute("SET FOREIGN_KEY_CHECKS = 1")
        await conn.commit()
        print("      OK Tables cleared")

        # ── Generate conversations ────────────────────────────────────────────
        print("\n[2/5] Generating conversations …")
        all_conversations = []   # (conv_id, user_email, created_at, last_message_at)

        for user_email in USERS:
            # Each user gets 25-60 conversations spread over the 6 years
            n_convos = random.randint(25, 60)

            for _ in range(n_convos):
                conv_id     = new_id()
                created_at  = weighted_datetime()
                n_messages  = random.randint(3, 12)
                # Session duration: 1 min – 40 min
                session_sec = random.randint(60, 60 * 40)
                last_msg_at = created_at + timedelta(seconds=session_sec)
                # Clamp to end date
                if last_msg_at > END_DATE:
                    last_msg_at = END_DATE

                title = make_conversation_title()
                all_conversations.append((
                    conv_id, user_email, title,
                    created_at, last_msg_at, n_messages,
                ))

        print(f"      OK Planned {len(all_conversations)} conversations for {len(USERS)} users")

        # ── Insert conversations + messages + feedback ─────────────────────────
        print("\n[3/5] Inserting conversations, messages, and feedback …")

        total_messages  = 0
        total_feedback  = 0
        conv_batch      = []
        msg_batch       = []
        fb_batch        = []
        BATCH_SIZE      = 100  # commit every N conversations

        for idx, (conv_id, user_email, title, created_at, last_msg_at, n_messages) in enumerate(all_conversations):

            # ── Messages for this conversation ────────────────────────────────
            qa_for_conv = pick_qa_pairs(n_messages)
            last_bot_response = ""
            total_tokens_conv = 0

            # Space messages evenly across the session window
            session_span = (last_msg_at - created_at).total_seconds()
            msg_times = sorted(
                created_at + timedelta(seconds=random.uniform(0, session_span))
                for _ in range(n_messages)
            )

            for i, (q, a) in enumerate(qa_for_conv):
                msg_id       = new_id()
                msg_created  = msg_times[i]
                responded_at = msg_created + timedelta(seconds=random.randint(1, 8))
                tokens       = random.randint(60, 400)
                total_tokens_conv += tokens

                msg_batch.append((
                    msg_id, conv_id, q, a, tokens,
                    msg_created, responded_at,
                ))
                last_bot_response = a
                total_messages += 1

                # ~30 % of messages get feedback
                if random.random() < 0.30:
                    fb_type    = "like" if random.random() < 0.72 else "dislike"
                    fb_comment = ""
                    if random.random() < 0.15:
                        fb_comment = random.choice([
                            "Very helpful, thanks!",
                            "That solved my issue.",
                            "Didn't quite answer my question.",
                            "Needs more detail.",
                            "Perfect, exactly what I needed.",
                            "Could be clearer.",
                            "Great explanation!",
                            "Still confused.",
                        ])
                    fb_batch.append((
                        new_id(), msg_id, conv_id, user_email, fb_type, fb_comment, msg_created,
                    ))
                    total_feedback += 1

            conv_batch.append((
                conv_id, user_email, title,
                last_bot_response[:500] if last_bot_response else "",
                last_msg_at, n_messages, total_tokens_conv, created_at,
            ))

            # Commit in batches
            if len(conv_batch) >= BATCH_SIZE or idx == len(all_conversations) - 1:
                await cur.executemany(
                    """INSERT INTO conversations
                       (id, user_email, title, last_message, last_message_at,
                        total_messages, total_tokens, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                    conv_batch,
                )
                await cur.executemany(
                    """INSERT INTO messages
                       (id, conversation_id, user_message, bot_response,
                        total_tokens, created_at, responded_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    msg_batch,
                )
                await cur.executemany(
                    """INSERT INTO feedback
                       (id, message_id, conversation_id, user_email,
                        feedback_type, comment, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, %s)""",
                    fb_batch,
                )
                await conn.commit()

                done = idx + 1
                pct  = done / len(all_conversations) * 100
                print(f"      {done:>4}/{len(all_conversations)}  ({pct:5.1f}%)  "
                      f"batch committed ({len(conv_batch)} convos)", end="\r")

                conv_batch.clear()
                msg_batch.clear()
                fb_batch.clear()

        print()  # newline after \r

        # ── Summary ───────────────────────────────────────────────────────────
        print("\n[4/5] Verifying row counts …")
        await cur.execute("SELECT COUNT(*) FROM conversations")
        r_conv = (await cur.fetchone())[0]
        await cur.execute("SELECT COUNT(*) FROM messages")
        r_msg = (await cur.fetchone())[0]
        await cur.execute("SELECT COUNT(*) FROM feedback")
        r_fb = (await cur.fetchone())[0]
        await cur.execute("SELECT COUNT(DISTINCT user_email) FROM conversations")
        r_users = (await cur.fetchone())[0]

        print(f"      Users         : {r_users}")
        print(f"      Conversations : {r_conv}")
        print(f"      Messages      : {r_msg}")
        print(f"      Feedback rows : {r_fb}")

    conn.close()

    print("\n[5/5] Done! OK")
    print("\n  Start the backend with: python run.py")
    print("  Then open:              http://localhost:5000/docs")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed())
