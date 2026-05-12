import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/auth/register", json={
        "email": "user1@example.com",
        "username": "user1",
        "password": "securepass",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "user1@example.com"
    assert data["user"]["username"] == "user1"


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "dup@example.com",
        "username": "dupuser",
        "password": "securepass",
    })
    resp = await client.post("/api/auth/register", json={
        "email": "dup@example.com",
        "username": "dupuser2",
        "password": "securepass",
    })
    assert resp.status_code == 409
    assert "Email" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_register_duplicate_username(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "dupname1@example.com",
        "username": "dupname",
        "password": "securepass",
    })
    resp = await client.post("/api/auth/register", json={
        "email": "dupname2@example.com",
        "username": "dupname",
        "password": "securepass",
    })
    assert resp.status_code == 409
    assert "Username" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "logintest@example.com",
        "username": "logintest",
        "password": "password123",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "logintest@example.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/register", json={
        "email": "wrongpass@example.com",
        "username": "wrongpass",
        "password": "correctpass",
    })
    resp = await client.post("/api/auth/login", json={
        "email": "wrongpass@example.com",
        "password": "wrongpassword",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post("/api/auth/login", json={
        "email": "nobody@example.com",
        "password": "whatever",
    })
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "email": "getme@example.com",
        "username": "getme_user",
        "password": "password123",
    })
    token = reg.json()["access_token"]
    resp = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "getme@example.com"


@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    resp = await client.get("/api/auth/me")
    # FastAPI's HTTPBearer returns 403 when no Authorization header is provided
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_update_me(client: AsyncClient):
    reg = await client.post("/api/auth/register", json={
        "email": "updateme@example.com",
        "username": "updateme_user",
        "password": "password123",
    })
    token = reg.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = await client.put("/api/auth/me", json={"username": "updated_user"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["username"] == "updated_user"
