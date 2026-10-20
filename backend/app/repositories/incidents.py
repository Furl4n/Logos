from uuid import UUID

from psycopg import Connection, sql

from app.models.incident import IncidentEvent, IncidentSeverity, IncidentStatus
from app.models.user import User, UserRole
from app.schemas.incidents import CreateIncidentRequest, IncidentFilters


def insert_incident(connection: Connection, data: CreateIncidentRequest, driver_id: UUID) -> UUID:
    return connection.execute(
        """INSERT INTO incidents (
            title, description, category, severity, driver_id,
            truck_plate, location, occurred_at, route_code
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id""",
        (data.title, data.description, data.category.value, data.severity.value,
         driver_id, data.truckPlate, data.location, data.occurredAt, data.routeCode),
    ).fetchone()["id"]


def insert_creation_event(connection: Connection, incident_id: UUID, author_id: UUID) -> None:
    connection.execute(
        """INSERT INTO incident_history (
            incident_id, change_type, changed_by_user_id, incident_version, created_at
        ) SELECT id, 'CREATED', %s, 1, reported_at FROM incidents WHERE id = %s""",
        (author_id, incident_id),
    )


def find_incident(connection: Connection, incident_id: UUID, user: User) -> dict | None:
    # Incidente e eventos são consultados no mesmo snapshot.
    return connection.execute(
        """SELECT i.*, d.name AS driver_name, a.name AS analyst_name,
            COALESCE((
                SELECT jsonb_agg(to_jsonb(event) ORDER BY event.incident_version DESC, event.id)
                FROM (
                    SELECT h.*, author.name AS author_name,
                           previous.name AS previous_analyst_name,
                           next_analyst.name AS new_analyst_name
                    FROM incident_history h
                    JOIN users author ON author.id = h.changed_by_user_id
                    LEFT JOIN users previous ON previous.id = h.previous_analyst_id
                    LEFT JOIN users next_analyst ON next_analyst.id = h.new_analyst_id
                    WHERE h.incident_id = i.id
                ) event
            ), '[]'::jsonb) AS history_events
        FROM incidents i
        JOIN users d ON d.id = i.driver_id
        LEFT JOIN users a ON a.id = i.analyst_id
        WHERE i.id = %s AND (%s OR i.driver_id = %s)""",
        (incident_id, user.role == UserRole.ANALYST, user.id),
    ).fetchone()


def apply_attendance_update(
    connection: Connection, incident_id: UUID, expected_version: int,
    status: IncidentStatus, severity: IncidentSeverity, analyst_id: UUID,
) -> int | None:
    row = connection.execute(
        """UPDATE incidents
           SET status = %s, severity = %s, analyst_id = %s, version = version + 1
           WHERE id = %s AND version = %s RETURNING version""",
        (status.value, severity.value, analyst_id, incident_id, expected_version),
    ).fetchone()
    return row["version"] if row else None


def insert_attendance_events(
    connection: Connection, incident_id: UUID, version: int,
    author_id: UUID, events: list[IncidentEvent],
) -> None:
    with connection.cursor() as cursor:
        cursor.executemany(
            """INSERT INTO incident_history (
                incident_id, incident_version, changed_by_user_id, change_type,
                previous_value, new_value, previous_analyst_id, new_analyst_id, observation
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)""",
            [(incident_id, version, author_id, event.change_type,
              event.previous_value, event.new_value, event.previous_analyst_id,
              event.new_analyst_id, event.observation) for event in events],
        )


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
