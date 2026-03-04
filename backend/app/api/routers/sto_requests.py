"""STO partner application API."""

import logging

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.api.deps import get_sto_request_service
from app.services.sto_request_service import STORequestService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sto-requests", tags=["sto-requests"])


@router.post("", status_code=201)
async def create_sto_request(
    first_name: str = Form(..., min_length=1, max_length=100),
    last_name: str = Form(..., min_length=1, max_length=100),
    middle_name: str | None = Form(None, max_length=100),
    iin: str = Form(..., min_length=12, max_length=12, description="12 цифр ИИН"),
    phone: str = Form(..., min_length=1, max_length=20),
    email: str = Form(..., max_length=255),
    ip_name: str | None = Form(None, max_length=255),
    bin: str | None = Form(None, max_length=12),
    sto_name: str = Form(..., min_length=1, max_length=255),
    sto_description: str | None = Form(None, max_length=2000),
    region_id: int = Form(...),
    city_id: int = Form(...),
    address: str = Form(..., min_length=1, max_length=512),
    photo: UploadFile | None = File(None),
    service: STORequestService = Depends(get_sto_request_service),
):
    """Submit STO partner application. Multipart form with optional photo."""
    return await service.create(
        first_name=first_name,
        last_name=last_name,
        middle_name=middle_name,
        iin=iin,
        phone=phone,
        email=email,
        ip_name=ip_name,
        bin_val=bin,
        sto_name=sto_name,
        sto_description=sto_description,
        region_id=region_id,
        city_id=city_id,
        address=address,
        photo=photo,
    )
