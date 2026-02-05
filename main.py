import os
import io
import json
import time
import uuid
import base64
import random
import requests
import subprocess
from abc import ABC, abstractmethod
import urllib.request
import urllib.parse

from config import CONFIG
# ==========================================
# PROVIDER ABSTRACTION
# ==========================================

class ImageProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, output_path: str):
        pass

# ==========================================
# OLLAMA PROVIDER
# ==========================================

class OllamaProvider(ImageProvider):
    def generate(self, prompt: str, output_path: str):
        print(f"[Ollama] Generating with model '{CONFIG['OLLAMA']['model']}'...")
        
        # Ollama Image Gen is often CLI based or experimental API.
        # Check if we are using the experimental image generation or just text.
        # Note: As of early 2025, 'ollama run' with image models might output binary to stdout or save to file.
        # This implementation assumes we wrap the CLI or use the API if it supports binary response.
        
        # Attempt 1: Using subprocess to call 'ollama run' if API support is vague
        try:
            # Command: ollama run model "prompt"
            # Note: Interactive rendering might complicate this.
            # We will try the API approach first as it's cleaner.
            
            payload = {
                "model": CONFIG['OLLAMA']['model'],
                "prompt": prompt,
                "stream": False,
                # "format": "blob" # hypothetical for future
            }
            
            # Since Ollama image gen is bleeding edge, we might need to fallback to CLI
            # CLI Method:
            cmd = ["ollama", "run", CONFIG['OLLAMA']['model'], prompt]
            print(f"[Ollama] Executing: {' '.join(cmd)}")
            
            # This is a bit tricky as Ollama usually streams text. 
            # For image models like x/flux2-klein, it might save to CWD.
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=os.path.dirname(output_path))
            stdout, stderr = process.communicate()
            
            if process.returncode != 0:
                print(f"[Error] Ollama CLI failed: {stderr.decode()}")
                return False
                
            print(f"[Ollama] CLI Output: {stdout.decode()[:100]}...")
            
            # Check if an image was created in the folder
            # Usually named after the prompt or timestamp. 
            # We might need to rename the newest file.
            return True
            
        except Exception as e:
            print(f"[Error] Ollama generation failed: {e}")
            return False

# ==========================================
# COMFYUI PROVIDER
# ==========================================

class ComfyUIProvider(ImageProvider):
    def __init__(self):
        self.server_address = CONFIG['COMFYUI']['server_address']
        self.client_id = str(uuid.uuid4())
        
    def queue_prompt(self, prompt_workflow):
        p = {"prompt": prompt_workflow, "client_id": self.client_id}
        data = json.dumps(p).encode('utf-8')
        req = urllib.request.Request(f"http://{self.server_address}/prompt", data=data)
        return json.loads(urllib.request.urlopen(req).read())

    def get_history(self, prompt_id):
        with urllib.request.urlopen(f"http://{self.server_address}/history/{prompt_id}") as response:
            return json.loads(response.read())

    def get_image(self, filename, subfolder, folder_type):
        data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        url_values = urllib.parse.urlencode(data)
        with urllib.request.urlopen(f"http://{self.server_address}/view?{url_values}") as response:
            return response.read()

    def generate(self, prompt: str, output_path: str):
        print(f"[ComfyUI] Connecting to {self.server_address}...")
        
        # Load Workflow
        workflow_path = CONFIG['COMFYUI']['workflow_json_path']
        if not os.path.exists(workflow_path):
            print(f"[Error] Workflow file not found: {workflow_path}")
            print("Please export your workflow from ComfyUI in API format (Enable Dev Mode Options in settings to see 'Save (API Format)' button)")
            return False

        with open(workflow_path, 'r', encoding='utf-8') as f:
            workflow = json.load(f)

        # INSERT PROMPT INTO WORKFLOW
        # You need to know the Node ID for the KSampler or CLIP Text Encode
        # This is the tricky part of ComfyUI automation - traversing the flexible JSON.
        # We will look for a node with "class_type": "CLIPTextEncode" and inputs["text"]
        
        text_node_found = False
        for node_id, node_data in workflow.items():
            if node_data["class_type"] == "CLIPTextEncode":
                # Heuristic: The one with the longer text or specific marker is the positive prompt
                # Often node 6 or 3. Let's assume user labeled it or it's the first one.
                # Better: Prompt the user to tag their prompt node in the JSON with a specific comment?
                # For now, we update ALL text nodes that don't look like negative prompts
                current_text = node_data.get("inputs", {}).get("text", "")
                if "nude" not in current_text and "bad" not in current_text: # Very basic negative prompt detection
                     node_data["inputs"]["text"] = prompt
                     text_node_found = True
                     print(f"[ComfyUI] Updated Node {node_id} (CLIPTextEncode) with prompt.")
                     break # Only update one positive prompt

        if not text_node_found:
            print("[Warning] No CLIPTextEncode node found to receive the prompt. Check workflow JSON.")

        # EXECUTE
        try:
            prompt_id = self.queue_prompt(workflow)['prompt_id']
            print(f"[ComfyUI] Prompt queued: {prompt_id}")
            
            # Wait for completion (Polling)
            while True:
                history = self.get_history(prompt_id)
                if prompt_id in history:
                    print(f"[ComfyUI] Generation finished.")
                    outputs = history[prompt_id]['outputs']
                    
                    for node_id, node_output in outputs.items():
                        if 'images' in node_output:
                            for image in node_output['images']:
                                image_data = self.get_image(image['filename'], image['subfolder'], image['type'])
                                with open(output_path, 'wb') as f:
                                    f.write(image_data)
                                print(f"[ComfyUI] Saved to {output_path}")
                                return True
                    break
                else:
                    time.sleep(1)
        except Exception as e:
            print(f"[Error] ComfyUI connection failed: {e}")
            return False

