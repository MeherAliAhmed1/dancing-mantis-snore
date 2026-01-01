from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
from datetime import datetime, time, date, timedelta
from bson import ObjectId
from ..database import get_database
from ..models import UserInDB, Meeting, MeetingInDB, NextStep, NextStepInDB, NextStepStatus, MeetingUpdate
from ..auth import get_current_user
from ..services.google_calendar import refresh_google_token, fetch_calendar_events, is_online_meeting
from ..services.ai import generate_next_steps

router = APIRouter(
    prefix="/meetings",
    tags=["meetings"],
)

@router.post("/sync")
async def sync_meetings(
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    if not current_user.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not connected to Google Calendar (missing refresh token)"
        )
    
    # 1. Refresh Google Token
    access_token = await refresh_google_token(current_user.refresh_token)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh Google token"
        )
    
    # 2. Fetch Events for Today
    today = datetime.now().date()
    events = await fetch_calendar_events(access_token, today)
    
    # 3. Process and Upsert
    synced_count = 0
    for event in events:
        # Skip cancelled events
        if event.get("status") == "cancelled":
            continue
            
        # Parse start/end times
        start = event.get("start")
        end = event.get("end")
        
        if not start or not end:
            continue
            
        start_dt_str = start.get("dateTime") or start.get("date")
        end_dt_str = end.get("dateTime") or end.get("date")
        
        try:
            # Handle standard ISO format and 'Z'
            if "T" in start_dt_str:
                # Timed event
                if start_dt_str.endswith("Z"):
                     start_dt_str = start_dt_str.replace("Z", "+00:00")
                start_time = datetime.fromisoformat(start_dt_str)
            else:
                 # All day event (YYYY-MM-DD)
                 start_time = datetime.combine(date.fromisoformat(start_dt_str), time.min)
                 
            if "T" in end_dt_str:
                if end_dt_str.endswith("Z"):
                     end_dt_str = end_dt_str.replace("Z", "+00:00")
                end_time = datetime.fromisoformat(end_dt_str)
            else:
                end_time = datetime.combine(date.fromisoformat(end_dt_str), time.max)
                
        except ValueError:
            continue

        meeting_data = MeetingInDB(
            user_id=str(current_user.id),
            google_event_id=event["id"],
            title=event.get("summary", "(No Title)"),
            start_time=start_time,
            end_time=end_time,
            is_online=is_online_meeting(event),
            summary=event.get("description"),
            participants=[p.get("email") for p in event.get("attendees", []) if p.get("email")],
            updated_at=datetime.utcnow()
        )
        
        # Upsert
        # We use $setOnInsert for created_at to preserve original creation time
        await db.meetings.update_one(
            {"user_id": str(current_user.id), "google_event_id": event["id"]},
            {
                "$set": meeting_data.model_dump(by_alias=True, exclude={"id", "created_at"}),
                "$setOnInsert": {"created_at": datetime.utcnow()}
            },
            upsert=True
        )
        synced_count += 1
        
    return {"synced": synced_count}

@router.get("/", response_model=List[Meeting])
async def get_meetings(
    date_query: Optional[date] = Query(None, alias="date"),
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    print(f"DEBUG: get_meetings called. date_query={date_query}, type={type(date_query)}")
    print(f"DEBUG: current_user.id={current_user.id}")
    
    if date_query:
        print("DEBUG: Filtering by specific date")
        start_time = datetime.combine(date_query, time.min)
        end_time = datetime.combine(date_query, time.max)
    else:
        print("DEBUG: Using default date range (last 30 days)")
        # Default: Last 30 days + Today (Expanded for visibility)
        today = datetime.now().date()
        past_date = today - timedelta(days=30)
        start_time = datetime.combine(past_date, time.min)
        end_time = datetime.combine(today, time.max)
    
    print(f"DEBUG: Querying range {start_time} to {end_time}")
    
    query = {
        "user_id": str(current_user.id),
        "start_time": {"$gte": start_time, "$lte": end_time}
    }
    print(f"DEBUG: Query object: {query}")

    cursor = db.meetings.find(query).sort("start_time", 1)
    
    meetings = await cursor.to_list(length=100)
    print(f"DEBUG: Found {len(meetings)} meetings")
    for m in meetings:
        print(f"DEBUG: Meeting: {m['title']} at {m['start_time']}")
        
    return meetings

@router.patch("/{meeting_id}", response_model=Meeting)
async def update_meeting(
    meeting_id: str,
    meeting_update: MeetingUpdate,
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid meeting ID format"
        )
        
    meeting = await db.meetings.find_one({
        "_id": ObjectId(meeting_id),
        "user_id": str(current_user.id)
    })
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
        
    update_data = meeting_update.model_dump(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.meetings.update_one(
        {"_id": ObjectId(meeting_id)},
        {"$set": update_data}
    )
    
    updated_meeting = await db.meetings.find_one({"_id": ObjectId(meeting_id)})
    return updated_meeting

@router.post("/{meeting_id}/generate-actions", response_model=List[NextStep])
async def generate_meeting_actions(
    meeting_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Generate actionable next steps from a meeting summary using AI.
    """
    if not ObjectId.is_valid(meeting_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid meeting ID format"
        )
        
    meeting = await db.meetings.find_one({
        "_id": ObjectId(meeting_id),
        "user_id": str(current_user.id)
    })
    
    if not meeting:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meeting not found"
        )
        
    summary = meeting.get("summary") or ""
    # Fallback to title if summary is empty
    if not summary.strip():
        summary = f"Meeting title: {meeting.get('title')}"
        
    suggested_actions = await generate_next_steps(summary)
    
    created_steps = []
    for action in suggested_actions:
        next_step_data = NextStepInDB(
            meeting_id=meeting_id,
            original_text=action,
            edited_text=action,
            status=NextStepStatus.suggested,
            user_id=str(current_user.id),
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Insert into DB
        result = await db.next_steps.insert_one(
            next_step_data.model_dump(by_alias=True, exclude={"id"})
        )
        
        # Fetch created document
        created_step = await db.next_steps.find_one({"_id": result.inserted_id})
        created_steps.append(created_step)
        
    return created_steps