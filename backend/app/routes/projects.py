from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.board import Board
from app.models.project import Project, project_members
from app.models.user import User
from app.schemas.board import BoardResponse
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter()


async def _get_project_or_404(project_id: str, db: AsyncSession) -> Project:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _check_owner(project: Project, user: User):
    if project.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not the project owner")


async def _is_member(project_id: str, user_id: str, db: AsyncSession) -> bool:
    result = await db.execute(
        select(project_members).where(
            project_members.c.project_id == project_id,
            project_members.c.user_id == user_id,
        )
    )
    return result.first() is not None


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(
        name=data.name,
        description=data.description,
        color=data.color,
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()
    await db.execute(
        insert(project_members).values(project_id=project.id, user_id=current_user.id, role="owner")
    )
    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(
            (Project.owner_id == current_user.id)
            | Project.id.in_(
                select(project_members.c.project_id).where(project_members.c.user_id == current_user.id)
            )
        )
    )
    return result.scalars().all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, db)
    if project.owner_id != current_user.id and not await _is_member(project_id, current_user.id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, db)
    _check_owner(project, current_user)

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)

    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, db)
    _check_owner(project, current_user)
    await db.delete(project)
    await db.commit()


@router.get("/{project_id}/boards", response_model=list[BoardResponse])
async def get_project_boards(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, db)
    if project.owner_id != current_user.id and not await _is_member(project_id, current_user.id, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    result = await db.execute(
        select(Board).where(Board.project_id == project_id).order_by(Board.position)
    )
    return result.scalars().all()


@router.post("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def add_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, db)
    _check_owner(project, current_user)

    result = await db.execute(select(User).where(User.id == user_id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not await _is_member(project_id, user_id, db):
        await db.execute(
            insert(project_members).values(project_id=project_id, user_id=user_id, role="member")
        )
        await db.commit()


@router.delete("/{project_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    project_id: str,
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_or_404(project_id, db)
    _check_owner(project, current_user)

    await db.execute(
        delete(project_members).where(
            project_members.c.project_id == project_id,
            project_members.c.user_id == user_id,
        )
    )
    await db.commit()
