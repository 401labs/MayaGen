import asyncio
import os
from app.database import init_db, get_session
from app.models import EditBatchJob, Image
from app.core import config
from sqlmodel import select

async def check_batch_2():
    print(f"Config OUTPUT_FOLDER: {config.OUTPUT_FOLDER}")
    
    await init_db()
    async for session in get_session():
        # Get specific batch ID 2
        stmt = select(EditBatchJob).where(EditBatchJob.id == 2)
        res = await session.execute(stmt)
        batch = res.scalar_one_or_none()
        
        if not batch:
            print("Batch 2 not found.")
            return
            
        print(f"Batch: {batch.id} | Name: {batch.name}")
        print(f"Original Image URL (in DB): {batch.original_image_url}")
        print(f"Original Image ID: {batch.original_image_id}")
        
        # Get the actual original image record
        img_stmt = select(Image).where(Image.id == batch.original_image_id)
        img_res = await session.execute(img_stmt)
        org_img = img_res.scalar_one_or_none()
        
        if org_img:
            print(f"Original Image Record:")
            print(f"  Filename: {org_img.filename}")
            print(f"  Category: {org_img.category}")
            # Construct expected local path
            local_path = os.path.join(config.OUTPUT_FOLDER, org_img.category, org_img.filename)
            print(f"  Expected Local Path: {local_path}")
            print(f"  Exists: {os.path.exists(local_path)}")
        else:
            print("Original Image Record NOT FOUND.")

        # List all images for this batch
        print(f"\nBatch 2 Images:")
        img_all_stmt = select(Image).where(Image.edit_batch_job_id == 2)
        params_res = await session.execute(img_all_stmt)
        images = params_res.scalars().all()
        
        for img in images:
            print(f"ID: {img.id} | Status: {img.status} | Error: {img.error_message}")

if __name__ == "__main__":
    asyncio.run(check_batch_2())
