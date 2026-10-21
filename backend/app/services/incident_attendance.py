from uuid import UUID

from psycopg import Connection

from app.core.errors import APIError
from app.models.incident import IncidentEvent, IncidentSeverity, IncidentStatus
from app.models.user import User
from app.repositories import incidents as repository
from app.repositories.users import find_by_id
from app.schemas.incidents import (
    AssignIncidentRequest,
    IncidentDetail,
    ReopenIncidentRequest,
    UpdateIncidentRequest,
)
from app.services.incidents import get_incident

CLOSED_STATUSES = {IncidentStatus.CLOSED, IncidentStatus.INCONCLUSIVE}


def _conflict(current: IncidentDetail) -> APIError:
    return APIError(
        409, "VERSION_CONFLICT", "A ocorrência foi alterada. Recarregue antes de tentar novamente.",
        extra={"currentIncident": current},
    )


def _current(
    connection: Connection, user: User, incident_id: UUID, version: int,
) -> IncidentDetail:
    current = get_incident(connection, user, incident_id)
    if current.version != version:
        raise _conflict(current)
    if not user.can_attend:
        raise APIError(403, "FORBIDDEN", "Somente analistas e administradores podem alterar o atendimento.")
    return current


def _require_owner(current: IncidentDetail, user: User) -> None:
    if current.assignee is None or current.assignee.id != user.id:
        raise APIError(403, "FORBIDDEN", "Somente o responsável pode alterar o atendimento.")


def _require_active(current: IncidentDetail) -> None:
    if current.status in CLOSED_STATUSES:
        raise APIError(422, "INVALID_STATE", "Reabra a ocorrência antes de alterar o atendimento.")


def _save(
    connection: Connection, user: User, current: IncidentDetail,
    status: IncidentStatus, analyst_id: UUID, events: list[IncidentEvent],
    severity: IncidentSeverity | None = None,
) -> IncidentDetail:
    with connection.transaction():
        version = repository.apply_attendance_update(
            connection, current.id, current.version, status,
            severity if severity is not None else current.severity, analyst_id,
        )
        if version is None:
            raise _conflict(get_incident(connection, user, current.id))
        repository.insert_attendance_events(connection, current.id, version, user.id, events)
        return get_incident(connection, user, current.id)


def update_incident(
    connection: Connection, user: User, incident_id: UUID, data: UpdateIncidentRequest,
) -> IncidentDetail:
    current = _current(connection, user, incident_id, data.version)
    _require_owner(current, user)
    _require_active(current)
    if data.status in CLOSED_STATUSES and data.observation is None:
        raise APIError(422, "VALIDATION_ERROR", "Informe uma observação para encerrar a ocorrência.")

    events = []
    if data.status != current.status:
        events.append(IncidentEvent("STATUS", previous_value=current.status.value,
                                    new_value=data.status.value))
    if data.severity != current.severity:
        events.append(IncidentEvent("SEVERITY", previous_value=current.severity.value,
                                    new_value=data.severity.value))
    if data.observation is not None:
        events.append(IncidentEvent("OBSERVATION", observation=data.observation))
    if not events:
        return current
    return _save(connection, user, current, data.status, user.id, events, data.severity)


def assign_incident(
    connection: Connection, user: User, incident_id: UUID, data: AssignIncidentRequest,
) -> IncidentDetail:
    current = _current(connection, user, incident_id, data.version)
    if current.assignee is not None:
        _require_owner(current, user)
    _require_active(current)
    target = find_by_id(connection, data.analystId, lock=True)
    if target is None or not target.can_attend or not target.is_active:
        raise APIError(422, "VALIDATION_ERROR", "Selecione um analista válido.")
    if current.assignee is None and target.id != user.id:
        raise APIError(403, "FORBIDDEN", "Assuma a ocorrência para si antes de transferir.")
    if current.assignee is not None and target.id == user.id:
        raise APIError(422, "INVALID_STATE", "A ocorrência já está atribuída a você.")

    status = current.status if current.assignee else IncidentStatus.UNDER_INVESTIGATION
    events = [IncidentEvent(
        "ASSIGNEE", previous_analyst_id=current.assignee.id if current.assignee else None,
        new_analyst_id=target.id,
    )]
    if status != current.status:
        events.append(IncidentEvent("STATUS", previous_value=current.status.value,
                                    new_value=status.value))
    return _save(connection, user, current, status, target.id, events)


def reopen_incident(
    connection: Connection, user: User, incident_id: UUID, data: ReopenIncidentRequest,
) -> IncidentDetail:
    current = _current(connection, user, incident_id, data.version)
    if current.status not in CLOSED_STATUSES:
        raise APIError(422, "INVALID_STATE", "Somente ocorrências encerradas podem ser reabertas.")
    events = [IncidentEvent("REOPEN", previous_value=current.status.value,
                            new_value=IncidentStatus.OPEN.value, observation=data.reason)]
    if current.assignee is None or current.assignee.id != user.id:
        events.append(IncidentEvent(
            "ASSIGNEE", previous_analyst_id=current.assignee.id if current.assignee else None,
            new_analyst_id=user.id,
        ))
    return _save(connection, user, current, IncidentStatus.OPEN, user.id, events)
