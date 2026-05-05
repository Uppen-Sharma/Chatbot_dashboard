from typing import Optional, Dict, Any
from fastapi import Depends, Header, HTTPException, Request
from src.core.config import AUTH_MODE, ADMIN_EMAILS, ALLOWED_DOMAINS
from src.core.logging import logger

async def get_current_user(
    request: Request,
    x_auth_request_email: Optional[str] = Header(None),
    x_auth_request_user: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Extracts the authenticated user identity from the headers injected by oauth2-proxy.
    If running in development mode (AUTH_MODE=dev), it will inject a mock admin user
    if headers are missing, allowing local development without NGINX.
    """
    if AUTH_MODE == "dev" and not x_auth_request_email:
        # Development fallback
        logger.debug("AUTH_MODE=dev: Injecting mock user identity")
        return {
            "email": "admin@test.com",
            "user": "Mock Admin",
        }

    if not x_auth_request_email:
        raise HTTPException(
            status_code=401,
            detail="Unauthorized: Missing identity headers from oauth2-proxy"
        )

    return {
        "email": x_auth_request_email.lower().strip(),
        "user": x_auth_request_user,
    }


def require_role(role: str):
    """
    Dependency factory to enforce RBAC.
    """
    async def role_checker(
        user: Dict[str, Any] = Depends(get_current_user)
    ) -> Dict[str, Any]:
        email = user["email"]
        
        # Admin access logic
        if role == "admin":
            is_admin_email = email in [e.lower().strip() for e in ADMIN_EMAILS]
            
            # Dynamically check if the email ends with ANY of the allowed domains
            is_allowed_domain = any(email.endswith(domain.strip()) for domain in ALLOWED_DOMAINS)
            
            if not (is_admin_email or is_allowed_domain):
                logger.warning(f"Access denied for user {email} (requires {role})")
                raise HTTPException(
                    status_code=403, 
                    detail="Forbidden: Insufficient permissions"
                )
        
        return user

    return role_checker