from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
import httpx
from ..database.client import settings, get_database
from ..models.schemas import UserInDB
from ..security.auth import create_access_token
from datetime import datetime

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.get("/google/url")
async def login_google():
    # For MVP simplicity, always redirect to the dev callback
    # This ensures anyone clicking "Continue with Google" gets logged in immediately
    return {
        "url": "https://dancing-mantis-snore-backend.onrender.com/api/v1/auth/dev/callback"
    }

@router.get("/dev/callback")
async def dev_callback():
    """Mock callback for development without real Google Credentials"""
    
    user_info = {
        "email": "testuser@example.com",
        "id": "dev-dummy-google-id",
        "name": "Test User",
        "picture": "https://via.placeholder.com/150"
    }
    
    db = await get_database()
    existing_user = await db.users.find_one({"email": user_info["email"]})
    
    if existing_user:
        await db.users.update_one(
            {"email": user_info["email"]},
            {"$set": {"updated_at": datetime.utcnow()}}
        )
    else:
        new_user = UserInDB(
            email=user_info["email"],
            google_id=user_info["id"],
            full_name=user_info["name"],
            picture=user_info["picture"],
            refresh_token="dummy_refresh_token"
        )
        user_dict = new_user.model_dump(by_alias=True, exclude={"id"})
        await db.users.insert_one(user_dict)
        
    access_token = create_access_token(data={"sub": user_info["email"]})
    
    # Redirect to frontend (assuming port 5138 based on previous steps, but could be 5137)
    # We'll try 5138 since that was the active one
    frontend_url = "https://dancing-mantis-snore.onrender.com/auth/callback"
    return RedirectResponse(url=f"{frontend_url}?token={access_token}")

@router.get("/google/callback")
async def auth_google(code: str):
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google code")
        
        token_data = response.json()
        access_token_google = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        
        user_info_response = await client.get("https://www.googleapis.com/oauth2/v1/userinfo", headers={"Authorization": f"Bearer {access_token_google}"})
        if user_info_response.status_code != 200:
             raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        user_info = user_info_response.json()
        
    db = await get_database()
    
    existing_user = await db.users.find_one({"email": user_info["email"]})
    
    if existing_user:
        # Update existing user
        update_data = {
            "full_name": user_info.get("name"),
            "picture": user_info.get("picture"),
            "updated_at": datetime.utcnow()
        }
        if refresh_token:
            update_data["refresh_token"] = refresh_token
            
        await db.users.update_one(
            {"email": user_info["email"]},
            {"$set": update_data}
        )
    else:
        # Create new user
        new_user = UserInDB(
            email=user_info["email"],
            google_id=user_info["id"],
            full_name=user_info.get("name"),
            picture=user_info.get("picture"),
            refresh_token=refresh_token
        )
        
        # We exclude 'id' because MongoDB will generate '_id'
        user_dict = new_user.model_dump(by_alias=True, exclude={"id"})
        await db.users.insert_one(user_dict)
        
    # Create backend JWT
    access_token = create_access_token(data={"sub": user_info["email"]})
    
    # Redirect to frontend with token
    # Adjust this URL based on where the frontend handles the callback
    frontend_url = "https://dancing-mantis-snore.onrender.com/auth/callback"
    return RedirectResponse(url=f"{frontend_url}?token={access_token}")