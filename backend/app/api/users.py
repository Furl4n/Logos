from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import Database, require_analyst
from app.models.user import User
from app.schemas.users import UserReference
from app.services.users import get_drivers

router = APIRouter(prefix="/users", tags=["Usuários"])


@router.get("/drivers", response_model=list[UserReference])
def drivers(
    user: Annotated[User, Depends(require_analyst)], connection: Database,
) -> list[UserReference]:
    return get_drivers(connection)
