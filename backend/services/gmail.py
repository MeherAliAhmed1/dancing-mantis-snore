import httpx
import logging
from typing import List
import base64
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from ..database.client import settings

logger = logging.getLogger(__name__)

async def create_draft(access_token: str, recipients: List[str], subject: str, body: str):
    """
    Creates a draft email in the user's Gmail account.
    """
    url = settings.GOOGLE_GMAIL_DRAFTS_URL
    
    # Construct MIME message
    message = MIMEMultipart()
    message["to"] = ", ".join(recipients)
    message["subject"] = subject
    message.attach(MIMEText(body, "plain"))
    
    # Encode as base64url
    raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")
    
    data = {
        "message": {
            "raw": raw_message
        }
    }
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"Failed to create draft: {response.text}")
            return None
            
        return response.json()