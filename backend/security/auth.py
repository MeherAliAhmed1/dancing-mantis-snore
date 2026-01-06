from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from ..database.client import settings, get_database
from ..models.schemas import TokenData, UserInDB

# We use OAuth2PasswordBearer to define the scheme, so FastAPI knows to look for
# the token in the Authorization header (Bearer token).
# The tokenUrl is just a placeholder here since we use Google OAuth,
# but it's required for the Swagger UI to know it's a Bearer token flow.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def verify_password(plain_password, hashed_password):
    # SIMPLIFIED: Direct string comparison (No encryption)
    return plain_password == hashed_password

def get_password_hash(password):
    # SIMPLIFIED: Return plain password (No encryption)
    return password

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    print(f"DEBUG: get_current_user called")
    print(f"DEBUG: Received token: {token[:20]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        print(f"DEBUG: Decoded payload: {payload}")
        email: str = payload.get("sub")
        if email is None:
            print("DEBUG: Email (sub) missing from payload")
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError as e:
        print(f"DEBUG: JWTError: {str(e)}")
        raise credentials_exception
    except Exception as e:
        print(f"DEBUG: Unexpected error in token validation: {str(e)}")
        raise credentials_exception
    
    db = await get_database()
    user = await db.users.find_one({"email": token_data.email})
    if user is None:
        print(f"DEBUG: User not found in DB for email: {token_data.email}")
        raise credentials_exception
        
    print(f"DEBUG: User authenticated successfully: {user.get('email')}")
    return UserInDB(**user)