import json as _json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.board import Board
from app.models.project import Project, project_members
from app.models.task import Task
from app.models.user import User
from app.schemas.task import TaskCreate, TaskMove, TaskReorder, TaskResponse, TaskUpdate
from app.services.task_service import create_task, move_task, reorder_tasks, update_task
from app.services.ws_manager import manager

router = APIRouter()


def _task_to_dict(task: Task) -> dict:
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "board_id": task.board_id,
        "assignee_id": task.assignee_id,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if isinstance(task.due_date, datetime) else task.due_date,
        "position": task.position,
        "labels": _json.loads(task.labels) if isinstance(task.labels, str) else task.labels,
        "attachments": _json.loads(task.attachments) if isinstance(task.attachments, str) else task.attachments,
        "created_at": task.created_at.isoformat() if isinstance(task.created_at, datetime) else task.created_at,
        "updated_at": task.updated_at.isoformat() if isinstance(task.updated_at, datetime) else task.updated_at,
    }


async def _get_task_or_404(task_id: str, db: AsyncSession) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
    return task


async def _check_board_access(board_id: str, user: User, db: AsyncSession) -> Board:
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")

    proj_result = await db.execute(select(Project).where(Project.id == board.project_id))
    project = proj_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id == user.id:
        return board

    pm_result = await db.execute(
        select(project_members).where(
            project_members.c.project_id == board.project_id,
            project_members.c.user_id == user.id,
        )
    )
    if not pm_result.first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return board


async def _get_project_id_for_board(board_id: str, db: AsyncSession) -> str | None:
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    return board.project_id if board else None


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task_route(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await _check_board_access(data.board_id, current_user, db)
    task = await create_task(db, data)
    await manager.broadcast(board.project_id, "task_created", _task_to_dict(task))
    return task


# NOTE: /reorder must be defined BEFORE /{task_id} to avoid being swallowed by the param route
@router.put("/reorder", response_model=list[TaskResponse])
async def reorder_tasks_route(
    data: TaskReorder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await _check_board_access(data.board_id, current_user, db)
    tasks = await reorder_tasks(db, data.task_ids, data.board_id)
    await manager.broadcast(board.project_id, "task_updated", [_task_to_dict(t) for t in tasks])
    return tasks


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_or_404(task_id, db)
    await _check_board_access(task.board_id, current_user, db)
    return task


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task_route(
    task_id: str,
    data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_or_404(task_id, db)
    board = await _check_board_access(task.board_id, current_user, db)
    task = await update_task(db, task, data)
    await manager.broadcast(board.project_id, "task_updated", _task_to_dict(task))
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_or_404(task_id, db)
    board = await _check_board_access(task.board_id, current_user, db)
    task_data = _task_to_dict(task)
    project_id = board.project_id
    await db.delete(task)
    await db.commit()
    await manager.broadcast(project_id, "task_deleted", task_data)


@router.put("/{task_id}/move", response_model=TaskResponse)
async def move_task_route(
    task_id: str,
    data: TaskMove,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_or_404(task_id, db)
    src_board = await _check_board_access(task.board_id, current_user, db)
    await _check_board_access(data.board_id, current_user, db)
    task = await move_task(db, task, data.board_id, data.position)
    await manager.broadcast(src_board.project_id, "task_moved", _task_to_dict(task))
    return task
