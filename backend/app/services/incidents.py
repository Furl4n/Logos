from uuid import UUID

from psycopg import Connection

from app.core.errors import APIError
from app.models.user import User, UserRole
from app.repositories import incidents as repository
from app.repositories.users import find_by_id
from app.schemas.incidents import (
    AssigneeChange,
    CreateIncidentRequest,
    CreatedChange,
    IncidentDetail,
    IncidentFilters,
    IncidentHistoryEntry,
    IncidentPage,
    IncidentSummary,
    ValueChange,
)
from app.schemas.users import UserReference


def _summary(row: dict) -> IncidentSummary:
    return IncidentSummary(
        id=row["id"], code=row["code"], title=row["title"],
        category=row["category"], severity=row["severity"], status=row["status"],
        driver=UserReference(id=row["driver_id"], name=row["driver_name"]),
        assignee=UserReference(id=row["analyst_id"], name=row["analyst_name"])
        if row["analyst_id"] else None,
        truckPlate=row["truck_plate"], location=row["location"],
        occurredAt=row["occurred_at"], reportedAt=row["reported_at"], version=row["version"],
    )


def _history(events: list[dict]) -> list[IncidentHistoryEntry]:
    entries: dict[int, IncidentHistoryEntry] = {}
    for event in events:
        version = event["incident_version"]
        if version not in entries:
            entries[version] = IncidentHistoryEntry(
                id=event["id"], version=version,
                author=UserReference(id=event["changed_by_user_id"], name=event["author_name"]),
                createdAt=event["created_at"], changes=[], observation=None,
            )
        entry = entries[version]
        kind = event["change_type"]
        if kind == "CREATED":
            entry.changes.append(CreatedChange())
        elif kind == "ASSIGNEE":
            entry.changes.append(AssigneeChange(
                previousAssignee=UserReference(
                    id=event["previous_analyst_id"], name=event["previous_analyst_name"]
                ) if event["previous_analyst_id"] else None,
                newAssignee=UserReference(id=event["new_analyst_id"], name=event["new_analyst_name"]),
            ))
        elif kind != "OBSERVATION":
            entry.changes.append(ValueChange(
                type=kind, previousValue=event["previous_value"], newValue=event["new_value"],
            ))
        if event["observation"] is not None:
            entry.observation = event["observation"]
    return list(entries.values())


def get_incidents(connection: Connection, user: User, filters: IncidentFilters) -> IncidentPage:
    rows, total = repository.list_incidents(connection, user, filters)
    return IncidentPage(
        page=filters.page, pageSize=filters.pageSize, total=total,
        items=[_summary(row) for row in rows],
    )


def get_incident(connection: Connection, user: User, incident_id: UUID) -> IncidentDetail:
    row = repository.find_incident(connection, incident_id, user)
    if row is None:
        raise APIError(404, "NOT_FOUND", "Ocorrência não encontrada.")
    return IncidentDetail(
        **_summary(row).model_dump(),
        description=row["description"], routeCode=row["route_code"],
        createdAt=row["created_at"], updatedAt=row["updated_at"],
        history=_history(row["history_events"]),
    )


def create_incident(connection: Connection, user: User, data: CreateIncidentRequest) -> IncidentDetail:
    if user.role == UserRole.DRIVER:
        if "driverId" in data.model_fields_set:
            raise APIError(422, "VALIDATION_ERROR", "Motoristas não devem informar driverId.")
        driver_id = user.id
    else:
        if data.driverId is None:
            raise APIError(422, "VALIDATION_ERROR", "Selecione um motorista.")
        driver = find_by_id(connection, data.driverId)
        if driver is None or driver.role != UserRole.DRIVER:
            raise APIError(422, "VALIDATION_ERROR", "Selecione um motorista válido.")
        driver_id = driver.id

    # O savepoint também garante atomicidade se o serviço for reutilizado fora da rota.
    with connection.transaction():
        incident_id = repository.insert_incident(connection, data, driver_id)
        repository.insert_creation_event(connection, incident_id, user.id)
        return get_incident(connection, user, incident_id)
