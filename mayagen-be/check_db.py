import asyncio
from app.database import init_db, get_session
from app.models import Image
from sqlmodel import select

async def main():
    await init_db()
    async for session in get_session():
        result = await session.execute(select(Image))
        images = result.scalars().all()
        print(f"Total Images: {len(images)}")
        for img in images:
            print(f"ID: {img.id}, Filename: {img.filename}")
        return

if __name__ == "__main__":
    asyncio.run(main())
