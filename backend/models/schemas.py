from pydantic import BaseModel, Field, BeforeValidator, ConfigDict
from typing import Optional, Annotated
from datetime import datetime
from enum import Enum

# Represents an ObjectId field in the database.
# It will be represented as a string in the model so that it can be serialized to JSON.
PyObjectId = Annotated[str, BeforeValidator(str)]

class UserBase(BaseModel):
    email: str
    full_name: Optional[str] = None
    picture: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class User(UserBase):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(validation_alias="_id", default=None)
    refresh_token: Optional[str] = None

class UserInDB(User):
    google_id: Optional[str] = None
    hashed_password: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Meeting(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(alias="_id", serialization_alias="id", default=None)
    user_id: str
    google_event_id: str
    title: str
    start_time: datetime
    end_time: datetime
    is_online: bool
    online_meeting_link: Optional[str] = None
    location: Optional[str] = None
    is_recorded: bool = False
    summary: Optional[str] = None
    participants: list[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class MeetingInDB(Meeting):
    pass

class MeetingUpdate(BaseModel):
    summary: Optional[str] = None
    is_recorded: Optional[bool] = None

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class NextStepStatus(str, Enum):
    suggested = "suggested"
    confirmed = "confirmed"
    executed = "executed"
    rejected = "rejected"
    pending = "pending"

class NextStepBase(BaseModel):
    meeting_id: PyObjectId
    original_text: str
    edited_text: Optional[str] = None
    status: NextStepStatus = NextStepStatus.suggested
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    suggested_action_type: Optional[str] = "none"

class NextStepCreate(NextStepBase):
    pass

class NextStepUpdate(BaseModel):
    original_text: Optional[str] = None
    edited_text: Optional[str] = None
    status: Optional[NextStepStatus] = None
    owner: Optional[str] = None
    due_date: Optional[datetime] = None
    notes: Optional[str] = None
    suggested_action_type: Optional[str] = None

class NextStep(NextStepBase):
    model_config = ConfigDict(populate_by_name=True)
    id: Optional[PyObjectId] = Field(alias="_id", serialization_alias="id", default=None)
    user_id: PyObjectId
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class NextStepInDB(NextStep):
    pass