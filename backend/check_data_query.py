import asyncio
from database import db, settings
from models import UserInDB
import os
from datetime import datetime, timedelta, time

# Ensure we use the real DB
os.environ["MONGODB_URI"] = settings.MONGODB_URI

async def check():
    print("Connecting to database...")
    await db.connect()
    database = db.get_db()
    
    email = "testuser@example.com"
    user = await database.users.find_one({"email": email})
    
    if not user:
        print(f"User {email} not found.")
        return

    user_id = str(user["_id"])
    print(f"User ID: {user_id}")

    # Replicate backend logic
    today = datetime.now().date()
    seven_days_ago = today - timedelta(days=7)
    start_time = datetime.combine(seven_days_ago, time.min)
    end_time = datetime.combine(today, time.max)

    print(f"Querying range: {start_time} to {end_time}")

    cursor = database.meetings.find({
        "user_id": user_id,
        "start_time": {"$gte": start_time, "$lte": end_time}
    }).sort("start_time", 1)
    
    meetings = await cursor.to_list(length=100)
    print(f"Found {len(meetings)} meetings with query.")

    for m in meetings:
        print(f"Meeting: {m['title']} | Start: {m['start_time']}")

    db.close()

if __name__ == "__main__":
    asyncio.run(check())