import asyncio
from app.database import init_db, get_session
from app.models import EditBatchJob, Image, JobStatus
from sqlalchemy import func, select

async def recalculate_batch_counts():
    print("Recalculating Batch Counts...")
    await init_db()
    async for session in get_session():
        # Get all edit batches
        stmt = select(EditBatchJob)
        res = await session.execute(stmt)
        batches = res.scalars().all()
        
        for batch in batches:
            print(f"Checking Batch {batch.id} ({batch.name})...")
            
            # Count actual images
            completed = await session.execute(
                select(func.count()).where(Image.edit_batch_job_id == batch.id, Image.status == JobStatus.COMPLETED)
            )
            failed = await session.execute(
                select(func.count()).where(Image.edit_batch_job_id == batch.id, Image.status == JobStatus.FAILED)
            )
            
            real_completed = completed.scalar_one()
            real_failed = failed.scalar_one()
            
            if batch.generated_count != real_completed or batch.failed_count != real_failed:
                print(f"  -> Mismatch! DB: {batch.generated_count}/{batch.failed_count} vs Real: {real_completed}/{real_failed}")
                batch.generated_count = real_completed
                batch.failed_count = real_failed
                session.add(batch)
            else:
                print("  -> OK.")
        
        await session.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(recalculate_batch_counts())
