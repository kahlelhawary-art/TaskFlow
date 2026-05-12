import pytest
from httpx import AsyncClient


async def _setup_project(client: AsyncClient, email: str, username: str):
    await client.post("/api/auth/register", json={"email": email, "username": username, "password": "password123"})
    resp = await client.post("/api/auth/login", json={"email": email, "password": "password123"})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    proj_resp = await client.post("/api/projects", json={"name": "Test Project"}, headers=headers)
    return headers, proj_resp.json()["id"]


@pytest.mark.asyncio
async def test_create_board(client: AsyncClient):
    headers, project_id = await _setup_project(client, "boardcreate@example.com", "boardcreateuser")
    resp = await client.post("/api/boards", json={"name": "Todo", "project_id": project_id}, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["name"] == "Todo"
    assert resp.json()["project_id"] == project_id


@pytest.mark.asyncio
async def test_get_board(client: AsyncClient):
    headers, project_id = await _setup_project(client, "boardget@example.com", "boardgetuser")
    create_resp = await client.post("/api/boards", json={"name": "In Progress", "project_id": project_id}, headers=headers)
    board_id = create_resp.json()["id"]
    resp = await client.get(f"/api/boards/{board_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == board_id


@pytest.mark.asyncio
async def test_update_board(client: AsyncClient):
    headers, project_id = await _setup_project(client, "boardupd@example.com", "boardupduser")
    create_resp = await client.post("/api/boards", json={"name": "Old Board", "project_id": project_id}, headers=headers)
    board_id = create_resp.json()["id"]
    resp = await client.put(f"/api/boards/{board_id}", json={"name": "New Board"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Board"


@pytest.mark.asyncio
async def test_delete_board(client: AsyncClient):
    headers, project_id = await _setup_project(client, "boarddel@example.com", "boarddeluser")
    create_resp = await client.post("/api/boards", json={"name": "Delete Me", "project_id": project_id}, headers=headers)
    board_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/boards/{board_id}", headers=headers)
    assert resp.status_code == 204
    get_resp = await client.get(f"/api/boards/{board_id}", headers=headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_board_not_found(client: AsyncClient):
    headers, _ = await _setup_project(client, "boardnotfound@example.com", "boardnotfounduser")
    resp = await client.get("/api/boards/nonexistent-id", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_board_tasks(client: AsyncClient):
    headers, project_id = await _setup_project(client, "boardtasks@example.com", "boardtasksuser")
    create_resp = await client.post("/api/boards", json={"name": "Sprint", "project_id": project_id}, headers=headers)
    board_id = create_resp.json()["id"]
    await client.post("/api/tasks", json={"title": "Task 1", "board_id": board_id}, headers=headers)
    await client.post("/api/tasks", json={"title": "Task 2", "board_id": board_id}, headers=headers)
    resp = await client.get(f"/api/boards/{board_id}/tasks", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


@pytest.mark.asyncio
async def test_reorder_boards(client: AsyncClient):
    headers, project_id = await _setup_project(client, "boardreorder@example.com", "boardreorderuser")
    r1 = await client.post("/api/boards", json={"name": "Board 1", "project_id": project_id, "position": 0}, headers=headers)
    r2 = await client.post("/api/boards", json={"name": "Board 2", "project_id": project_id, "position": 1}, headers=headers)
    b1_id = r1.json()["id"]
    b2_id = r2.json()["id"]
    resp = await client.put("/api/boards/reorder", json={"board_ids": [b2_id, b1_id]}, headers=headers)
    assert resp.status_code == 200
    boards = resp.json()
    positions = {b["id"]: b["position"] for b in boards}
    assert positions[b2_id] == 0
    assert positions[b1_id] == 1
