"""Favorites API."""

from fastapi import APIRouter, Depends, Path
from sqlalchemy.exc import IntegrityError

from app.api.deps import get_favorite_repository, get_sto_repository, require_client
from app.repositories.favorite_repository import FavoriteRepository
from app.repositories.sto_repository import STORepository
from app.core.exceptions import NotFoundError, Errors, ConflictError

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.post("/{sto_id}")
async def add_favorite(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(require_client),
    sto_repo: STORepository = Depends(get_sto_repository),
    fav_repo: FavoriteRepository = Depends(get_favorite_repository),
):
    """Add STO to favorites."""
    sto = await sto_repo.get_by_id(sto_id)
    if not sto:
        raise NotFoundError(*Errors.STO_NOT_FOUND)

    try:
        await fav_repo.add(user["id"], sto_id)
    except IntegrityError:
        raise ConflictError("ALREADY_FAVORITE", "СТО уже в избранном")
    return {"success": True, "sto_id": sto_id}


@router.get("")
async def get_favorites(
    user: dict = Depends(require_client),
    fav_repo: FavoriteRepository = Depends(get_favorite_repository),
):
    """Get user's favorite STOs."""
    favs = await fav_repo.get_favorites_with_sto(user["id"])
    return [
        {
            "id": f.id,
            "sto_id": f.sto_id,
            "sto_name": f.sto.name if f.sto else "",
            "sto_image_url": f.sto.image_url if f.sto else None,
            "sto_address": f.sto.address if f.sto else "",
        }
        for f in favs
        if f.sto
    ]


@router.delete("/{sto_id}")
async def remove_favorite(
    sto_id: int = Path(..., gt=0),
    user: dict = Depends(require_client),
    fav_repo: FavoriteRepository = Depends(get_favorite_repository),
):
    """Remove STO from favorites."""
    await fav_repo.remove(user["id"], sto_id)
    return {"success": True, "sto_id": sto_id}
