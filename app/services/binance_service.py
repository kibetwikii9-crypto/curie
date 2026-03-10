"""
Minimal Binance service for credential validation and listenKey management.

This service is intentionally small: it provides a test_credentials call
and helpers to create/keepalive listen keys. It does NOT start any
websocket workers here; that should be implemented separately if you
want real-time event handling.

Security: this module expects an environment variable
`CREDENTIALS_ENCRYPTION_KEY` to exist for Fernet encryption. The key
must be a URL-safe base64-encoded 32-byte key (as produced by
cryptography.fernet.Fernet.generate_key()). If the env var is missing,
the connect endpoint will reject storing secrets to avoid unrecoverable
encryption failures.
"""
import os
import time
import hmac
import hashlib
import logging
from typing import Optional, Dict, Any

import httpx
from cryptography.fernet import Fernet

from app.config import settings

log = logging.getLogger(__name__)


BINANCE_REST_BASE = "https://api.binance.com"


def _get_fernet() -> Fernet:
    key = os.environ.get("CREDENTIALS_ENCRYPTION_KEY")
    if not key:
        # Do not silently generate a key - require explicit env var for safety
        raise RuntimeError("CREDENTIALS_ENCRYPTION_KEY not set in environment")
    return Fernet(key.encode() if isinstance(key, str) else key)


def sign_params(query_string: str, secret: str) -> str:
    return hmac.new(secret.encode(), query_string.encode(), hashlib.sha256).hexdigest()


async def test_credentials(api_key: str, api_secret: str) -> Dict[str, Any]:
    """Validate Binance API key/secret by calling /api/v3/account.

    Returns the parsed JSON response on success. Raises for HTTP errors.
    """
    timestamp = int(time.time() * 1000)
    params = f"timestamp={timestamp}"
    signature = sign_params(params, api_secret)
    url = f"{BINANCE_REST_BASE}/api/v3/account?{params}&signature={signature}"

    headers = {"X-MBX-APIKEY": api_key}

    async with httpx.AsyncClient() as client:
        resp = await client.get(url, headers=headers, timeout=10.0)
        resp.raise_for_status()
        return resp.json()


async def create_listen_key(api_key: str) -> Optional[str]:
    """Create a user data listenKey for websockets (returns listenKey string).

    This call requires only the API key header; it does not require the secret.
    """
    url = f"{BINANCE_REST_BASE}/api/v3/userDataStream"
    headers = {"X-MBX-APIKEY": api_key}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, headers=headers, timeout=10.0)
            resp.raise_for_status()
            data = resp.json()
            return data.get("listenKey")
    except Exception as e:
        log.warning(f"Failed to create listenKey: {e}")
        return None


async def keepalive_listen_key(api_key: str, listen_key: str) -> bool:
    """Keepalive (PUT) the listenKey to prevent expiration.

    Returns True on success.
    """
    url = f"{BINANCE_REST_BASE}/api/v3/userDataStream"
    headers = {"X-MBX-APIKEY": api_key}
    params = {"listenKey": listen_key}
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.put(url, headers=headers, params=params, timeout=10.0)
            resp.raise_for_status()
            return True
    except Exception as e:
        log.warning(f"Failed to keepalive listenKey: {e}")
        return False


def encrypt_secret(secret: str) -> str:
    f = _get_fernet()
    return f.encrypt(secret.encode()).decode()


def decrypt_secret(token: str) -> str:
    f = _get_fernet()
    return f.decrypt(token.encode()).decode()
