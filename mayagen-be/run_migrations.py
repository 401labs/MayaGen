import asyncio
import os
import re
from datetime import datetime
from sqlalchemy import text
from app.database import engine

MIGRATION_DIR = "migrations"

# Regex to parse filenames: dd-mm-yyyy-{name}-{seq}.sql
# Example: 06-02-2026-add_is_public-001.sql
FILENAME_PATTERN = re.compile(r"^(\d{2})-(\d{2})-(\d{4})-(.+)-(\d+)\.sql$")

async def run_migrations():
    if not os.path.exists(MIGRATION_DIR):
        print(f"Directory {MIGRATION_DIR} not found.")
        return

    async with engine.begin() as conn:
        # 1. Create schema_migrations table if not exists
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS schema_migrations (
                filename VARCHAR(255) PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """))
        
        # 2. Get applied migrations
        result = await conn.execute(text("SELECT filename FROM schema_migrations"))
        applied_files = {row[0] for row in result.all()}
        
        # 3. List and sort migration files
        files = []
        for f in os.listdir(MIGRATION_DIR):
            match = FILENAME_PATTERN.match(f)
            if match:
                day, month, year, name, seq = match.groups()
                # Create a sort key: (date object, sequence int)
                dt = datetime(int(year), int(month), int(day))
                files.append({
                    "filename": f,
                    "date": dt,
                    "seq": int(seq),
                    "path": os.path.join(MIGRATION_DIR, f)
                })
        
        # Sort by Date then Sequence
        files.sort(key=lambda x: (x["date"], x["seq"]))
        
        # 4. Apply new migrations
        for migration in files:
            if migration["filename"] not in applied_files:
                print(f"Applying {migration['filename']}...")
                try:
                    with open(migration["path"], "r") as sql_file:
                        sql_content = sql_file.read()
                        
                    # Execute SQL statements one by one
                    # Basic semicolon splitting (naive but works for simple migrations)
                    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
                    
                    for stmt in statements:
                        # print(f"Executing: {stmt[:50]}...")
                        await conn.execute(text(stmt))
                    
                    # Record migration
                    await conn.execute(
                        text("INSERT INTO schema_migrations (filename) VALUES (:filename)"),
                        {"filename": migration["filename"]}
                    )
                    print(f"✅ Applied {migration['filename']}")
                    
                except Exception as e:
                    print(f"❌ Failed to apply {migration['filename']}: {e}")
                    raise e # Stop on error
            else:
                # print(f"Skipping {migration['filename']} (already applied)")
                pass

        print("Migration process completed.")

if __name__ == "__main__":
    asyncio.run(run_migrations())
