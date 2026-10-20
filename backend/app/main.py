from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_error_handlers

settings = get_settings()

app = FastAPI(title=settings.app_name, version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=settings.frontend_origins, allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-CSRF-Protection"],
)


@app.middleware("http")
async def protect_session(request: Request, call_next):
    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        origin = request.headers.get("origin")
        invalid_origin = origin is not None and origin not in get_settings().frontend_origins
        needs_header = "logos_session" in request.cookies or request.url.path in {
            "/api/v1/auth/login", "/api/v1/auth/logout",
        }
        if invalid_origin or (needs_header and request.headers.get("x-csrf-protection") != "1"):
            return JSONResponse(status_code=403, content={
                "code": "CSRF_REJECTED", "detail": "Origem ou proteção da requisição inválida.",
            })
    response = await call_next(request)
    if request.url.path.startswith("/api/v1/"):
        response.headers["Cache-Control"] = "no-store"
    return response

register_error_handlers(app)
app.include_router(api_router)
