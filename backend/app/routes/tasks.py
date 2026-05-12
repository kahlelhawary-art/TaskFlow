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

router = APIRouter()


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


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task_route(
    data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(data.board_id, current_user, db)
    return await create_task(db, data)


# NOTE: /reorder must be defined BEFORE /{task_id} to avoid being swallowed by the param route
@router.put("/reorder", response_model=list[TaskResponse])
async def reorder_tasks_route(
    data: TaskReorder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_board_access(data.board_id, current_user, db)
    return await reorder_tasks(db, data.task_ids, data.board_id)


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
    await _check_board_access(task.board_id, current_user, db)
    return await update_task(db, task, data)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_or_404(task_id, db)
    await _check_board_access(task.board_id, current_user, db)
    await db.delete(task)
    await db.commit()


@router.put("/{task_id}/move", response_model=TaskResponse)
async def move_task_route(
    task_id: str,
    data: TaskMove,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await _get_task_or_404(task_id, db)
    await _check_board_access(task.board_id, current_user, db)
    await _check_board_access(data.board_id, current_user, db)
    return await move_task(db, task, data.board_id, data.position)
