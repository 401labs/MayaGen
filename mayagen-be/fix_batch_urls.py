import asyncio
from app.database import init_db, get_session
from app.models import EditBatchJob
from app.core import config
from sqlmodel import select

async def fix_batch_urls():
    print("Fixing Batch URLs...")
    await init_db()
    async for session in get_session():
        # Get all batches
        stmt = select(EditBatchJob)
        res = await session.execute(stmt)
        batches = res.scalars().all()
        
        for batch in batches:
            if "/outputs/" in batch.original_image_url or not batch.original_image_url.startswith("http"):
                print(f"Fixing Batch {batch.id}: {batch.original_image_url}")
                # Replace /outputs/ with /images/ or construct full URL if needed
                # Actually, best to rebuild it from parts if we had them, but we can hack the string
                
                # If it starts with /outputs/, replace with {API_BASE}/images/
                if batch.original_image_url.startswith("/outputs/"):
                    new_suffix = batch.original_image_url.replace("/outputs/", "/images/")
                    batch.original_image_url = f"{config.API_BASE_URL}{new_suffix}"
                
                print(f" -> New URL: {batch.original_image_url}")
                session.add(batch)
        
        await session.commit()
        print("Done.")

if __name__ == "__main__":
    asyncio.run(fix_batch_urls())
