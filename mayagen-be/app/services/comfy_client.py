import websocket
import uuid
import json
import urllib.request
import urllib.parse
import time
import os
from pathlib import Path
from ..core import config

class ComfyUIProvider:
    def __init__(self, server_address):
        self.server_address = server_address
        self.client_id = str(uuid.uuid4())
        self.ws = websocket.WebSocket()

    def load_workflow(self, workflow_path: Path):
        with open(workflow_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def queue_prompt(self, prompt_workflow):
        p = {"prompt": prompt_workflow, "client_id": self.client_id}
        data = json.dumps(p).encode('utf-8')
        req = urllib.request.Request(f"http://{self.server_address}/prompt", data=data)
        return json.loads(urllib.request.urlopen(req).read())

    def get_image(self, filename, subfolder, folder_type):
        data = {"filename": filename, "subfolder": subfolder, "type": folder_type}
        url_values = urllib.parse.urlencode(data)
        with urllib.request.urlopen(f"http://{self.server_address}/view?{url_values}") as response:
            return response.read()

    def get_history(self, prompt_id):
        with urllib.request.urlopen(f"http://{self.server_address}/history/{prompt_id}") as response:
            return json.loads(response.read())

    def generate(self, prompt_text: str, output_path: str, width: int = 512, height: int = 512, workflow_path: Path = None, timeout: int = 600):
        """
        Main function to generate an image from text.
        Timeout default: 10 minutes.
        """
        # 1. Connect first
        print(f"[ComfyUI] Connecting to {self.server_address}...")
        self.ws.connect(f"ws://{self.server_address}/ws?clientId={self.client_id}")
        self.ws.settimeout(1.0)
        
        # 2. Load Workflow Template
        workflow = self.load_workflow(workflow_path)
        
        # 3. Inject Prompt (Scanning for CLIPTextEncode nodes)
        if "6" in workflow:
           workflow["6"]["inputs"]["text"] = prompt_text
           print("[ComfyUI] Updated prompt.")

        # 4. Inject Resolution (Scanning for EmptyLatentImage)
        # ... logic for resolution ...
        found_latent = False
        for node_id, node in workflow.items():
            if node.get("class_type") == "EmptyLatentImage":
                node["inputs"]["width"] = width
                node["inputs"]["height"] = height
                print(f"[ComfyUI] Updated resolution to {width}x{height}")
                found_latent = True
                break
        
        if not found_latent:
            if "5" in workflow:
                workflow["5"]["inputs"]["width"] = width
                workflow["5"]["inputs"]["height"] = height

        # 5. Send to Queue
        prompt_response = self.queue_prompt(workflow)
        prompt_id = prompt_response['prompt_id']
        print(f"[ComfyUI] Prompt queued: {prompt_id}. Waiting for execution...")

        # 6. Listen for Result
        start_time = time.time()
        while True:
            if time.time() - start_time > timeout:
                self.ws.close()
                raise TimeoutError(f"Generation timed out after {timeout} seconds")

            try:
                out = self.ws.recv()
                if isinstance(out, str):
                    message = json.loads(out)
                    if message['type'] == 'executing':
                        data = message['data']
                        if data['node'] is None and data['prompt_id'] == prompt_id:
                            print("[ComfyUI] Generation finished.")
                            break # Execution is done
                else:
                    continue # Binary data (previews), ignore
            except websocket.WebSocketTimeoutException:
                continue
            except Exception as e:
                self.ws.close()
                raise e

        # 7. Retrieve Image History
        # ... rest of the function ...
        history = self.get_history(prompt_id)[prompt_id]
        
        # 8. Download Image
        for o in history['outputs']:
            for node_id in history['outputs']:
                node_output = history['outputs'][node_id]
                if 'images' in node_output:
                    for image in node_output['images']:
                        image_data = self.get_image(image['filename'], image['subfolder'], image['type'])
                        
                        # Save
                        with open(output_path, "wb") as f:
                            f.write(image_data)
                        print(f"[ComfyUI] Saved to {output_path}")
                        
                        # Cleanup
                        self.ws.close()
                        return output_path
        
        self.ws.close()
        raise Exception("No image found in output")
