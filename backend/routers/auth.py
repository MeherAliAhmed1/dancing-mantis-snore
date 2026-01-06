from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
import httpx
from ..database.client import settings, get_database
from ..models.schemas import UserInDB, UserCreate, UserLogin
from ..security.auth import create_access_token, get_password_hash, verify_password
from datetime import datetime

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(user: UserCreate):
    db = await get_database()
    existing_user = await db.users.find_one({"email": user.email})
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    hashed_password = get_password_hash(user.password)
    new_user = UserInDB(
        email=user.email,
        full_name=user.full_name,
        picture=user.picture,
        hashed_password=hashed_password,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    # We exclude 'id' because MongoDB will generate '_id'
    user_dict = new_user.model_dump(by_alias=True, exclude={"id"})
    await db.users.insert_one(user_dict)
    
    # Auto-login after registration
    access_token = create_access_token(data={"sub": new_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/login")
async def login(user_credentials: UserLogin):
    db = await get_database()
    user = await db.users.find_one({"email": user_credentials.email})
    
    if not user or not user.get("hashed_password") or not verify_password(user_credentials.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user["email"]})
    return {"access_token": access_token, "token_type": "bearer"}
@router.get("/google/url")
async def login_google():
    return {
        "url": f"{settings.GOOGLE_AUTH_URL}?response_type=code&client_id={settings.GOOGLE_CLIENT_ID}&redirect_uri={settings.GOOGLE_REDIRECT_URI}&scope=openid%20profile%20email&access_type=offline"
    }


@router.get("/google/callback")
async def auth_google(code: str = None, error: str = None):
    if error:
        raise HTTPException(status_code=400, detail=f"Google Login Error: {error}")
        
    if not code:
        raise HTTPException(status_code=400, detail="Login failed: No authorization code received from Google.")

    token_url = settings.GOOGLE_TOKEN_URL
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
        
        user_info_response = await client.get(settings.GOOGLE_USER_INFO_URL, headers={"Authorization": f"Bearer {access_token_google}"})
        if user_info_response.status_code != 200:
             raise HTTPException(status_code=400, detail="Failed to get user info from Google")
        user_info = user_info_response.json()
        
    db = await get_database()
    
    existing_user = await db.users.find_one({"email": user_info["email"]})
    
    print(f"DEBUG: Processing Google User: {user_info.get('email')}")
    
    if existing_user:
        print(f"DEBUG: User exists. Updating: {user_info.get('email')}")
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
        print(f"DEBUG: User does not exist. Creating new user: {user_info.get('email')}")
        # Create new user
        new_user = UserInDB(
            email=user_info["email"],
            google_id=user_info.get("id"),
            full_name=user_info.get("name"),
            picture=user_info.get("picture"),
            refresh_token=refresh_token,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # We exclude 'id' because MongoDB will generate '_id'
        user_dict = new_user.model_dump(by_alias=True, exclude={"id"})
        result = await db.users.insert_one(user_dict)
        print(f"DEBUG: New user created with ID: {result.inserted_id}")
        
    # Create backend JWT
    access_token = create_access_token(data={"sub": user_info["email"]})
    
    # Redirect to frontend with token
    # Adjust this URL based on where the frontend handles the callback
    frontend_url = f"{settings.FRONTEND_URL}/auth/callback"
    return RedirectResponse(url=f"{frontend_url}?token={access_token}")