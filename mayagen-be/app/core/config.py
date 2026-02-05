from pathlib import Path
import os

# Base Directory: The root of the project (one level up from this file's package)
# syth-data/syth_data/core/config.py -> parents[2] = syth-data/
BASE_DIR = Path(__file__).resolve().parents[2]
WORKFLOWS_DIR = BASE_DIR / "workflows"
OUTPUT_DIR = BASE_DIR / "synthetic_dataset"

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)

PROVIDER = "comfyui"  # Options: "ollama", "comfyui", "mock"
ENVIRONMENT = "local" # Options: "local", "docker"

# ComfyUI Configuration
COMFYUI = {
    "server_address": "20.244.80.13:8188",  # Azure IP
    "workflow_json_path": WORKFLOWS_DIR / "workflow_sd15.json",
    "output_dir": "comfy_output", # Temporary folder on server if needed
    "timeout": 300
}

# General Settings
OUTPUT_FOLDER = str(OUTPUT_DIR)
IMAGE_PREFIX = "img_"
