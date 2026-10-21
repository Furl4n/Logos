from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import Database, require_analyst, require_admin
from app.models.user import User
from app.schemas.users import CreateUserRequest, ManagedUser, UserPage, UserReference, UserStatusRequest
from app.services.users import get_analysts, get_drivers
from app.services.user_administration import change_user_status, list_users, register_user

router = APIRouter(prefix="/users", tags=["Usuários"])
Admin = Annotated[User, Depends(require_admin)]


@router.get("", response_model=UserPage)
def managed_users(
    user: Admin, connection: Database, search: str = Query(default="", max_length=255),
    page: int = Query(default=1, ge=1), pageSize: int = Query(default=20, ge=1, le=100),
) -> UserPage:
    return list_users(connection, search, page, pageSize)


@router.post("", response_model=ManagedUser, status_code=201)
def add_user(data: CreateUserRequest, user: Admin, connection: Database) -> ManagedUser:
    return register_user(connection, data)


@router.patch("/{userId}/status", response_model=ManagedUser)
def set_user_status(userId: UUID, data: UserStatusRequest, user: Admin, connection: Database) -> ManagedUser:
    return change_user_status(connection, userId, data.isActive)


@router.get("/drivers", response_model=list[UserReference])
def drivers(
    user: Annotated[User, Depends(require_analyst)], connection: Database,
) -> list[UserReference]:
    return get_drivers(connection)


@router.get("/analysts", response_model=list[UserReference])
def analysts(
    user: Annotated[User, Depends(require_analyst)], connection: Database,
) -> list[UserReference]:
    return get_analysts(connection)
