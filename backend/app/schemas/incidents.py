from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field, field_validator

from app.models.incident import IncidentCategory, IncidentSeverity, IncidentStatus
from app.schemas.users import UserReference


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


class CreateIncidentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=160)
    description: str = Field(min_length=1)
    category: IncidentCategory
    severity: IncidentSeverity
    truckPlate: str = Field(min_length=1, max_length=10)
    location: str = Field(min_length=1)
    occurredAt: AwareDatetime
    routeCode: str | None = Field(default=None, max_length=50)
    driverId: UUID | None = None

    @field_validator("title", "description", "location", mode="before")
    @classmethod
    def trim_text(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value

    @field_validator("truckPlate", mode="before")
    @classmethod
    def normalize_plate(cls, value: object) -> object:
        return value.strip().upper() if isinstance(value, str) else value

    @field_validator("routeCode", mode="before")
    @classmethod
    def normalize_route(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value

    @field_validator("occurredAt", mode="before")
    @classmethod
    def require_datetime(cls, value: object) -> object:
        if not isinstance(value, (str, datetime)):
            raise ValueError("Informe uma data ISO 8601 com fuso horário.")
        return value

    @field_validator("occurredAt")
    @classmethod
    def past_datetime(cls, value: datetime) -> datetime:
        if value > datetime.now(timezone.utc):
            raise ValueError("A data da ocorrência não pode estar no futuro.")
        return value.astimezone(timezone.utc)


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


class CreatedChange(BaseModel):
    type: Literal["CREATED"] = "CREATED"


class ValueChange(BaseModel):
    type: Literal["STATUS", "SEVERITY", "REOPEN"]
    previousValue: str
    newValue: str


class AssigneeChange(BaseModel):
    type: Literal["ASSIGNEE"] = "ASSIGNEE"
    previousAssignee: UserReference | None
    newAssignee: UserReference


HistoryChange = Annotated[CreatedChange | ValueChange | AssigneeChange, Field(discriminator="type")]


class IncidentHistoryEntry(BaseModel):
    id: UUID
    version: int
    author: UserReference
    createdAt: datetime
    changes: list[HistoryChange]
    observation: str | None


class IncidentDetail(IncidentSummary):
    description: str
    routeCode: str | None
    createdAt: datetime
    updatedAt: datetime
    history: list[IncidentHistoryEntry]


class VersionedRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1, strict=True)


class UpdateIncidentRequest(VersionedRequest):
    status: IncidentStatus
    severity: IncidentSeverity
    observation: str | None = None

    @field_validator("observation", mode="before")
    @classmethod
    def normalize_observation(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip() or None
        return value


class AssignIncidentRequest(VersionedRequest):
    analystId: UUID


class ReopenIncidentRequest(VersionedRequest):
    reason: str = Field(min_length=1)

    @field_validator("reason", mode="before")
    @classmethod
    def trim_reason(cls, value: object) -> object:
        return value.strip() if isinstance(value, str) else value
