# config.py

# ==========================================
# CONFIGURATION
# ==========================================

CONFIG = {
    # Options: "ollama", "comfyui", "forge", "mock"
    # NOTE: Ollama image generation on Windows is currently experimental and may fail.
    # If "ollama" fails, please set this to "mock" for testing or configure "comfyui".
    "PROVIDER": "comfyui",
    
    # Environment: "local" (Windows Portable) or "docker" (Container)
    "ENVIRONMENT": "local",
    
    # Provider-Specific Settings
    "OLLAMA": {
        "api_url": "http://localhost:11434/api/generate",
        "model": "x/flux2-klein:latest", # 4B quantized model
        "timeout": 300
    },
    "COMFYUI": {
        "server_address": "127.0.0.1:8188",
        "workflow_json_path": "workflow_sd15.json", # Switched to SD1.5 for Photon model
        "output_dir": "comfy_output"
    },
    "FORGE": {
        "api_url": "http://127.0.0.1:7860/sdapi/v1/txt2img",
        "model_checkpoint": "flux1-dev-fp8.safetensors" # Optional
    },
    
    # Global Settings
    "OUTPUT_FOLDER": "synthetic_dataset",
    "IMAGE_PREFIX": "img_",
}
