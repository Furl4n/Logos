from dataclasses import dataclass
from enum import StrEnum
from typing import Literal
from uuid import UUID


class IncidentCategory(StrEnum):
    VEHICLE_ACCIDENT = "VEHICLE_ACCIDENT"
    INJURY_ACCIDENT = "INJURY_ACCIDENT"
    UNUSUAL_WEATHER = "UNUSUAL_WEATHER"
    MECHANICAL_ISSUE = "MECHANICAL_ISSUE"
    ROAD_BLOCK = "ROAD_BLOCK"


class IncidentSeverity(StrEnum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentStatus(StrEnum):
    OPEN = "OPEN"
    UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    CLOSED = "CLOSED"
    INCONCLUSIVE = "INCONCLUSIVE"


@dataclass(frozen=True)
class IncidentEvent:
    change_type: Literal["STATUS", "SEVERITY", "ASSIGNEE", "OBSERVATION", "REOPEN"]
    previous_value: str | None = None
    new_value: str | None = None
    previous_analyst_id: UUID | None = None
    new_analyst_id: UUID | None = None
    observation: str | None = None
