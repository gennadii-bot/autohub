"""STO owner settings schema."""

from pydantic import BaseModel, Field


class StoSettingsUpdate(BaseModel):
    max_parallel_bookings: int = Field(..., ge=1, le=20)
