from uuid import UUID

from psycopg import Connection
from psycopg.errors import UniqueViolation

from app.core.errors import APIError
from app.core.security import password_hasher
from app.models.user import UserRole
from app.repositories.users import create_user, find_by_id, has_active_assignments, list_managed_users, set_active
from app.schemas.users import CreateUserRequest, ManagedUser, UserPage


def list_users(connection: Connection, search: str, page: int, page_size: int) -> UserPage:
    rows, total = list_managed_users(connection, search, page, page_size)
    return UserPage(items=[ManagedUser(**row) for row in rows], total=total, page=page, pageSize=page_size)


def register_user(connection: Connection, data: CreateUserRequest) -> ManagedUser:
    try:
        with connection.transaction():
            user = create_user(connection, data.name, str(data.email), UserRole(data.role),
                               password_hasher.hash(data.password.get_secret_value()))
    except UniqueViolation:
        raise APIError(409, "EMAIL_ALREADY_EXISTS", "Já existe um usuário com esse e-mail.") from None
    return ManagedUser(id=user.id, name=user.name, email=user.email, role=user.role, isActive=True)


def change_user_status(connection: Connection, user_id: UUID, active: bool) -> ManagedUser:
    # Serializa desativação e atribuição: o responsável deve estar ativo ao assumir.
    user = find_by_id(connection, user_id, lock=True)
    if user is None:
        raise APIError(404, "NOT_FOUND", "Usuário não encontrado.")
    if user.role == UserRole.ADMIN:
        raise APIError(403, "FORBIDDEN", "Contas administrativas são gerenciadas pelo terminal.")
    if not active and user.role == UserRole.ANALYST and has_active_assignments(connection, user_id):
        raise APIError(409, "ACTIVE_ASSIGNMENTS", "Transfira os atendimentos ativos antes de desativar este analista.")
    set_active(connection, user_id, active)
    return ManagedUser(id=user.id, name=user.name, email=user.email, role=user.role, isActive=active)
