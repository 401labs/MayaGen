import asyncio
from sqlalchemy import text
from app.database import engine
from app.models import SQLModel
# Import models to ensure they are registered
from app.models import User, Image, BatchJob, EditBatchJob, ActivityLog, BlockedIP

async def reset_database():
    print("Beginning database reset...")
    async with engine.begin() as conn:
        print("1. Dropping tables forcefully...")
        
        # Order doesn't strictly matter with CASCADE, but good to be logical
        tables = [
            "image", 
            "edit_batch_job", 
            "batchjob", # Default SQLModel name for BatchJob
            "activitylog", # Default SQLModel name for ActivityLog
            "blocked_ip", 
            "user"
        ]
        
        for table in tables:
            try:
                print(f"Dropping {table}...")
                # Quote table names to handle reserved keywords like "user"
                await conn.execute(text(f'DROP TABLE IF EXISTS "{table}" CASCADE'))
            except Exception as e:
                print(f"Warning dropping {table}: {e}")

        print("2. Cleaning up Enum types...")
        enums = ["jobstatus", "batchjobstatus", "imagetype"]
        for enum in enums:
            try:
                await conn.execute(text(f"DROP TYPE IF EXISTS {enum} CASCADE"))
            except Exception as e:
                print(f"Warning dropping enum {enum}: {e}")
        
        print("3. Recreating tables...")
        await conn.run_sync(SQLModel.metadata.create_all)
        
        print("✅ Database reset successfully!")

if __name__ == "__main__":
    asyncio.run(reset_database())
