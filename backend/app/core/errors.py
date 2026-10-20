import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(self, status: int, code: str, detail: str):
        self.status = status
        self.code = code
        self.detail = detail


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, error: APIError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status,
            content={"detail": error.detail, "code": error.code},
            headers={"WWW-Authenticate": "Bearer"} if error.status == 401 else None,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(
        request: Request, error: RequestValidationError
    ) -> JSONResponse:
        if any(item["type"] == "json_invalid" for item in error.errors()):
            return JSONResponse(
                status_code=400,
                content={"detail": "JSON malformado.", "code": "INVALID_JSON"},
            )
        return JSONResponse(
            status_code=422,
            content={
                "detail": "Confira os campos informados.",
                "code": "VALIDATION_ERROR",
                "errors": [
                    {
                        "field": ".".join(str(part) for part in item["loc"][1:]),
                        "message": "Valor inválido ou campo não permitido.",
                    }
                    for item in error.errors()
                ],
            },
        )

    @app.exception_handler(Exception)
    async def internal_handler(request: Request, error: Exception) -> JSONResponse:
        logger.error("Falha interna na API", exc_info=error)
        return JSONResponse(
            status_code=500,
            content={"detail": "Erro interno do servidor.", "code": "INTERNAL_ERROR"},
        )
