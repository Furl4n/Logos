from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from psycopg import Connection

from app.core.database import get_database
from app.core.errors import APIError
from app.core.security import token_user_id
from app.models.user import User, UserRole
from app.repositories.users import find_by_id

# Confirma a transação antes de enviar a resposta HTTP.
Database = Annotated[Connection, Depends(get_database, scope="function")]
bearer = HTTPBearer(auto_error=False)


def get_current_user(
    connection: Database,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
) -> User:
    if credentials is None:
        raise APIError(401, "UNAUTHENTICATED", "Autenticação necessária.")
    user = find_by_id(connection, token_user_id(credentials.credentials))
    if user is None:
        raise APIError(401, "UNAUTHENTICATED", "Sessão inválida ou expirada.")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_analyst(user: CurrentUser) -> User:
    if user.role != UserRole.ANALYST:
        raise APIError(403, "FORBIDDEN", "Acesso exclusivo para analistas.")
    return user
