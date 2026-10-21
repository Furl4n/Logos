from uuid import UUID

from psycopg import Connection

from app.models.user import User, UserRole


def _user(row: dict | None) -> User | None:
    if row is None:
        return None
    return User(**{**row, "role": UserRole(row["role"])})


def find_by_email(connection: Connection, email: str) -> User | None:
    return _user(connection.execute(
        "SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = %s",
        (email,),
    ).fetchone())


def find_by_id(connection: Connection, user_id: UUID, *, lock: bool = False) -> User | None:
    return _user(connection.execute(
        "SELECT id, name, email, role, password_hash, is_active FROM users WHERE id = %s"
        + (" FOR UPDATE" if lock else ""),
        (user_id,),
    ).fetchone())


def list_by_role(connection: Connection, role: UserRole, *, include_admin: bool = False) -> list[dict]:
    return connection.execute(
        "SELECT id, name FROM users WHERE (role = %s OR (%s AND role = 'ADMIN')) AND is_active ORDER BY name, id",
        (role.value, include_admin),
    ).fetchall()


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


def list_managed_users(connection: Connection, search: str, page: int, page_size: int, status: str = "ACTIVE") -> tuple[list[dict], int]:
    escaped = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    pattern = f"%{escaped}%"
    condition = "WHERE (name ILIKE %s OR email ILIKE %s) AND (%s = 'ALL' OR is_active = %s)"
    params = (pattern, pattern, status, status == "ACTIVE")
    total = connection.execute(f"SELECT count(*) AS total FROM users {condition}", params).fetchone()["total"]
    rows = connection.execute(
        f'''SELECT id, name, email, role, is_active AS "isActive"
            FROM users {condition} ORDER BY name, id LIMIT %s OFFSET %s''',
        (*params, page_size, (page - 1) * page_size),
    ).fetchall()
    return rows, total


def has_active_assignments(connection: Connection, user_id: UUID) -> bool:
    return connection.execute(
        "SELECT id FROM incidents WHERE analyst_id = %s AND status IN ('OPEN', 'UNDER_INVESTIGATION') LIMIT 1",
        (user_id,),
    ).fetchone() is not None


def set_active(connection: Connection, user_id: UUID, active: bool) -> None:
    connection.execute("UPDATE users SET is_active = %s WHERE id = %s", (active, user_id))
