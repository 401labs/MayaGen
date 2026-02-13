"""
Image Edit Service - Azure AI Foundry FLUX.1-Kontext-pro

Two approaches:
1. Image editing: BFL provider API at services.ai.azure.com
   POST /providers/blackforestlabs/v1/flux-kontext-pro?api-version=preview
2. Text-to-image: OpenAI SDK via openai.azure.com/openai/v1/
"""

import base64
import io
import os
from pathlib import Path
from typing import Optional
from openai import OpenAI
from fastapi import UploadFile
import httpx
import logging

from app.core import config

logger = logging.getLogger(__name__)


class ImageEditService:
    """Service for image generation/editing using Azure AI Foundry FLUX.1-Kontext-pro."""

    def __init__(self):
        self.api_key = config.AZURE_FOUNDRY_API_KEY
        self.model = config.AZURE_FOUNDRY_MODEL  # "FLUX.1-Kontext-pro"

        # For text-to-image generation: OpenAI SDK via openai.azure.com
        self.client = OpenAI(
            base_url=config.AZURE_FOUNDRY_ENDPOINT,
            api_key=self.api_key,
        )

        # For image editing: BFL provider API via services.ai.azure.com
        self.bfl_endpoint = config.AZURE_FOUNDRY_BFL_ENDPOINT
        self.edit_url = f"{self.bfl_endpoint}/providers/blackforestlabs/v1/flux-kontext-pro"

        if not self.api_key:
            logger.warning("AZURE_FOUNDRY_API_KEY not set")

        logger.info(f"ImageEditService initialized")
        logger.info(f"  BFL edit endpoint: {self.edit_url}")
        logger.info(f"  OpenAI generation endpoint: {config.AZURE_FOUNDRY_ENDPOINT}")
        logger.info(f"  Model: {self.model}")

    async def edit_image(self, image_bytes: bytes, prompt: str, negative_prompt: Optional[str] = None, width: int = 1024, height: int = 1024, **kwargs) -> bytes:
        """
        Edit an image using FLUX.1-Kontext-pro via BFL provider API.

        Sends the input image as base64 in the JSON body to:
        POST {bfl_endpoint}/providers/blackforestlabs/v1/flux-kontext-pro?api-version=preview
        """
        try:
            full_prompt = prompt
            if negative_prompt:
                full_prompt = f"{prompt}. Avoid: {negative_prompt}"

            # Encode image to base64
            base64_image = base64.b64encode(image_bytes).decode("utf-8")

            logger.info(f"Editing image with {self.model}")
            logger.info(f"Prompt: '{full_prompt[:80]}...'")
            logger.info(f"Input image: {len(image_bytes)} bytes")
            logger.info(f"URL: {self.edit_url}?api-version=preview")

            async with httpx.AsyncClient(timeout=120.0) as http_client:
                response = await http_client.post(
                    f"{self.edit_url}?api-version=preview",
                    headers={
                        "Content-Type": "application/json",
                        "api-key": self.api_key,
                    },
                    json={
                        "prompt": full_prompt,
                        "input_image": base64_image,
                        "model": self.model.lower(),
                        "output_format": "png",
                        "width": width,
                        "height": height,
                    },
                )

                logger.info(f"Response status: {response.status_code}")

                if response.status_code != 200:
                    error_text = response.text[:500]
                    logger.error(f"BFL API error {response.status_code}: {error_text}")
                    raise Exception(f"BFL API error {response.status_code}: {error_text}")

                result = response.json()

                # Extract image from response
                if "data" in result and len(result["data"]) > 0:
                    image_data = result["data"][0]
                    if "b64_json" in image_data:
                        decoded = base64.b64decode(image_data["b64_json"])
                        logger.info(f"Image edited successfully ({len(decoded)} bytes)")
                        return decoded
                    elif "url" in image_data:
                        img_resp = await http_client.get(image_data["url"])
                        logger.info(f"Image fetched from URL ({len(img_resp.content)} bytes)")
                        return img_resp.content

                raise ValueError(f"Unexpected response format: {list(result.keys())}")

        except Exception as e:
            logger.error(f"Image editing failed: {str(e)}")
            raise Exception(f"Failed to edit image: {str(e)}")

    async def generate_image(self, prompt: str, negative_prompt: Optional[str] = None, width: int = 1024, height: int = 1024) -> bytes:
        """
        Generate an image from text only (no input image).
        Uses the exact official Azure sample code pattern.
        """
        try:
            full_prompt = prompt
            if negative_prompt:
                full_prompt = f"{prompt}. Avoid: {negative_prompt}"

            logger.info(f"Generating image with {self.model} via OpenAI SDK")
            logger.info(f"Prompt: '{full_prompt[:80]}...'")

            img = self.client.images.generate(
                model=self.model,
                prompt=full_prompt,
                n=1,
                size=f"{width}x{height}",
            )

            image_data = img.data[0]

            if hasattr(image_data, "b64_json") and image_data.b64_json:
                decoded = base64.b64decode(image_data.b64_json)
                logger.info(f"Image generated successfully ({len(decoded)} bytes)")
                return decoded
            elif hasattr(image_data, "url") and image_data.url:
                async with httpx.AsyncClient() as http:
                    resp = await http.get(image_data.url)
                    logger.info(f"Image fetched from URL ({len(resp.content)} bytes)")
                    return resp.content
            else:
                raise ValueError("No image data in response")

        except Exception as e:
            logger.error(f"Image generation failed: {str(e)}")
            raise Exception(f"Failed to generate image: {str(e)}")

    async def save_input_image(self, image_bytes: bytes, user_id: int, filename: str = "input.png") -> str:
        """Save uploaded input image to disk."""
        try:
            input_dir = Path(config.OUTPUT_FOLDER) / "edits" / "inputs" / str(user_id)
            input_dir.mkdir(parents=True, exist_ok=True)

            from datetime import datetime
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            safe_filename = f"input_{timestamp}_{filename}"
            file_path = input_dir / safe_filename

            with open(file_path, "wb") as f:
                f.write(image_bytes)

            relative_path = str(file_path.relative_to(config.OUTPUT_FOLDER))
            logger.info(f"Saved input image to: {relative_path}")
            return relative_path

        except Exception as e:
            logger.error(f"Failed to save input image: {str(e)}")
            raise

    def validate_image(self, image_file: UploadFile) -> bool:
        """Validate uploaded image file."""
        if image_file.filename:
            ext = image_file.filename.split(".")[-1].lower()
            if ext not in config.ALLOWED_IMAGE_FORMATS:
                logger.warning(f"Invalid image format: {ext}")
                return False

        if image_file.content_type:
            if not image_file.content_type.startswith("image/"):
                logger.warning(f"Invalid content type: {image_file.content_type}")
                return False

        return True


# Singleton instance
image_edit_service = ImageEditService()
