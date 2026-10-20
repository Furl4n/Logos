from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Query, Response

from app.core.dependencies import CurrentUser, Database
from app.schemas.incidents import CreateIncidentRequest, IncidentDetail, IncidentFilters, IncidentPage
from app.services.incidents import create_incident, get_incident, get_incidents

router = APIRouter(prefix="/incidents", tags=["Incidentes"])


@router.get("", response_model=IncidentPage)
def incidents(
    user: CurrentUser, connection: Database,
    filters: Annotated[IncidentFilters, Query()],
) -> IncidentPage:
    return get_incidents(connection, user, filters)


@router.post("", response_model=IncidentDetail, status_code=201)
def register_incident(
    data: CreateIncidentRequest, response: Response, user: CurrentUser, connection: Database,
) -> IncidentDetail:
    incident = create_incident(connection, user, data)
    response.headers["Location"] = f"/api/v1/incidents/{incident.id}"
    return incident


@router.get("/{incidentId}", response_model=IncidentDetail)
def incident_details(incidentId: UUID, user: CurrentUser, connection: Database) -> IncidentDetail:
    return get_incident(connection, user, incidentId)
