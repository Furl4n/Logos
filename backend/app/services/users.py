from psycopg import Connection

from app.models.user import UserRole
from app.repositories.users import list_by_role
from app.schemas.users import UserReference


def get_drivers(connection: Connection) -> list[UserReference]:
    return [UserReference(**row) for row in list_by_role(connection, UserRole.DRIVER)]
