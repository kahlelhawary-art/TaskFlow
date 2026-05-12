from datetime import datetime
from typing import Optional, TYPE_CHECKING

from pydantic import BaseModel

if TYPE_CHECKING:
    from app.schemas.board import BoardResponse


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#6366f1"


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    color: str
    owner_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectWithBoards(ProjectResponse):
    boards: list = []

    model_config = {"from_attributes": True}
