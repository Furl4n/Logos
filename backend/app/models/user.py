from dataclasses import dataclass, field
from enum import StrEnum
from uuid import UUID


class UserRole(StrEnum):
    DRIVER = "DRIVER"
    ANALYST = "ANALYST"


@dataclass(frozen=True)
class User:
    id: UUID
    name: str
    email: str
    role: UserRole
    password_hash: str = field(repr=False)