# ==========================================
# FORGE / A1111 PROVIDER
# ==========================================

class ForgeProvider(ImageProvider):
    def generate(self, prompt: str, output_path: str):
        print(f"[Forge] POST to {CONFIG['FORGE']['api_url']}...")
        payload = {
            "prompt": prompt,
            "steps": 20,
            "width": 1024,
            "height": 1024,
            # "sampler_name": "Euler a",
        }
        
        try:
            response = requests.post(url=CONFIG['FORGE']['api_url'], json=payload)
            r = response.json()
            
            if 'images' in r:
                image_data = base64.b64decode(r['images'][0])
                with open(output_path, 'wb') as f:
                    f.write(image_data)
                print(f"[Forge] Saved to {output_path}")
                return True
            else:
                print(f"[Error] No images in response: {r}")
                return False
                
        except Exception as e:
            print(f"[Error] Forge request failed: {e}")
            return False

# ==========================================
# MOCK PROVIDER
# ==========================================
class MockProvider(ImageProvider):
    def generate(self, prompt: str, output_path: str):
        print(f"[Mock] Simulating generation for: '{prompt}'")
        time.sleep(1)
        # Create a dummy colored image (requires PIL or just write raw bytes?)
        # Let's write a simple text file renamed as .png for "mock" or just a copy of a placeholder?
        # Better: create a 1x1 pixel simply
        with open(output_path, "wb") as f:
             # Minimal 1x1 PNG header
             f.write(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\xf8\xff\xff?\x00\x05\xfe\x02\xfe\xa7\xd4\xd3\x00\x00\x00\x00IEND\xaeB`\x82')
        print(f"[Mock] Created dictionary image at {output_path}")
        return True

# ==========================================
# MAIN EXECUTION
# ==========================================

def get_provider(name):
    if name == "ollama": return OllamaProvider()
    if name == "comfyui": return ComfyUIProvider()
    if name == "forge": return ForgeProvider()
    if name == "mock": return MockProvider()
    raise ValueError(f"Unknown provider: {name}")

def main():
    # 1. Setup Output Directory
    out_dir = CONFIG["OUTPUT_FOLDER"]
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)
        print(f"[System] Created output folder: {out_dir}")

    # 2. Config & Provider
    provider_name = CONFIG["PROVIDER"]
    print(f"============================================")
    print(f" SYNTHETIC DATA GENERATOR - {provider_name.upper()}")
    print(f"============================================")
    
    provider = get_provider(provider_name)
    
    # 3. Prompts (List or Load from file)
    prompts = [
        "A cyberpunk street scene with neon rain, high resolution, 8k",
        "A futuristic robot gardener watering plants in a greenhouse, detailed",
        # "Add your prompts here..."
    ]
    
    # Optional: Load prompts from a file if it exists
    prompt_file = "prompts.txt"
    if os.path.exists(prompt_file):
        with open(prompt_file, "r") as f:
            prompts = [line.strip() for line in f if line.strip()]
            print(f"[System] Loaded {len(prompts)} prompts from {prompt_file}")

    # 4. Generation Loop
    for i, prompt in enumerate(prompts):
        print(f"\n[{i+1}/{len(prompts)}] Prompt: {prompt}")
        
        timestamp = int(time.time())
        filename = f"{CONFIG['IMAGE_PREFIX']}{timestamp}_{i}.png"
        output_path = os.path.join(out_dir, filename)
        
        success = provider.generate(prompt, output_path)
        
        if success:
            print(f"   -> Success!")
        else:
            print(f"   -> Failed.")
            
        time.sleep(1) # Gentle delay

    print("\n[System] Batch generation complete.")

if __name__ == "__main__":
    main()
