import asyncio
import os
from app.database import init_db, get_session
from app.models import EditBatchJob, Image
from app.core import config
from sqlmodel import select, desc

async def check_status():
    print(f"Config OUTPUT_FOLDER: {config.OUTPUT_FOLDER}")
    
    await init_db()
    async for session in get_session():
        # Get latest edit batch
        stmt = select(EditBatchJob).order_by(desc(EditBatchJob.created_at)).limit(1)
        res = await session.execute(stmt)
        batch = res.scalar_one_or_none()
        
        if not batch:
            print("No edit batches found.")
            return
            
        print(f"Latest Batch: {batch.id} | Status: {batch.status}")
        
        # Get one image to check path
        img_stmt = select(Image).where(Image.edit_batch_job_id == batch.id).limit(1)
        img_res = await session.execute(img_stmt)
        img = img_res.scalar_one_or_none()
        
        if img:
            print(f"Sample Image ID: {img.id}")
            print(f"Input Image Path: {img.input_image_path}")
            print(f"Computed Full Path: {os.path.join(config.OUTPUT_FOLDER, img.input_image_path)}")
            print(f"Error: {img.error_message}")

if __name__ == "__main__":
    asyncio.run(check_status())
