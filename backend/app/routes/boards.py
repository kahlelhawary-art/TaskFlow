from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.board import Board
from app.models.project import Project, project_members
from app.models.task import Task
from app.models.user import User
from app.schemas.board import BoardCreate, BoardResponse, BoardReorder, BoardUpdate, BoardWithTasks
from app.schemas.task import TaskResponse
from app.services.ws_manager import manager

router = APIRouter()


def _board_to_dict(board: Board) -> dict:
    return {
        "id": board.id,
        "name": board.name,
        "project_id": board.project_id,
        "position": board.position,
        "created_at": board.created_at.isoformat() if board.created_at else None,
    }


async def _get_board_or_404(board_id: str, db: AsyncSession) -> Board:
    result = await db.execute(select(Board).where(Board.id == board_id))
    board = result.scalar_one_or_none()
    if not board:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Board not found")
    return board


async def _check_project_access(project_id: str, user: User, db: AsyncSession):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    if project.owner_id == user.id:
        return project

    pm_result = await db.execute(
        select(project_members).where(
            project_members.c.project_id == project_id,
            project_members.c.user_id == user.id,
        )
    )
    if not pm_result.first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return project


@router.post("", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board(
    data: BoardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_project_access(data.project_id, current_user, db)

    board = Board(
        name=data.name,
        project_id=data.project_id,
        position=data.position,
    )
    db.add(board)
    await db.commit()
    await db.refresh(board)
    await manager.broadcast(data.project_id, "board_created", _board_to_dict(board))
    return board


# NOTE: /reorder must be defined BEFORE /{board_id} to avoid being swallowed by the param route
@router.put("/reorder", response_model=list[BoardResponse])
async def reorder_boards(
    data: BoardReorder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    boards = []
    project_id = None
    for idx, board_id in enumerate(data.board_ids):
        result = await db.execute(select(Board).where(Board.id == board_id))
        board = result.scalar_one_or_none()
        if board:
            await _check_project_access(board.project_id, current_user, db)
            project_id = board.project_id
            board.position = idx
            db.add(board)
            boards.append(board)
    await db.commit()
    for board in boards:
        await db.refresh(board)
    if project_id:
        await manager.broadcast(project_id, "board_updated", [_board_to_dict(b) for b in boards])
    return boards


@router.get("/{board_id}", response_model=BoardResponse)
async def get_board(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await _get_board_or_404(board_id, db)
    await _check_project_access(board.project_id, current_user, db)
    return board


@router.put("/{board_id}", response_model=BoardResponse)
async def update_board(
    board_id: str,
    data: BoardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await _get_board_or_404(board_id, db)
    await _check_project_access(board.project_id, current_user, db)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(board, field, value)

    db.add(board)
    await db.commit()
    await db.refresh(board)
    await manager.broadcast(board.project_id, "board_updated", _board_to_dict(board))
    return board


@router.delete("/{board_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_board(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await _get_board_or_404(board_id, db)
    project = await _check_project_access(board.project_id, current_user, db)
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only owner can delete boards")
    board_data = _board_to_dict(board)
    project_id = board.project_id
    await db.delete(board)
    await db.commit()
    await manager.broadcast(project_id, "board_deleted", board_data)


@router.get("/{board_id}/tasks", response_model=list[TaskResponse])
async def get_board_tasks(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    board = await _get_board_or_404(board_id, db)
    await _check_project_access(board.project_id, current_user, db)

    result = await db.execute(
        select(Task).where(Task.board_id == board_id).order_by(Task.position)
    )
    return result.scalars().all()
