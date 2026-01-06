import httpx
from datetime import datetime, time, timedelta
import logging
from ..database.client import settings

logger = logging.getLogger(__name__)

async def refresh_google_token(refresh_token: str) -> str:
    """
    Exchanges a refresh token for a new access token.
    """
    token_url = settings.GOOGLE_TOKEN_URL
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(token_url, data=data)
        if response.status_code != 200:
            logger.error(f"Failed to refresh token: {response.text}")
            return None
            
        return response.json().get("access_token")

def is_online_meeting(event: dict) -> bool:
    """
    Determines if a meeting is online based on Google Event data.
    """
    if event.get("conferenceData"):
        return True
    
    location = event.get("location", "").lower()
    if "zoom" in location or "meet.google" in location or "teams" in location:
        return True
        
    description = event.get("description", "").lower()
    if "zoom" in description or "meet.google" in description or "teams" in description:
        return True
        
    return False

async def fetch_calendar_events(access_token: str, date: datetime = None):
    """
    Fetches events from the primary calendar for the given date (default: today).
    """
    if not date:
        date = datetime.now()
    
    # Define start and end of the day in UTC
    # Note: Google Calendar API expects ISO format with time zone
    # For simplicity, we'll ask for the full day in UTC. 
    # A robust solution would handle user timezones more precisely.
    start_of_day = datetime.combine(date, time.min).isoformat() + "Z"
    end_of_day = datetime.combine(date, time.max).isoformat() + "Z"
    
    url = settings.GOOGLE_CALENDAR_EVENTS_URL
    params = {
        "timeMin": start_of_day,
        "timeMax": end_of_day,
        "singleEvents": True,
        "orderBy": "startTime",
    }
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Failed to fetch events: {response.text}")
            return []
            
        items = response.json().get("items", [])
        return items