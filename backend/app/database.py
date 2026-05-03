import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. Check your .env file.")

# The engine manages the connection pool to the database
engine = create_async_engine(DATABASE_URL, echo=False)

# A factory to create database sessions
AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# The base class that all our database models will inherit from
Base = declarative_base()

# Dependency to get a database session in API routes
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session