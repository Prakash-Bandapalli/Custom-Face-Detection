from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

# Database URL configuration
DATABASE_URL = "postgresql+asyncpg://app:secretboi@db:5432/facedetect"

# The engine manages the connection pool to the database
engine = create_async_engine(DATABASE_URL, echo=True)

# A factory to create database sessions
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# The base class that all our database models will inherit from
Base = declarative_base()

# This function will be used by our API routes to get a database session
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session