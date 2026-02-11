from fastapi import APIRouter, Cookie, HTTPException, Depends
from pydantic import BaseModel
import jwt
from typing import Optional
from ..config import get_settings

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()

class AuthResponse(BaseModel):
    username: str
    is_admin: bool
    role: str
    isAuthenticated: bool

@router.get("/me")
async def get_current_user_from_token(delta_token: Optional[str] = Cookie(None)):
    """
    Validates the SSO cookie from the main portal.
    """
    if not delta_token:
        # No cookie found
        raise HTTPException(status_code=401, detail="Authentication token missing")

    try:
        # Decode the token using the shared secret
        payload = jwt.decode(delta_token, settings.secret_key, algorithms=["HS256"])
        
        username = payload.get("user")
        role = payload.get("role", "user")
        
        return {
            "username": username,
            "role": role,
            "is_admin": role == "admin",
            "isAuthenticated": True
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
