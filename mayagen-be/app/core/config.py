from pathlib import Path
import os

# Base Directory: The root of the project (one level up from this file's package)
# syth-data/syth_data/core/config.py -> parents[2] = syth-data/
from dotenv import load_dotenv

# Base Directory: The root of the project (one level up from this file's package)
# syth-data/syth_data/core/config.py -> parents[2] = syth-data/
BASE_DIR = Path(__file__).resolve().parents[2]

# Load Environment Variables
ENV_FILE = BASE_DIR / ".env.development"
load_dotenv(ENV_FILE)

WORKFLOWS_DIR = BASE_DIR / "workflows"
OUTPUT_DIR = BASE_DIR / "synthetic_dataset"

# Ensure output directory exists
OUTPUT_DIR.mkdir(exist_ok=True)

PROVIDER = "comfyui"  # Options: "ollama", "comfyui", "mock"
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")

# Database
DATABASE_URL = os.getenv("DATABASE_URL")

# ComfyUI Configuration
COMFYUI = {
    "server_address": os.getenv("COMFYUI_SERVER_ADDRESS", "127.0.0.1:8188"),
    "output_dir": "comfy_output", # Temporary folder on server if needed
    "timeout": 3000 
}

WORKFLOWS = {
    "sd15": WORKFLOWS_DIR / "workflow_sd15.json",
    "flux": WORKFLOWS_DIR / "workflow_flux.json",
    "lcm": WORKFLOWS_DIR / "workflow_lcm.json"
}

# General Settings
OUTPUT_FOLDER = str(OUTPUT_DIR)
IMAGE_PREFIX = "img_"
