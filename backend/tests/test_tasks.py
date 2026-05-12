import pytest
from httpx import AsyncClient


async def _setup(client: AsyncClient, email: str, username: str):
    await client.post("/api/auth/register", json={"email": email, "username": username, "password": "password123"})
    resp = await client.post("/api/auth/login", json={"email": email, "password": "password123"})
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    proj_resp = await client.post("/api/projects", json={"name": "Test Project"}, headers=headers)
    project_id = proj_resp.json()["id"]
    board_resp = await client.post("/api/boards", json={"name": "Todo", "project_id": project_id}, headers=headers)
    board_id = board_resp.json()["id"]
    return headers, project_id, board_id


@pytest.mark.asyncio
async def test_create_task(client: AsyncClient):
    headers, _, board_id = await _setup(client, "taskcreate@example.com", "taskcreateuser")
    resp = await client.post("/api/tasks", json={
        "title": "My Task",
        "board_id": board_id,
        "priority": "high",
    }, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "My Task"
    assert data["priority"] == "high"
    assert data["board_id"] == board_id


@pytest.mark.asyncio
async def test_create_task_with_labels(client: AsyncClient):
    headers, _, board_id = await _setup(client, "tasklabels@example.com", "tasklabelsuser")
    resp = await client.post("/api/tasks", json={
        "title": "Labeled Task",
        "board_id": board_id,
        "labels": ["bug", "frontend"],
    }, headers=headers)
    assert resp.status_code == 201
    assert resp.json()["labels"] == ["bug", "frontend"]


@pytest.mark.asyncio
async def test_get_task(client: AsyncClient):
    headers, _, board_id = await _setup(client, "taskget@example.com", "taskgetuser")
    create_resp = await client.post("/api/tasks", json={"title": "Get Me", "board_id": board_id}, headers=headers)
    task_id = create_resp.json()["id"]
    resp = await client.get(f"/api/tasks/{task_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == task_id


@pytest.mark.asyncio
async def test_update_task(client: AsyncClient):
    headers, _, board_id = await _setup(client, "taskupd@example.com", "taskupduser")
    create_resp = await client.post("/api/tasks", json={"title": "Old Title", "board_id": board_id}, headers=headers)
    task_id = create_resp.json()["id"]
    resp = await client.put(f"/api/tasks/{task_id}", json={"title": "New Title", "priority": "urgent"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "New Title"
    assert resp.json()["priority"] == "urgent"


@pytest.mark.asyncio
async def test_delete_task(client: AsyncClient):
    headers, _, board_id = await _setup(client, "taskdel@example.com", "taskdeluser")
    create_resp = await client.post("/api/tasks", json={"title": "Delete Me", "board_id": board_id}, headers=headers)
    task_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/tasks/{task_id}", headers=headers)
    assert resp.status_code == 204
    get_resp = await client.get(f"/api/tasks/{task_id}", headers=headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_priority(client: AsyncClient):
    headers, _, board_id = await _setup(client, "taskprio@example.com", "taskpriouser")
    resp = await client.post("/api/tasks", json={"title": "Bad Prio", "board_id": board_id, "priority": "extreme"}, headers=headers)
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_move_task(client: AsyncClient):
    headers, project_id, board_id = await _setup(client, "taskmove@example.com", "taskmoveuser")
    board2_resp = await client.post("/api/boards", json={"name": "Done", "project_id": project_id}, headers=headers)
    board2_id = board2_resp.json()["id"]
    create_resp = await client.post("/api/tasks", json={"title": "Move Me", "board_id": board_id}, headers=headers)
    task_id = create_resp.json()["id"]
    resp = await client.put(f"/api/tasks/{task_id}/move", json={"board_id": board2_id, "position": 0}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["board_id"] == board2_id
    assert resp.json()["position"] == 0


@pytest.mark.asyncio
async def test_reorder_tasks(client: AsyncClient):
    headers, _, board_id = await _setup(client, "taskreorder@example.com", "taskreorderuser")
    r1 = await client.post("/api/tasks", json={"title": "Task 1", "board_id": board_id, "position": 0}, headers=headers)
    r2 = await client.post("/api/tasks", json={"title": "Task 2", "board_id": board_id, "position": 1}, headers=headers)
    t1_id = r1.json()["id"]
    t2_id = r2.json()["id"]
    resp = await client.put("/api/tasks/reorder", json={"task_ids": [t2_id, t1_id], "board_id": board_id}, headers=headers)
    assert resp.status_code == 200
    tasks = resp.json()
    positions = {t["id"]: t["position"] for t in tasks}
    assert positions[t2_id] == 0
    assert positions[t1_id] == 1


@pytest.mark.asyncio
async def test_task_not_found(client: AsyncClient):
    headers, _, _ = await _setup(client, "tasknotfound@example.com", "tasknotfounduser")
    resp = await client.get("/api/tasks/nonexistent-id", headers=headers)
    assert resp.status_code == 404
