from uuid import UUID

from pydantic import BaseModel


class UserReference(BaseModel):
    id: UUID
    name: str
