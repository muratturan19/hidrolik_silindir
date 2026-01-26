from fastapi import APIRouter, HTTPException
from ..models import (
    ManualPricingRequest,
    PricingResult,
    MaterialType,
    CylinderType,
    MountingType
)
from ..services import PricingEngine

router = APIRouter(prefix="/api/pricing", tags=["Fiyatlandırma"])

pricing_engine = PricingEngine()


@router.post("/calculate", response_model=PricingResult)
async def calculate_pricing(request: ManualPricingRequest) -> PricingResult:
    """Manuel girilen ölçülere göre fiyat hesapla"""
    try:
        result = pricing_engine.calculate_pricing(
            dimensions=request.dimensions,
            material=request.material,
            cylinder_type=request.cylinder_type,
            mounting_type=request.mounting_type,
            profit_margin=request.profit_margin
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/materials")
async def get_materials():
    """Kullanılabilir malzeme listesi"""
    return [
        {"value": m.value, "label": get_material_label(m)}
        for m in MaterialType
    ]


@router.get("/cylinder-types")
async def get_cylinder_types():
    """Kullanılabilir silindir tipleri"""
    return [
        {"value": t.value, "label": get_cylinder_type_label(t)}
        for t in CylinderType
    ]


@router.get("/mounting-types")
async def get_mounting_types():
    """Kullanılabilir bağlantı tipleri"""
    return [
        {"value": m.value, "label": get_mounting_type_label(m)}
        for m in MountingType
    ]


def get_material_label(material: MaterialType) -> str:
    labels = {
        MaterialType.STEEL: "Çelik (St52)",
        MaterialType.STAINLESS: "Paslanmaz Çelik (AISI 304/316)",
        MaterialType.ALUMINUM: "Alüminyum"
    }
    return labels.get(material, material.value)


def get_cylinder_type_label(cylinder_type: CylinderType) -> str:
    labels = {
        CylinderType.SINGLE_ACTING: "Tek Etkili",
        CylinderType.DOUBLE_ACTING: "Çift Etkili",
        CylinderType.TELESCOPIC: "Teleskopik"
    }
    return labels.get(cylinder_type, cylinder_type.value)


def get_mounting_type_label(mounting_type: MountingType) -> str:
    labels = {
        MountingType.FLANGE: "Flanşlı",
        MountingType.CLEVIS: "Mafsallı (Clevis)",
        MountingType.TRUNNION: "Trunyon",
        MountingType.FOOT: "Ayaklı",
        MountingType.TIE_ROD: "Bağlantı Çubuklu"
    }
    return labels.get(mounting_type, mounting_type.value)
