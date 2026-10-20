from fastapi import APIRouter

from app.core.dependencies import CurrentUser, Database
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.services.auth import login

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=LoginResponse)
def login_user(data: LoginRequest, connection: Database) -> LoginResponse:
    return login(connection, data)


@router.get("/me", response_model=UserResponse)
def current_user(user: CurrentUser) -> UserResponse:
    return UserResponse.model_validate(user)
