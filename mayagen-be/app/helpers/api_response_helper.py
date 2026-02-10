from typing import Any, Optional
from fastapi.responses import JSONResponse
from fastapi.encoders import jsonable_encoder

def api_success(
    status_code: int = 200,
    message: str = "Success",
    data: Any = None
) -> JSONResponse:
    """
    Standard Success Response
    {
        "success": true,
        "message": "Success",
        "data": { ... }
    }
    """
    content = {
        "success": True,
        "message": message,
        "data": jsonable_encoder(data)
    }
    return JSONResponse(status_code=status_code, content=content)

def api_error(
    status_code: int = 400,
    message: str = "Error",
    error: Any = None
) -> JSONResponse:
    """
    Standard Error Response
    {
        "success": false,
        "message": "Error Description",
        "error": { ... details ... }
    }
    """
    content = {
        "success": False,
        "message": message,
        "error": error
    }
    return JSONResponse(status_code=status_code, content=content)
