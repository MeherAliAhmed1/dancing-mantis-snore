import asyncio
from datetime import datetime, timedelta
from database import db, settings
from models import UserInDB, MeetingInDB, NextStepInDB, NextStepStatus
import os

# Ensure we use the real DB
os.environ["MONGODB_URI"] = settings.MONGODB_URI

async def seed():
    print("Connecting to database...")
    await db.connect()
    database = db.get_db()
    
    # Wait for connection
    try:
        await database.command("ping")
        print("Connected successfully.")
    except Exception as e:
        print(f"Failed to connect: {e}")
        return

    # 1. Ensure Test User Exists
    email = "testuser@example.com"
    user = await database.users.find_one({"email": email})
    
    if not user:
        print(f"Creating test user: {email}")
        new_user = UserInDB(
            email=email,
            google_id="dev-dummy-google-id",
            full_name="Test User",
            picture="https://via.placeholder.com/150",
            refresh_token="dummy_refresh_token"
        )
        user_dict = new_user.model_dump(by_alias=True, exclude={"id"})
        result = await database.users.insert_one(user_dict)
        user_id = str(result.inserted_id)
    else:
        print(f"Found existing test user: {email}")
        user_id = str(user["_id"])

    # 2. Clear existing data for this user (optional, but good for clean slate)
    await database.meetings.delete_many({"user_id": user_id})
    await database.next_steps.delete_many({"user_id": user_id})
    print("Cleared old data.")

    # 3. Create Dummy Meetings
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    
    meetings_data = []

    # Add meetings for today
    meetings_data.extend([
        {
            "title": "Daily Standup",
            "start_time": today + timedelta(hours=9),
            "end_time": today + timedelta(hours=9, minutes=30),
            "is_online": True,
            "online_meeting_link": "https://meet.google.com/abc-defg-hij",
            "is_recorded": True,
            "summary": "Discussed daily progress. Blockers identified in frontend integration.",
            "participants": ["alice@example.com", "bob@example.com"]
        },
        {
            "title": "Product Design Review",
            "start_time": today + timedelta(hours=11),
            "end_time": today + timedelta(hours=12),
            "is_online": True,
            "online_meeting_link": "https://zoom.us/j/123456789",
            "is_recorded": True,
            "summary": "Reviewed the new dashboard designs. Approved the color scheme.",
            "participants": ["designer@example.com", "pm@example.com"]
        },
        {
            "title": "Client Sync: ACME Corp",
            "start_time": today + timedelta(hours=14),
            "end_time": today + timedelta(hours=15),
            "is_online": True,
            "online_meeting_link": "https://meet.google.com/xyz-uvw-rst",
            "is_recorded": True,
            "summary": "Client requested changes to the reporting module. Need to send updated timeline.",
            "participants": ["client@acme.com", "sales@example.com"]
        },
         {
            "title": "Offline Brainstorming",
            "start_time": today + timedelta(hours=16),
            "end_time": today + timedelta(hours=17),
            "is_online": False,
            "location": "Conference Room A",
            "is_recorded": False,
            "summary": None,
            "participants": ["team@example.com"]
        }
    ])

    # Add meetings for the last 7 days
    for i in range(1, 8):
        past_date = today - timedelta(days=i)
        
        meetings_data.extend([
            {
                "title": f"Daily Standup",
                "start_time": past_date + timedelta(hours=9),
                "end_time": past_date + timedelta(hours=9, minutes=30),
                "is_online": True,
                "online_meeting_link": "https://meet.google.com/abc-defg-hij",
                "is_recorded": True,
                "summary": f"Standup summary for {past_date.strftime('%Y-%m-%d')}.",
                "participants": ["alice@example.com", "bob@example.com"]
            },
            {
                "title": f"Client Catch-up",
                "start_time": past_date + timedelta(hours=15),
                "end_time": past_date + timedelta(hours=16),
                "is_online": True,
                "online_meeting_link": "https://zoom.us/j/987654321",
                "is_recorded": True,
                "summary": f"Discussed project status for {past_date.strftime('%Y-%m-%d')}.",
                "participants": ["client@example.com"]
            }
        ])

    print(f"Inserting {len(meetings_data)} meetings...")
    
    meeting_ids = []
    for m in meetings_data:
        meeting_in_db = MeetingInDB(
            user_id=user_id,
            google_event_id=f"dummy-event-{m['title'].replace(' ', '-')}-{m['start_time'].timestamp()}",
            title=m["title"],
            start_time=m["start_time"],
            end_time=m["end_time"],
            is_online=m["is_online"],
            online_meeting_link=m.get("online_meeting_link"),
            location=m.get("location"),
            is_recorded=m.get("is_recorded", False),
            summary=m["summary"],
            participants=m["participants"]
        )
        res = await database.meetings.insert_one(meeting_in_db.model_dump(by_alias=True, exclude={"id"}))
        meeting_ids.append((str(res.inserted_id), m["title"], m["start_time"]))

    # 4. Create Dummy Next Steps
    print("Inserting next steps...")
    
    next_steps_data = []

    # Find specific meetings from today to add detailed next steps
    client_meeting_today = next((mid for mid, title, start in meeting_ids if "Client Sync" in title and start.date() == today.date()), None)
    standup_meeting_today = next((mid for mid, title, start in meeting_ids if "Daily Standup" in title and start.date() == today.date()), None)
    design_meeting_today = next((mid for mid, title, start in meeting_ids if "Product Design" in title and start.date() == today.date()), None)

    if client_meeting_today:
        next_steps_data.extend([
            {
                "meeting_id": client_meeting_today,
                "text": "Email updated timeline to ACME Corp",
                "status": NextStepStatus.suggested,
                "owner": "Me",
                "due_date": today + timedelta(days=1)
            },
            {
                "meeting_id": client_meeting_today,
                "text": "Update Jira tickets with client feedback",
                "status": NextStepStatus.confirmed,
                "owner": "Sarah",
                "due_date": today + timedelta(days=2)
            }
        ])
    
    if standup_meeting_today:
        next_steps_data.append({
            "meeting_id": standup_meeting_today,
            "text": "Schedule deep dive on frontend blockers",
            "status": NextStepStatus.suggested,
            "owner": "Bob",
            "due_date": today
        })

    if design_meeting_today:
        next_steps_data.append({
            "meeting_id": design_meeting_today,
            "text": "Share color palette with marketing team",
            "status": NextStepStatus.pending,
            "owner": "Designer",
            "due_date": today + timedelta(days=3)
        })

    # Add random next steps for past meetings
    for mid, title, start_time in meeting_ids:
        if start_time.date() < today.date():
            # Add a completed step
            next_steps_data.append({
                "meeting_id": mid,
                "text": f"Follow up on action items from {title}",
                "status": NextStepStatus.executed,
                "owner": "Me",
                "due_date": start_time + timedelta(days=1)
            })
            # Add a pending step for some variety
            if "Client" in title:
                next_steps_data.append({
                    "meeting_id": mid,
                    "text": "Send contract for review",
                    "status": NextStepStatus.pending,
                    "owner": "Sales",
                    "due_date": start_time + timedelta(days=2)
                })

    for ns in next_steps_data:
        step_in_db = NextStepInDB(
            meeting_id=ns["meeting_id"],
            user_id=user_id,
            original_text=ns["text"],
            status=ns["status"],
            owner=ns.get("owner"),
            due_date=ns.get("due_date")
        )
        await database.next_steps.insert_one(step_in_db.model_dump(by_alias=True, exclude={"id"}))

    print("Seed data populated successfully!")
    db.close()

if __name__ == "__main__":
    asyncio.run(seed())