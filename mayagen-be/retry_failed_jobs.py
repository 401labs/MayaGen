import asyncio
import os
import shutil
from sqlmodel import select
from app.database import init_db, get_session
from app.models import Image, EditBatchJob, JobStatus, BatchJobStatus
from app.core import config

async def fix_and_retry():
    print(f"Checking for failed jobs...")
    
    await init_db()
    async for session in get_session():
        # 1. Reset Failed Edit Batches
        batch_stmt = select(EditBatchJob).where(EditBatchJob.status == BatchJobStatus.FAILED)
        batch_res = await session.execute(batch_stmt)
        batches = batch_res.scalars().all()
        
        for batch in batches:
            print(f"Reseting Batch {batch.id} ({batch.name})...")
            batch.status = BatchJobStatus.QUEUED
            batch.failed_count = 0
            batch.generated_count = 0
            session.add(batch)
            
        # 2. Reset Failed Images & Fix Paths
        img_stmt = select(Image).where(Image.status == JobStatus.FAILED, Image.is_edit == True)
        img_res = await session.execute(img_stmt)
        images = img_res.scalars().all()
        
        count = 0
        for img in images:
            count += 1
            # Reset Status
            img.status = JobStatus.QUEUED
            img.error_message = None
            
            # --- PATH FIX LOGIC ---
            # Check if current path exists
            current_full_path = os.path.join(config.OUTPUT_FOLDER, img.input_image_path)
            if not os.path.exists(current_full_path):
                # Try finding it in 'uploads' folder
                filename = os.path.basename(img.input_image_path)
                alt_path = os.path.join(config.OUTPUT_FOLDER, "uploads", filename)
                
                if os.path.exists(alt_path):
                    print(f"[Fixing Path] Image {img.id}: Found in 'uploads'. Updating DB.")
                    # Update DB to point to where the file actually is
                    # Assuming input_image_path should be relative to OUTPUT_FOLDER
                    img.input_image_path = os.path.join("uploads", filename)
                else:
                     print(f"[Warning] Image {img.id}: Source file not found in 'uploads' either: {filename}")
            
            session.add(img)
            
        await session.commit()
        print(f"Successfully reset {len(batches)} batches and {count} images to QUEUED.")

if __name__ == "__main__":
    asyncio.run(fix_and_retry())
