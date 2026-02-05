"""
Prompt Generator Service for Bulk/Batch Image Generation.

Generates unique prompts by combining variations from a BatchJob configuration.
Uses template-based generation for predictable, fast prompt creation.
"""

import random
from typing import List, Dict, Any, Optional


# Default variation presets
DEFAULT_VARIATIONS = {
    "colors": ["red", "blue", "green", "orange", "black", "white", "brown", "gray", "golden", "silver"],
    "environments": ["indoor", "outdoor", "studio", "nature", "urban", "forest", "beach", "mountain", "desert", "underwater"],
    "actions": ["sitting", "standing", "running", "sleeping", "eating", "playing", "walking", "jumping", "resting", "looking"],
    "styles": ["photorealistic", "cinematic", "artistic", "professional photo", "highly detailed", "studio lighting"],
    "lighting": ["natural light", "studio lighting", "golden hour", "dramatic lighting", "soft light", "backlit", "rim lighting"],
    "camera": ["close-up", "portrait", "full body", "wide angle", "macro", "eye-level", "overhead shot"]
}

# Default prompt template
DEFAULT_TEMPLATE = "A {color} {target} {action} in a {environment}, {style}, {lighting}, 8k, highly detailed"


def generate_single_prompt(
    target_subject: str,
    variations: Dict[str, List[str]],
    template: Optional[str] = None
) -> str:
    """
    Generate a single prompt by randomly selecting from variations.
    
    Args:
        target_subject: The main subject (e.g., "domestic cat", "sports car")
        variations: Dict of variation categories to lists of options
        template: Optional custom template string
    
    Returns:
        A formatted prompt string
    """
    template = template or DEFAULT_TEMPLATE
    
    # Build replacements dict
    replacements = {"target": target_subject}
    
    # Pick random values from each variation category
    for key, values in variations.items():
        if values:
            # Remove 's' suffix for template matching (colors -> color)
            template_key = key.rstrip('s') if key.endswith('s') else key
            replacements[template_key] = random.choice(values)
    
    # Fill in defaults for any missing template variables
    for key in ["color", "environment", "action", "style", "lighting", "camera"]:
        if key not in replacements:
            default_values = DEFAULT_VARIATIONS.get(key + 's', DEFAULT_VARIATIONS.get(key, [""]))
            replacements[key] = random.choice(default_values) if default_values else ""
    
    # Format the template
    try:
        prompt = template.format(**replacements)
    except KeyError as e:
        # Fallback: use simple concatenation if template has unknown keys
        prompt = f"A {replacements.get('color', '')} {target_subject} {replacements.get('action', '')} in {replacements.get('environment', '')}, {replacements.get('style', 'photorealistic')}, highly detailed"
    
    # Clean up extra spaces
    prompt = ' '.join(prompt.split())
    
    return prompt


def generate_prompts(
    target_subject: str,
    total_images: int,
    variations: Dict[str, List[str]],
    template: Optional[str] = None,
    unique: bool = True
) -> List[str]:
    """
    Generate multiple prompts for batch image generation.
    
    Args:
        target_subject: The main subject
        total_images: Number of prompts to generate
        variations: Dict of variation categories
        template: Optional custom template
        unique: If True, try to avoid duplicate prompts
    
    Returns:
        List of prompt strings
    """
    prompts = []
    seen = set()
    max_attempts = total_images * 3  # Prevent infinite loops
    attempts = 0
    
    while len(prompts) < total_images and attempts < max_attempts:
        prompt = generate_single_prompt(target_subject, variations, template)
        
        if unique and prompt in seen:
            attempts += 1
            continue
        
        seen.add(prompt)
        prompts.append(prompt)
        attempts += 1
    
    # If we couldn't generate enough unique prompts, fill with duplicates
    while len(prompts) < total_images:
        prompt = generate_single_prompt(target_subject, variations, template)
        prompts.append(prompt)
    
    return prompts


def estimate_unique_combinations(variations: Dict[str, List[str]]) -> int:
    """
    Calculate the maximum number of unique prompt combinations possible.
    
    Args:
        variations: Dict of variation categories
    
    Returns:
        Number of possible unique combinations
    """
    if not variations:
        return 1
    
    total = 1
    for values in variations.values():
        if values:
            total *= len(values)
    
    return total


def get_sample_prompts(
    target_subject: str,
    variations: Dict[str, List[str]],
    template: Optional[str] = None,
    count: int = 5
) -> List[str]:
    """
    Generate sample prompts for preview purposes.
    
    Args:
        target_subject: The main subject
        variations: Dict of variation categories
        template: Optional custom template
        count: Number of samples to generate
    
    Returns:
        List of sample prompt strings
    """
    return generate_prompts(target_subject, count, variations, template, unique=True)
