from fastapi import APIRouter, Response

from app.core.dependencies import CurrentUser, Database
from app.schemas.auth import LoginRequest, LoginResponse, UserResponse
from app.services.auth import login
from app.core.config import get_settings
from app.core.security import create_access_token, TOKEN_TTL_SECONDS

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/login", response_model=LoginResponse)
def login_user(data: LoginRequest, connection: Database, response: Response) -> LoginResponse:
    result = login(connection, data)
    response.set_cookie(
        "logos_session", create_access_token(result.user.id),
        httponly=True, secure=get_settings().cookie_secure, samesite="lax",
        path="/api/v1", max_age=TOKEN_TTL_SECONDS,
    )
    response.headers["Cache-Control"] = "no-store"
    return result


@router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie("logos_session", path="/api/v1", httponly=True,
                           secure=get_settings().cookie_secure, samesite="lax")
    response.headers["Cache-Control"] = "no-store"


@router.get("/me", response_model=UserResponse)
def current_user(user: CurrentUser, response: Response) -> UserResponse:
    response.headers["Cache-Control"] = "no-store"
    return UserResponse.model_validate(user)
