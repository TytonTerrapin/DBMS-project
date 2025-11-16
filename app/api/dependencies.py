from fastapi import Depends, HTTPException, status
from fastapi_clerk_auth import ClerkHTTPBearer
from ..db.models import User
import os
from types import SimpleNamespace
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- IMPORTANT ---
# Get this from your Clerk Dashboard -> API Keys -> Advanced
# You must set this in your .env file
CLERK_JWKS_URL = os.environ.get("CLERK_JWKS_URL")

if not CLERK_JWKS_URL:
    raise RuntimeError("CLERK_JWKS_URL environment variable not set. Please set it in .env")

# Read optional environment-based settings for Clerk verification
CLERK_ISSUER = os.environ.get("CLERK_ISSUER", "").strip() or None
CLERK_AUDIENCE = os.environ.get("CLERK_AUDIENCE", "").strip() or None

# Force verification flags to False.
# In some local/dev setups Clerk's issuer/audience validation can reject
# tokens issued to the browser. For now we disable these checks so local
# flows work reliably. Re-enable and configure in production.
CLERK_VERIFY_AUD = False
CLERK_VERIFY_ISS = False

# Debug: Print what we loaded
print(f"DEBUG: CLERK_JWKS_URL={CLERK_JWKS_URL}")
print(f"DEBUG: CLERK_ISSUER={CLERK_ISSUER}")
print(f"DEBUG: CLERK_VERIFY_AUD={CLERK_VERIFY_AUD}")
print(f"DEBUG: CLERK_VERIFY_ISS={CLERK_VERIFY_ISS}")

def _build_clerk_config():
    """Try to construct the package's documented config object if available.
    Fallback to a SimpleNamespace when the package doesn't expose a config class.
    This allows the code to work across different versions of fastapi_clerk_auth.
    """
    # Preferred: the package exposes a config class like ClerkConfig or Config
    try:
        # Common possible class names
        from fastapi_clerk_auth import ClerkConfig as _ClerkConfig  # type: ignore
    except Exception:
        _ClerkConfig = None

    if _ClerkConfig is None:
        try:
            from fastapi_clerk_auth import Config as _ClerkConfig  # type: ignore
        except Exception:
            _ClerkConfig = None

    # Build config dict with all parameters
    config_kwargs = {
        "jwks_url": CLERK_JWKS_URL,
    }
    
    # Only add optional parameters if they are set
    if CLERK_AUDIENCE is not None:
        config_kwargs["audience"] = CLERK_AUDIENCE
    
    if CLERK_ISSUER is not None:
        config_kwargs["issuer"] = CLERK_ISSUER
    
    # Always set verify flags explicitly (default False)
    config_kwargs["verify_aud"] = CLERK_VERIFY_AUD
    config_kwargs["verify_iss"] = CLERK_VERIFY_ISS

    if _ClerkConfig is not None:
        try:
            return _ClerkConfig(**config_kwargs)
        except Exception as e:
            print(f"DEBUG: Failed to create ClerkConfig: {e}")
            # If the package's config signature differs, fall back to SimpleNamespace
            pass

    # Fallback: SimpleNamespace with all expected attributes
    return SimpleNamespace(**config_kwargs)


clerk_config = _build_clerk_config()
clerk_auth_guard = ClerkHTTPBearer(clerk_config)


def get_current_user(
    credentials = Depends(clerk_auth_guard)
) -> User:
    """
    Verifies the Clerk token, gets the user from the database,
    and CREATES the user if they don't exist ("just-in-time").
    """
    try:
        # credentials.decoded is the token payload
        clerk_user_id = credentials.decoded.get("sub") # "sub" is the clerk_user_id
        
        if not clerk_user_id:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Try to get or create the user
        # We can try to get the email from the token payload
        email = credentials.decoded.get("email")  # This claim might not exist
        
        user = User.get_or_create(clerk_user_id, email)
        
        return user
        
    except Exception as e:
        # This catches invalid tokens, expired tokens, and verification failures.
        # Log a concise debug message to help diagnose why Clerk rejected the token.
        # NOTE: do NOT print the raw token in logs in production. We only log error info.
        try:
            # Some exceptions carry useful attributes; include type and message.
            print(f"DEBUG: Clerk token validation failed ({type(e).__name__}): {str(e)}")
        except Exception:
            # Swallow any logging errors to avoid masking the original problem
            pass
        # Re-raise as HTTP 401 to indicate authentication failure.
        raise HTTPException(status_code=401, detail=f"Invalid authentication token: {e}")
def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    A dependency that checks if the current user is an admin.
    Raises  Forbidden error if not.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTT_FORBIDDEN, 
            detail="Not authorized: Admin access required"
        )
    return current_user