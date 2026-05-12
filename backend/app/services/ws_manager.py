import json
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self) -> None:
        # project_id -> list of active WebSocket connections
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, websocket: WebSocket, project_id: str) -> None:
        await websocket.accept()
        self._connections[project_id].append(websocket)
        logger.info("WS connected: project=%s, total=%d", project_id, len(self._connections[project_id]))

    def disconnect(self, websocket: WebSocket, project_id: str) -> None:
        conns = self._connections.get(project_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self._connections.pop(project_id, None)
        logger.info("WS disconnected: project=%s", project_id)

    async def broadcast(self, project_id: str, event: str, data: Any) -> None:
        message = json.dumps({"event": event, "data": data})
        dead: list[WebSocket] = []
        for ws in list(self._connections.get(project_id, [])):
            try:
                await ws.send_text(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, project_id)


# Global singleton used by routes
manager = ConnectionManager()
