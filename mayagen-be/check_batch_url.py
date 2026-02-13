import asyncio
from app.database import init_db, get_session
from app.models import EditBatchJob
from sqlmodel import select

async def check_urls():
    await init_db()
    async for session in get_session():
        stmt = select(EditBatchJob).order_by(EditBatchJob.id)
        res = await session.execute(stmt)
        batches = res.scalars().all()
        
        print(f"Checking {len(batches)} batches for URL issues...")
        for batch in batches:
            print(f"Batch {batch.id}: {batch.original_image_url}")
            if "\\" in batch.original_image_url:
                print(f"  [ALERT] Backslash detected!")

if __name__ == "__main__":
    asyncio.run(check_urls())
