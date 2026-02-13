import asyncio
from app.database import init_db, get_session
from app.models import EditBatchJob, Image
from sqlmodel import select, delete

async def delete_all():
    print("Deleting all Edit Batches and associated Images...")
    
    await init_db()
    async for session in get_session():
        # 1. Delete associated Images first
        # We delete any image that has an edit_batch_job_id
        img_stmt = delete(Image).where(Image.edit_batch_job_id != None)
        result_img = await session.execute(img_stmt)
        print(f"Deleted {result_img.rowcount} images.")
        
        # 2. Delete Edit Batches
        batch_stmt = delete(EditBatchJob)
        result_batch = await session.execute(batch_stmt)
        print(f"Deleted {result_batch.rowcount} edit batches.")
        
        await session.commit()
        print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(delete_all())
