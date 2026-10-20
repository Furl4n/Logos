from psycopg import Connection

from app.models.user import User
from app.repositories.incidents import list_incidents
from app.schemas.incidents import IncidentFilters, IncidentPage, IncidentSummary, UserReference


def get_incidents(connection: Connection, user: User, filters: IncidentFilters) -> IncidentPage:
    rows, total = list_incidents(connection, user, filters)
    return IncidentPage(
        page=filters.page, pageSize=filters.pageSize, total=total,
        items=[IncidentSummary(
            id=row["id"], code=row["code"], title=row["title"],
            category=row["category"], severity=row["severity"], status=row["status"],
            driver=UserReference(id=row["driver_id"], name=row["driver_name"]),
            assignee=UserReference(id=row["analyst_id"], name=row["analyst_name"])
            if row["analyst_id"] else None,
            truckPlate=row["truck_plate"], location=row["location"],
            occurredAt=row["occurred_at"], reportedAt=row["reported_at"], version=row["version"],
        ) for row in rows],
    )
