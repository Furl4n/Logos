from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.incident import IncidentCategory, IncidentSeverity, IncidentStatus


class IncidentFilters(BaseModel):
    model_config = ConfigDict(extra="forbid")

    search: str | None = None
    severity: IncidentSeverity | None = None
    category: IncidentCategory | None = None
    status: Literal["ACTIVE", "ALL"] | IncidentStatus = "ACTIVE"
    timeOrder: Literal["newest", "oldest"] = "newest"
    page: int = Field(default=1, ge=1)
    pageSize: int = Field(default=100, ge=1, le=100)

    @field_validator("search")
    @classmethod
    def trim_search(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip() or None


class UserReference(BaseModel):
    id: UUID
    name: str


class IncidentSummary(BaseModel):
    id: UUID
    code: str
    title: str
    category: IncidentCategory
    severity: IncidentSeverity
    status: IncidentStatus
    driver: UserReference
    assignee: UserReference | None
    truckPlate: str
    location: str
    occurredAt: datetime
    reportedAt: datetime
    version: int


class IncidentPage(BaseModel):
    items: list[IncidentSummary]
    page: int
    pageSize: int
    total: int
