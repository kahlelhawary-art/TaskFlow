from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class BoardCreate(BaseModel):
    name: str
    project_id: str
    position: int = 0


class BoardUpdate(BaseModel):
    name: Optional[str] = None
    position: Optional[int] = None


class BoardResponse(BaseModel):
    id: str
    name: str
    project_id: str
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BoardWithTasks(BoardResponse):
    tasks: list = []

    model_config = {"from_attributes": True}


class BoardReorder(BaseModel):
    board_ids: list[str]
