import asyncio
from app.database import init_db, get_session
from app.models import Image, JobStatus, EditBatchJob
from sqlalchemy import select, desc

async def check_failed_jobs():
    await init_db()
    async for session in get_session():
        # Get the most recent edit batch
        stmt = select(EditBatchJob).order_by(desc(EditBatchJob.created_at)).limit(1)
        res = await session.execute(stmt)
        batch = res.scalars().first()
        
        if not batch:
            print("No edit batches found.")
            return

        print(f"Checking Batch {batch.id}: {batch.name}")
        print(f"Status: {batch.status}")
        
        # Get failed images for this batch
        stmt_img = select(Image).where(
            Image.edit_batch_job_id == batch.id, 
            Image.status == JobStatus.FAILED
        ).limit(5)
        
        res_img = await session.execute(stmt_img)
        failed_images = res_img.scalars().all()
        
        if not failed_images:
            print("No failed images found in this batch (maybe they are still queued or all success?).")
        else:
            print(f"Found {len(failed_images)} failed sample images:")
            for img in failed_images:
                print(f"  [Image {img.id}] Error: {img.error_message}")

if __name__ == "__main__":
    asyncio.run(check_failed_jobs())
