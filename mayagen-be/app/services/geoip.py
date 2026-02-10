import httpx
import logging

logger = logging.getLogger(__name__)

async def get_location_from_ip(ip: str) -> str:
    """
    Resolves IP address to a location string using ip-api.com (free).
    Returns 'Unknown' on failure or if IP is local/private.
    """
    if not ip or ip in ["127.0.0.1", "::1", "localhost"]:
        return "Localhost"
        
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip}")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    city = data.get("city", "")
                    country = data.get("country", "")
                    return f"{city}, {country}".strip(", ")
    except Exception as e:
        logger.warning(f"GeoIP resolution failed for {ip}: {e}")
        
    return "Unknown"
