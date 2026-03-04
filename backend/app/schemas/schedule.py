"""Pydantic schemas for StoSchedule."""

from pydantic import BaseModel, Field


class ScheduleItemCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: str = Field(..., description="HH:MM")
    end_time: str = Field(..., description="HH:MM")
    is_working: bool = True
