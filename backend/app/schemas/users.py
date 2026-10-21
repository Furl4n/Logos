from uuid import UUID

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

from app.schemas.auth import NormalizedEmail, UserResponse


class UserReference(BaseModel):
    id: UUID
    name: str


class ManagedUser(UserResponse):
    isActive: bool


class UserPage(BaseModel):
    items: list[ManagedUser]
    total: int
    page: int
    pageSize: int


class CreateUserRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str = Field(min_length=1, max_length=150)
    email: NormalizedEmail
    password: SecretStr = Field(min_length=8, max_length=128)
    role: Literal["DRIVER", "ANALYST"]

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value


class UserStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    isActive: bool = Field(strict=True)
