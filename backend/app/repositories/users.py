from uuid import UUID

from psycopg import Connection, sql

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
    conditions = []
    params = []
    if search.strip():
        conditions.append(sql.SQL("(name ILIKE %s OR email ILIKE %s)"))
        params.extend([pattern, pattern])
    if status != "ALL":
        conditions.append(sql.SQL("is_active = %s"))
        params.append(status == "ACTIVE")
    where = sql.SQL(" AND ").join(conditions) if conditions else sql.SQL("TRUE")
    # Total e página compartilham um snapshot; não busca ILIKE '%%' sem termo.
    rows = connection.execute(
        sql.SQL('''WITH filtered AS NOT MATERIALIZED (
            SELECT id, name, email, role, is_active AS "isActive" FROM users WHERE {}
        ), page AS (
            SELECT * FROM filtered ORDER BY name, id LIMIT %s OFFSET %s
        )
        SELECT total.count AS total, page.*
        FROM (SELECT count(*) AS count FROM filtered) total
        LEFT JOIN page ON TRUE ORDER BY page.name, page.id''').format(where),
        (*params, page_size, min((page - 1) * page_size, 2**63 - 1)),
    ).fetchall()
    return [{key: value for key, value in row.items() if key != "total"}
            for row in rows if row["id"] is not None], rows[0]["total"]


def has_active_assignments(connection: Connection, user_id: UUID) -> bool:
    return connection.execute(
        "SELECT id FROM incidents WHERE analyst_id = %s AND status IN ('OPEN', 'UNDER_INVESTIGATION') LIMIT 1",
        (user_id,),
    ).fetchone() is not None


def set_active(connection: Connection, user_id: UUID, active: bool) -> None:
    connection.execute("UPDATE users SET is_active = %s WHERE id = %s", (active, user_id))
