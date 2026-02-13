import asyncio
from app.database import init_db, get_session
from app.models import EditBatchJob, Image
from app.core import config
from sqlmodel import select
import os

async def fix_batch_3_original():
    print("Fixing Batch 3 Original Image URL...")
    
    await init_db()
    async for session in get_session():
        # Get Batch 3
        stmt = select(EditBatchJob).where(EditBatchJob.id == 3)
        res = await session.execute(stmt)
        batch = res.scalar_one_or_none()
        
        if not batch:
            print("Batch 3 not found.")
            return

        # Get Original Image Record
        img_stmt = select(Image).where(Image.id == batch.original_image_id)
        img_res = await session.execute(img_stmt)
        org_img = img_res.scalar_one_or_none()
        
        if not org_img:
            print("Original Image record not found.")
            return

        print(f"Current Batch URL: {batch.original_image_url}")
        print(f"Original Image Filename: {org_img.filename}")
        
        # Check if file exists in 'uploads'
        upload_path = os.path.join(config.OUTPUT_FOLDER, "uploads", org_img.filename)
        if os.path.exists(upload_path):
            print(f"File found in uploads: {upload_path}")
            
            # 1. Fix Image Record Category
            if org_img.category != "uploads":
                print(f"Updating Image category from '{org_img.category}' to 'uploads'")
                org_img.category = "uploads"
                org_img.file_path = f"uploads/{org_img.filename}"
                session.add(org_img)

            # 2. Fix Batch URL
            # The backend mounts StaticFiles at /images, so the URL implies /images/uploads/...
            # We can use a relative or absolute URL. Let's use relative for flexibility if frontend handles it,
            # or absolute if needed. The upload endpoint returns absolute.
            # However, looking at the logs, the frontend seems to expect /outputs/ or similar? 
            # No, the logs show 404 for /outputs/.
            # Let's align with the backend mount: /images/uploads/filename
            # If the backend base URL is http://127.0.0.1:8000, then http://127.0.0.1:8000/images/uploads/filename
            
            # Update: Using the full URL format consistent with new uploads
            new_url = f"{config.API_BASE_URL}/images/uploads/{org_img.filename}"
            
            # OR if we want to support relative paths that the frontend might proxy...
            # But let's stick to what works for new uploads.
            
            if batch.original_image_url != new_url:
                print(f"Updating Batch URL to: {new_url}")
                batch.original_image_url = new_url
                session.add(batch)
            
            await session.commit()
            print("Successfully updated Batch 3.")
        else:
            print(f"File NOT found in uploads: {upload_path}")

if __name__ == "__main__":
    asyncio.run(fix_batch_3_original())
