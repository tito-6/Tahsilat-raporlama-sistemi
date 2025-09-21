from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import Dict, Any

from api.models.database import get_db
from api.utils.agent import chat_with_assistant

router = APIRouter()

@router.post("/assistant")
async def assistant_endpoint(
    request_data: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Endpoint for the AI assistant to process user messages and provide responses.
    """
    return await chat_with_assistant(request_data, db)