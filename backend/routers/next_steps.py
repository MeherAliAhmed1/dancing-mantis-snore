from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

from ..database.client import get_database
from ..models.schemas import UserInDB, NextStep, NextStepCreate, NextStepUpdate, NextStepInDB, NextStepStatus
from ..security.auth import get_current_user
from ..services.google_calendar import refresh_google_token
from ..services.gmail import create_draft

router = APIRouter(
    prefix="/next-steps",
    tags=["next-steps"],
)

@router.post("/", response_model=NextStep, status_code=status.HTTP_201_CREATED)
async def create_next_step(
    next_step: NextStepCreate,
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Create a new next step.
    """
    next_step_data = NextStepInDB(
        **next_step.model_dump(),
        user_id=str(current_user.id),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    new_next_step = await db.next_steps.insert_one(
        next_step_data.model_dump(by_alias=True, exclude={"id"})
    )
    
    created_next_step = await db.next_steps.find_one(
        {"_id": new_next_step.inserted_id}
    )
    
    return created_next_step

@router.get("/", response_model=List[NextStep])
async def get_next_steps(
    meeting_id: Optional[str] = Query(None),
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Get next steps. Can filter by meeting_id.
    """
    query = {"user_id": str(current_user.id)}
    
    if meeting_id:
        query["meeting_id"] = meeting_id
        
    cursor = db.next_steps.find(query).sort("created_at", -1)
    next_steps = await cursor.to_list(length=100)
    
    return next_steps

@router.patch("/{step_id}", response_model=NextStep)
async def update_next_step(
    step_id: str,
    update_data: NextStepUpdate,
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Update a next step.
    """
    if not ObjectId.is_valid(step_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid step ID format"
        )
        
    # Find the next step and ensure it belongs to the user
    existing_step = await db.next_steps.find_one({
        "_id": ObjectId(step_id),
        "user_id": str(current_user.id)
    })
    
    if not existing_step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Next step not found"
        )
        
    # Filter out None values from update data
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if not update_dict:
        return existing_step
        
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.next_steps.update_one(
        {"_id": ObjectId(step_id)},
        {"$set": update_dict}
    )
    
    updated_step = await db.next_steps.find_one({"_id": ObjectId(step_id)})
    return updated_step

@router.delete("/{step_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_next_step(
    step_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Delete a next step.
    """
    if not ObjectId.is_valid(step_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid step ID format"
        )
        
    result = await db.next_steps.delete_one({
        "_id": ObjectId(step_id),
        "user_id": str(current_user.id)
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Next step not found"
        )
    
    return None

@router.post("/{step_id}/execute", response_model=NextStep)
async def execute_next_step(
    step_id: str,
    current_user: UserInDB = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Execute a next step by creating a Gmail draft.
    """
    if not ObjectId.is_valid(step_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid step ID format"
        )

    # 1. Fetch NextStep
    next_step = await db.next_steps.find_one({
        "_id": ObjectId(step_id),
        "user_id": str(current_user.id)
    })
    
    if not next_step:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Next step not found"
        )
        
    # 2. Fetch linked Meeting
    meeting = await db.meetings.find_one({
        "_id": ObjectId(next_step["meeting_id"]),
        "user_id": str(current_user.id)
    })
    
    if not meeting:
         raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Linked meeting not found"
        )

    # 3. Get fresh Google Access Token
    if not current_user.refresh_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not connected to Google (missing refresh token)"
        )
        
    access_token = await refresh_google_token(current_user.refresh_token)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh Google token"
        )

    # 4. Create Draft
    # Construct email details
    recipients = meeting.get("participants", [])
    
    subject = f"Action Item: {next_step.get('edited_text') or next_step.get('original_text')}"
    body = f"""
Hello,

Following up on our meeting "{meeting.get('title')}", here is an action item:

{next_step.get('edited_text') or next_step.get('original_text')}

Regards,
{current_user.full_name or 'Daily Action Hub User'}
    """
    
    draft = await create_draft(access_token, recipients, subject, body.strip())
    
    if not draft:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create Gmail draft"
        )

    # 5. Update Status
    await db.next_steps.update_one(
        {"_id": ObjectId(step_id)},
        {"$set": {"status": NextStepStatus.executed, "updated_at": datetime.utcnow()}}
    )
    
    updated_step = await db.next_steps.find_one({"_id": ObjectId(step_id)})
    return updated_step