from psycopg import Connection

from app.core.errors import APIError
from app.core.security import DUMMY_HASH, verify_password
from app.repositories.users import find_by_email
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse


def login(connection: Connection, data: LoginRequest) -> LoginResponse:
    user = find_by_email(connection, str(data.email))
    valid = verify_password(data.password, user.password_hash if user else DUMMY_HASH)
    if user is None or not valid or not user.is_active:
        raise APIError(401, "INVALID_CREDENTIALS", "E-mail ou senha inválidos.")
    return LoginResponse(
        user=UserResponse.model_validate(user),
    )
