import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError

from app.core.config import get_settings
from app.core.errors import APIError

TOKEN_TTL_SECONDS = 3600
password_hasher = PasswordHash.recommended()
# Faz a mesma verificação de hash mesmo quando o e-mail não existe.
DUMMY_HASH = password_hasher.hash(secrets.token_urlsafe(32))


def signing_key() -> str:
    secret = get_settings().jwt_secret_key
    if secret is None or len(secret.get_secret_value().encode()) < 32:
        raise RuntimeError("Configure JWT_SECRET_KEY com pelo menos 32 bytes.")
    return secret.get_secret_value()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_hasher.verify(password, password_hash)
    except UnknownHashError:
        return False


def create_access_token(user_id: UUID) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {"sub": str(user_id), "iat": now, "exp": now + timedelta(seconds=TOKEN_TTL_SECONDS)},
        signing_key(),
        algorithm="HS256",
    )


def token_user_id(token: str) -> UUID:
    key = signing_key()
    try:
        payload = jwt.decode(
            token, key, algorithms=["HS256"],
            options={"require": ["sub", "iat", "exp"]},
        )
        return UUID(payload["sub"])
    except (InvalidTokenError, ValueError, TypeError, AttributeError):
        raise APIError(401, "UNAUTHENTICATED", "Sessão inválida ou expirada.") from None
