import pytest
import asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from sqlmodel import SQLModel

from app.api.server import app
from app.database import get_session
from app.models import User
from app.core import config
from app.core.security import get_password_hash

# Connection string to the main postgres server (to create the test db)
POSTGRES_SERVER_URL = "postgresql+asyncpg://mayagen:securepassword@localhost:5432/postgres"
# Connection string to the test database
TEST_DATABASE_URL = "postgresql+asyncpg://mayagen:securepassword@localhost:5432/mayagen_test"

# Create engines
# 1. Server engine to create/drop the test DB (isolation level AUTOCOMMIT is needed for CREATE DATABASE)
server_engine = create_async_engine(POSTGRES_SERVER_URL, isolation_level="AUTOCOMMIT")
# 2. Test DB engine
test_engine = create_async_engine(TEST_DATABASE_URL, future=True, echo=False)

TestingSessionLocal = sessionmaker(
    bind=test_engine, 
    class_=AsyncSession, 
    expire_on_commit=False, 
    autocommit=False, 
    autoflush=False
)

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create an instance of the default event loop for each test case."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create the test database and tables at the start of the session, drop at end."""
    # 1. Create Test DB
    async with server_engine.connect() as conn:
        await conn.execute(text("DROP DATABASE IF EXISTS mayagen_test WITH (FORCE)"))
        await conn.execute(text("CREATE DATABASE mayagen_test"))
    
    # 2. Create Tables
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
    
    yield
    
    # 3. Teardown
    await test_engine.dispose()
    async with server_engine.connect() as conn:
         await conn.execute(text("DROP DATABASE IF EXISTS mayagen_test WITH (FORCE)"))
    await server_engine.dispose()

@pytest.fixture(scope="function")
async def session(setup_test_db) -> AsyncGenerator[AsyncSession, None]:
    """Provide a transactional session for each test function."""
    connection = await test_engine.connect()
    transaction = await connection.begin()
    
    session_factory = sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    session = session_factory()
    
    yield session
    
    await session.close()
    await transaction.rollback()
    await connection.close()

@pytest.fixture(scope="function")
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Provide an authenticated client."""
    async def override_get_session():
        yield session

    app.dependency_overrides[get_session] = override_get_session
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    
    app.dependency_overrides.clear()

@pytest.fixture(scope="function")
async def test_user(session: AsyncSession) -> User:
    """Create a test user."""
    # Check if user already exists (from previous incomplete rollback?)
    # Since we use transaction rollback, it should be clean, but unique constraint might trigger if not careful.
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password=get_password_hash("testpassword"),
        is_active=True,
        is_superuser=False,
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user

@pytest.fixture(scope="function")
async def authorized_header(client: AsyncClient, test_user: User) -> dict:
    """Get auth headers for the test user."""
    # Login to get valid JWT
    response = await client.post(
        f"/api/v1/auth/access-token",
        data={"username": test_user.email, "password": "testpassword"},
    )
    if response.status_code != 200:
        raise Exception(f"Login failed: {response.text}")
    data = response.json()
    token = data["access_token"]
    return {"Authorization": f"Bearer {token}"}
