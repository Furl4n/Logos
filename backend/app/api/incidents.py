from typing import Annotated

from fastapi import APIRouter, Query

from app.core.dependencies import CurrentUser, Database
from app.schemas.incidents import IncidentFilters, IncidentPage
from app.services.incidents import get_incidents

router = APIRouter(prefix="/incidents", tags=["Incidentes"])


@router.get("", response_model=IncidentPage)
def incidents(
    user: CurrentUser, connection: Database,
    filters: Annotated[IncidentFilters, Query()],
) -> IncidentPage:
    return get_incidents(connection, user, filters)
