import os
import time
from pathlib import Path
from .core import config
from .services.comfy_client import ComfyUIProvider

def load_prompts(file_path):
    with open(file_path, 'r') as f:
        return [line.strip() for line in f if line.strip()]

def run_batch_generation():
    print("============================================")
    print(" MAYAGEN - SYNTHETIC DATA GENERATOR ")
    print("============================================")

    # 1. Setup
    config.OUTPUT_DIR.mkdir(exist_ok=True)
    provider = ComfyUIProvider(config.COMFYUI["server_address"])

    # 2. Get Prompts
    prompts_file = Path("prompts.txt") # In root
    if not prompts_file.exists():
        print(f"[Error] prompts.txt not found at {prompts_file.resolve()}")
        return

    prompts = load_prompts(prompts_file)
    print(f"[System] Loaded {len(prompts)} prompts from prompts.txt\n")

    # 3. Generate Loop
    for i, prompt_text in enumerate(prompts):
        if not prompt_text: continue
        
        print(f"\n[{i+1}/{len(prompts)}] Prompt: {prompt_text[:60]}")
        timestamp = int(time.time())
        filename = f"{config.IMAGE_PREFIX}{timestamp}_{i}.png"
        output_path = config.OUTPUT_DIR / filename
        
        try:
            provider.generate(prompt_text, str(output_path))
            print("   -> Success!")
        except Exception as e:
            print(f"[Error] ComfyUI connection failed: {e}")
            print("   -> Failed.")

    print("\n[System] Batch generation complete.")

if __name__ == "__main__":
    run_batch_generation()
