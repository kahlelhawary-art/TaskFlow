import json
from typing import Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate


async def create_task(db: AsyncSession, data: TaskCreate) -> Task:
    task = Task(
        title=data.title,
        description=data.description,
        board_id=data.board_id,
        assignee_id=data.assignee_id,
        priority=data.priority,
        due_date=data.due_date,
        position=data.position,
        labels=json.dumps(data.labels) if data.labels is not None else None,
        attachments=json.dumps(data.attachments) if data.attachments is not None else None,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task(db: AsyncSession, task: Task, data: TaskUpdate) -> Task:
    update_data = data.model_dump(exclude_unset=True)

    if "labels" in update_data:
        update_data["labels"] = json.dumps(update_data["labels"]) if update_data["labels"] is not None else None
    if "attachments" in update_data:
        update_data["attachments"] = json.dumps(update_data["attachments"]) if update_data["attachments"] is not None else None

    for field, value in update_data.items():
        setattr(task, field, value)

    from datetime import datetime
    task.updated_at = datetime.utcnow()

    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def move_task(db: AsyncSession, task: Task, board_id: str, position: int) -> Task:
    old_board_id = task.board_id

    # Shift tasks down in the old board to fill the gap
    if old_board_id != board_id:
        result = await db.execute(
            select(Task)
            .where(Task.board_id == old_board_id, Task.position > task.position)
            .order_by(Task.position)
        )
        tasks_to_shift = result.scalars().all()
        for t in tasks_to_shift:
            t.position -= 1

    # Shift tasks up in the new board to make space
    result = await db.execute(
        select(Task)
        .where(Task.board_id == board_id, Task.position >= position)
        .order_by(Task.position)
    )
    tasks_to_shift = result.scalars().all()
    for t in tasks_to_shift:
        if t.id != task.id:
            t.position += 1

    task.board_id = board_id
    task.position = position

    from datetime import datetime
    task.updated_at = datetime.utcnow()

    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def reorder_tasks(db: AsyncSession, task_ids: list[str], board_id: str) -> list[Task]:
    tasks = []
    for idx, task_id in enumerate(task_ids):
        result = await db.execute(select(Task).where(Task.id == task_id, Task.board_id == board_id))
        task = result.scalar_one_or_none()
        if task:
            task.position = idx
            db.add(task)
            tasks.append(task)
    await db.commit()
    for task in tasks:
        await db.refresh(task)
    return tasks
