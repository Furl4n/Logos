from psycopg import Connection, sql

from app.models.user import User, UserRole
from app.schemas.incidents import IncidentFilters


def list_incidents(
    connection: Connection, user: User, filters: IncidentFilters
) -> tuple[list[dict], int]:
    conditions = []
    parameters = []
    if user.role == UserRole.DRIVER:
        conditions.append(sql.SQL("i.driver_id = %s"))
        parameters.append(user.id)
    if filters.severity is not None:
        conditions.append(sql.SQL("i.severity = %s"))
        parameters.append(filters.severity.value)
    if filters.category is not None:
        conditions.append(sql.SQL("i.category = %s"))
        parameters.append(filters.category.value)
    if filters.status == "ACTIVE":
        conditions.append(sql.SQL("i.status IN ('OPEN', 'UNDER_INVESTIGATION')"))
    elif filters.status != "ALL":
        conditions.append(sql.SQL("i.status = %s"))
        parameters.append(filters.status.value)
    if filters.search:
        # Os curingas digitados são texto literal, não ampliam a busca.
        term = filters.search.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        pattern = f"%{term}%"
        conditions.append(sql.SQL("""(
            i.title ILIKE %s OR i.code ILIKE %s OR d.name ILIKE %s
            OR i.truck_plate ILIKE %s OR i.location ILIKE %s
        )"""))
        parameters.extend([pattern] * 5)

    where = sql.SQL(" AND ").join(conditions) if conditions else sql.SQL("TRUE")
    direction = sql.SQL("DESC" if filters.timeOrder == "newest" else "ASC")
    ordering = sql.SQL("""
        CASE severity WHEN 'HIGH' THEN 0 WHEN 'MEDIUM' THEN 1 ELSE 2 END,
        occurred_at {}, id ASC
    """).format(direction)
    # Total e página são lidos na mesma instrução/snapshot, inclusive página vazia.
    query = sql.SQL("""
        WITH filtered AS (
            SELECT i.id, i.code, i.title, i.category, i.severity, i.status,
                   i.driver_id, d.name AS driver_name,
                   i.analyst_id, a.name AS analyst_name,
                   i.truck_plate, i.location, i.occurred_at, i.reported_at, i.version
            FROM incidents i
            JOIN users d ON d.id = i.driver_id
            LEFT JOIN users a ON a.id = i.analyst_id
            WHERE {}
        ), page AS (
            SELECT * FROM filtered ORDER BY {} LIMIT %s OFFSET %s
        )
        SELECT total.count AS total, page.*
        FROM (SELECT COUNT(*) AS count FROM filtered) total
        LEFT JOIN page ON TRUE
        ORDER BY {}
    """).format(where, ordering, ordering)
    # Páginas muito além do fim continuam vazias sem exceder BIGINT no PostgreSQL.
    offset = min((filters.page - 1) * filters.pageSize, 2**63 - 1)
    parameters.extend([filters.pageSize, offset])
    rows = connection.execute(query, parameters).fetchall()
    return [row for row in rows if row["id"] is not None], rows[0]["total"]
