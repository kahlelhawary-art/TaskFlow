import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.services.auth_service import decode_token
from app.services.ws_manager import manager

router = APIRouter()
logger = logging.getLogger(__name__)


async def _authenticate_token(token: str | None, db: AsyncSession) -> User | None:
    """Validate JWT token from query param and return user, or None if invalid."""
    if not token:
        return None
    payload = decode_token(token)
    if payload is None:
        return None
    user_id: str | None = payload.get("sub")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


@router.websocket("/ws/{project_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    project_id: str,
    token: str | None = None,
):
    # Get DB session manually (can't use Depends in websocket easily without helper)
    async for db in get_db():
        user = await _authenticate_token(token, db)
        if user is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await manager.connect(websocket, project_id)
        try:
            while True:
                data = await websocket.receive_text()
                # Respond to ping with pong
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            manager.disconnect(websocket, project_id)
            logger.info("Client disconnected from project %s", project_id)
        except Exception as exc:
            logger.warning("WS error for project %s: %s", project_id, exc)
            manager.disconnect(websocket, project_id)
        return  # exit the async-for after first iteration
