from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, field_validator
import json


VALID_PRIORITIES = {"low", "medium", "high", "urgent"}


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    board_id: str
    assignee_id: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[datetime] = None
    position: int = 0
    labels: Optional[list[str]] = None
    attachments: Optional[list[dict[str, Any]]] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        if v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of {VALID_PRIORITIES}")
        return v


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_id: Optional[str] = None
    priority: Optional[str] = None
    due_date: Optional[datetime] = None
    position: Optional[int] = None
    labels: Optional[list[str]] = None
    attachments: Optional[list[dict[str, Any]]] = None

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of {VALID_PRIORITIES}")
        return v


class TaskResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    board_id: str
    assignee_id: Optional[str] = None
    priority: str
    due_date: Optional[datetime] = None
    position: int
    labels: Optional[list[str]] = None
    attachments: Optional[list[dict[str, Any]]] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("labels", mode="before")
    @classmethod
    def parse_labels(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v

    @field_validator("attachments", mode="before")
    @classmethod
    def parse_attachments(cls, v: Any) -> Any:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return None
        return v


class TaskMove(BaseModel):
    board_id: str
    position: int


class TaskReorder(BaseModel):
    task_ids: list[str]
    board_id: str
