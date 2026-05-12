import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, email: str, username: str, password: str = "password123") -> dict:
    await client.post("/api/auth/register", json={"email": email, "username": username, "password": password})
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_project(client: AsyncClient):
    headers = await _register_and_login(client, "proj1@example.com", "proj1user")
    resp = await client.post("/api/projects", json={"name": "My Project", "color": "#ff0000"}, headers=headers)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "My Project"
    assert data["color"] == "#ff0000"


@pytest.mark.asyncio
async def test_list_projects(client: AsyncClient):
    headers = await _register_and_login(client, "listproj@example.com", "listprojuser")
    await client.post("/api/projects", json={"name": "Project A"}, headers=headers)
    await client.post("/api/projects", json={"name": "Project B"}, headers=headers)
    resp = await client.get("/api/projects", headers=headers)
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert "Project A" in names
    assert "Project B" in names


@pytest.mark.asyncio
async def test_get_project(client: AsyncClient):
    headers = await _register_and_login(client, "getproj@example.com", "getprojuser")
    create_resp = await client.post("/api/projects", json={"name": "Get Me"}, headers=headers)
    project_id = create_resp.json()["id"]
    resp = await client.get(f"/api/projects/{project_id}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == project_id


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient):
    headers = await _register_and_login(client, "updproj@example.com", "updprojuser")
    create_resp = await client.post("/api/projects", json={"name": "Old Name"}, headers=headers)
    project_id = create_resp.json()["id"]
    resp = await client.put(f"/api/projects/{project_id}", json={"name": "New Name"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["name"] == "New Name"


@pytest.mark.asyncio
async def test_delete_project(client: AsyncClient):
    headers = await _register_and_login(client, "delproj@example.com", "delprojuser")
    create_resp = await client.post("/api/projects", json={"name": "Delete Me"}, headers=headers)
    project_id = create_resp.json()["id"]
    resp = await client.delete(f"/api/projects/{project_id}", headers=headers)
    assert resp.status_code == 204
    get_resp = await client.get(f"/api/projects/{project_id}", headers=headers)
    assert get_resp.status_code == 404


@pytest.mark.asyncio
async def test_project_not_found(client: AsyncClient):
    headers = await _register_and_login(client, "notfoundproj@example.com", "notfoundprojuser")
    resp = await client.get("/api/projects/nonexistent-id", headers=headers)
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_project_unauthorized(client: AsyncClient):
    owner_headers = await _register_and_login(client, "owner1@example.com", "owner1user")
    other_headers = await _register_and_login(client, "other1@example.com", "other1user")
    create_resp = await client.post("/api/projects", json={"name": "Private"}, headers=owner_headers)
    project_id = create_resp.json()["id"]
    resp = await client.put(f"/api/projects/{project_id}", json={"name": "Hacked"}, headers=other_headers)
    assert resp.status_code in (403, 404)


@pytest.mark.asyncio
async def test_get_project_boards(client: AsyncClient):
    headers = await _register_and_login(client, "projboards@example.com", "projboardsuser")
    create_resp = await client.post("/api/projects", json={"name": "Board Project"}, headers=headers)
    project_id = create_resp.json()["id"]
    await client.post("/api/boards", json={"name": "Todo", "project_id": project_id}, headers=headers)
    resp = await client.get(f"/api/projects/{project_id}/boards", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1
