from uuid import UUID

from psycopg import Connection

from app.models.user import User, UserRole


def _user(row: dict | None) -> User | None:
    if row is None:
        return None
    return User(**{**row, "role": UserRole(row["role"])})


def find_by_email(connection: Connection, email: str) -> User | None:
    return _user(connection.execute(
        "SELECT id, name, email, role, password_hash FROM users WHERE email = %s",
        (email,),
    ).fetchone())


def find_by_id(connection: Connection, user_id: UUID) -> User | None:
    return _user(connection.execute(
        "SELECT id, name, email, role, password_hash FROM users WHERE id = %s",
        (user_id,),
    ).fetchone())


def create_user(
    connection: Connection, name: str, email: str, role: UserRole, password_hash: str
) -> User:
    row = connection.execute(
        """INSERT INTO users (name, email, role, password_hash)
           VALUES (%s, %s, %s, %s)
           RETURNING id, name, email, role, password_hash""",
        (name, email, role.value, password_hash),
    ).fetchone()
    return User(**{**row, "role": UserRole(row["role"])})
