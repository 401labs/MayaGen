import asyncio
import os
from app.database import init_db, get_session
from app.models import EditBatchJob, Image
from app.core import config
from sqlmodel import select

async def check_batch_3():
    print(f"Config OUTPUT_FOLDER: {config.OUTPUT_FOLDER}")
    
    await init_db()
    async for session in get_session():
        # Get specific batch ID 3
        stmt = select(EditBatchJob).where(EditBatchJob.id == 3)
        res = await session.execute(stmt)
        batch = res.scalar_one_or_none()
        
        if not batch:
            print("Batch 3 not found.")
            return
            
        print(f"Batch: {batch.id} | Name: {batch.name} | Status: {batch.status}")
        print(f"Original Image URL: {batch.original_image_url}")
        print(f"Generated: {batch.generated_count} | Failed: {batch.failed_count}")
        
        # Check Original Image
        img_stmt = select(Image).where(Image.id == batch.original_image_id)
        img_res = await session.execute(img_stmt)
        org_img = img_res.scalar_one_or_none()
        
        if org_img:
            print(f"Original Image ID: {org_img.id}")
            print(f"  Filename: {org_img.filename}")
            print(f"  Category: {org_img.category}")
            local_path = os.path.join(config.OUTPUT_FOLDER, org_img.category, org_img.filename)
            print(f"  Expected Local Path: {local_path}")
            print(f"  Exists: {os.path.exists(local_path)}")
        
        # Check Failed Images
        fail_stmt = select(Image).where(Image.edit_batch_job_id == 3, Image.status == "FAILED").limit(1)
        fail_res = await session.execute(fail_stmt)
        failed_img = fail_res.scalar_one_or_none()
        
        if failed_img:
            print(f"\nSample Failed Image ({failed_img.id}):")
            print(f"  Input Path (DB): {failed_img.input_image_path}")
            print(f"  Error Message: {failed_img.error_message}")
            
            # Simulate Worker Path Logic
            worker_path = os.path.join(config.OUTPUT_FOLDER, failed_img.input_image_path)
            norm_path = os.path.normpath(worker_path)
            print(f"  Worker Logic Path: {norm_path}")
            print(f"  Exists: {os.path.exists(norm_path)}")

if __name__ == "__main__":
    asyncio.run(check_batch_3())
