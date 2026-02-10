import os
import time
import argparse
from pathlib import Path
from sqlalchemy import create_engine, text
from .core import config
from .services.comfy_client import ComfyUIProvider

def load_prompts(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return [line.strip() for line in f if line.strip() and not line.startswith('#')]

def cmd_generate(args):
    print("============================================")
    print(f" MAYAGEN AUTOMATION | Model: {args.model.upper()}")
    print("============================================")

    # 1. Setup
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    provider = ComfyUIProvider(config.COMFYUI["server_address"])
    
    # Resolve Workflow
    workflow_path = config.WORKFLOWS.get(args.model)
    if not workflow_path or not workflow_path.exists():
        print(f"[Error] Workflow file not found: {workflow_path}")
        return

    # 2. Get Prompts
    prompts_file = Path(args.input)
    if not prompts_file.exists():
        # Try relative to root if not found
        prompts_file = config.BASE_DIR / args.input
        if not prompts_file.exists():
             print(f"[Error] Prompts file not found: {args.input}")
             return

    prompts = load_prompts(prompts_file)
    print(f"[System] Loaded {len(prompts)} prompts from {prompts_file.name}\n")

    # 3. Generate Loop
    for i, prompt_text in enumerate(prompts):
        print(f"\n[{i+1}/{len(prompts)}] Generating: {prompt_text[:50]}...")
        
        # Categorize based on simple keyword matching (optional logic)
        category = "uncategorized"
        # Create a safe filename
        safe_prompt = "".join([c for c in prompt_text[:30] if c.isalnum() or c in (' ', '_')]).strip().replace(" ", "_")
        timestamp = int(time.time())
        filename = f"{args.model}_{timestamp}_{safe_prompt}.png"
        
        # Subfolder logic (optional, keep flat for script default or mimic API structure?)
        if "portrait" in prompt_text.lower(): category = "Portraits"
        elif "landscape" in prompt_text.lower(): category = "Landscapes"
        
        cat_dir = output_dir / category
        cat_dir.mkdir(exist_ok=True)
        final_path = cat_dir / filename
        
        try:
            provider.generate(prompt_text, str(final_path), width=512, height=512 if args.model == "lcm" else 512, workflow_path=workflow_path)
            print(f"   -> Saved to {category}/{filename}")
        except Exception as e:
            print(f"[Error] Generation failed: {e}")

    print("\n[System] Batch complete.")

def cmd_create_admin(args):
    print("============================================")
    print(" MAYAGEN ADMIN SETUP")
    print("============================================")
    
    db_url = config.DATABASE_URL
    if not db_url:
        print("[Error] DATABASE_URL is not set.")
        return

    # Force sync driver and 127.0.0.1 for robustness on CLI
    if "postgresql+asyncpg://" in db_url:
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
    
    if "localhost" in db_url:
        # Often helpful on Windows
        db_url = db_url.replace("localhost", "127.0.0.1")
    
    try:
        engine = create_engine(db_url)
        with engine.connect() as conn:
            print("[System] Connected to database.")
            
            # 1. Add role column if missing
            try:
                result = conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='user' AND column_name='role'"))
                if not result.fetchone():
                    conn.execute(text("ALTER TABLE \"user\" ADD COLUMN role VARCHAR DEFAULT 'user'"))
                    conn.commit()
                    print("[Success] Column 'role' added to User table.")
                else:
                    print("[Info] Column 'role' already exists.")
            except Exception as e:
                conn.rollback()
                print(f"[Warning] Checked role column: {e}")

            # 2. Promote first user to admin
            print("[System] Promoting first user to ADMIN...")
            try:
                # Find first user
                result = conn.execute(text("SELECT id, username FROM \"user\" ORDER BY id ASC LIMIT 1"))
                user = result.fetchone()
                
                if user:
                    user_id, username = user
                    # Check current role
                    role_res = conn.execute(text(f"SELECT role FROM \"user\" WHERE id={user_id}"))
                    current_role = role_res.scalar()
                    
                    if current_role != 'admin':
                        conn.execute(text(f"UPDATE \"user\" SET role='admin' WHERE id={user_id}"))
                        conn.commit()
                        print(f"[Success] User '{username}' (ID: {user_id}) has been promoted to ADMIN.")
                    else:
                        print(f"[Info] User '{username}' is already an ADMIN.")
                else:
                    print("[Warning] No users found in database. Register a user first!")
            except Exception as e:
                conn.rollback()
                print(f"[Error] Failed to promote user: {e}")

    except Exception as e:
        print(f"[Error] Database connection failed: {e}")

def main():
    parser = argparse.ArgumentParser(description="MayaGen CLI Tool")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Generate Command
    parser_gen = subparsers.add_parser("generate", help="Run batch image generation")
    parser_gen.add_argument("--model", type=str, default="lcm", choices=config.WORKFLOWS.keys(), help="Model to use")
    parser_gen.add_argument("--input", type=str, default="prompts.txt", help="Path to prompts file")
    parser_gen.add_argument("--output", type=str, default=config.OUTPUT_FOLDER, help="Output directory")
    parser_gen.set_defaults(func=cmd_generate)

    # Create Admin Command
    parser_admin = subparsers.add_parser("create-admin", help="Promote the first user to Admin")
    parser_admin.set_defaults(func=cmd_create_admin)

    args = parser.parse_args()
    
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
