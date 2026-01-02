import openai
import json
import logging
from typing import List
from ..database.client import settings

logger = logging.getLogger(__name__)

async def generate_next_steps(summary: str) -> List[str]:
    """
    Extracts actionable next steps from a meeting summary using AI.
    If OPENAI_API_KEY is not set, returns a mock list.
    """
    if not settings.OPENAI_API_KEY or settings.OPENAI_API_KEY == "your_openai_api_key":
        logger.info("OPENAI_API_KEY not set or default. Returning mock AI suggestions.")
        return [
            "Follow up on the discussion points",
            "Schedule the next sync meeting",
            "Email the stakeholders with the summary"
        ]

    try:
        client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        
        system_prompt = "You are an assistant that extracts actionable next steps from meeting summaries. Return a JSON array of strings."
        user_prompt = f"Extract action items from this summary:\n\n{summary}"

        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
        )

        content = response.choices[0].message.content.strip()
        
        # Clean potential markdown code blocks
        if content.startswith("```json"):
            content = content[7:]
        elif content.startswith("```"):
             content = content[3:]
             
        if content.endswith("```"):
            content = content[:-3]
        
        steps = json.loads(content.strip())
        
        if isinstance(steps, list):
            return [str(step) for step in steps]
        else:
            logger.warning(f"AI response was not a list: {content}")
            return []

    except Exception as e:
        logger.error(f"Error generating next steps with AI: {e}")
        # Return empty list or basic fallback on error to not crash the flow
        return []