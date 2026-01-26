from pydantic import BaseModel, Field
from enum import Enum
from typing import Optional


class MaterialType(str, Enum):
    """Malzeme türleri"""
    STEEL = "steel"  # Çelik
    STAINLESS = "stainless"  # Paslanmaz çelik
    ALUMINUM = "aluminum"  # Alüminyum


class CylinderType(str, Enum):
    """Silindir türleri"""
    SINGLE_ACTING = "single_acting"  # Tek etkili
    DOUBLE_ACTING = "double_acting"  # Çift etkili
    TELESCOPIC = "telescopic"  # Teleskopik


class MountingType(str, Enum):
    """Bağlantı türleri"""
    FLANGE = "flange"  # Flanşlı
    CLEVIS = "clevis"  # Mafsallı
    TRUNNION = "trunnion"  # Trunyon
    FOOT = "foot"  # Ayaklı
    TIE_ROD = "tie_rod"  # Bağlantı çubuklu


class CylinderDimensions(BaseModel):
    """Silindir ölçüleri"""

    bore_diameter: float = Field(..., gt=0, description="Silindir iç çapı (mm)")
    rod_diameter: float = Field(..., gt=0, description="Piston mili çapı (mm)")
    stroke_length: float = Field(..., gt=0, description="Strok boyu (mm)")
    wall_thickness: Optional[float] = Field(None, gt=0, description="Gövde et kalınlığı (mm)")
    working_pressure: Optional[float] = Field(160, gt=0, description="Çalışma basıncı (bar)")

    class Config:
        json_schema_extra = {
            "example": {
                "bore_diameter": 80,
                "rod_diameter": 50,
                "stroke_length": 400,
                "wall_thickness": 10,
                "working_pressure": 160
            }
        }


class CostBreakdown(BaseModel):
    """Maliyet dağılımı"""

    tube_cost: float = Field(..., description="Gövde maliyeti (TL)")
    rod_cost: float = Field(..., description="Piston mili maliyeti (TL)")
    piston_cost: float = Field(..., description="Piston maliyeti (TL)")
    seal_cost: float = Field(..., description="Conta/sızdırmazlık maliyeti (TL)")
    end_caps_cost: float = Field(..., description="Kapak maliyeti (TL)")
    chrome_plating_cost: float = Field(..., description="Krom kaplama maliyeti (TL)")
    machining_cost: float = Field(..., description="İşleme maliyeti (TL)")
    assembly_cost: float = Field(..., description="Montaj maliyeti (TL)")
    mounting_cost: float = Field(..., description="Bağlantı elemanı maliyeti (TL)")


class PricingResult(BaseModel):
    """Fiyatlandırma sonucu"""

    dimensions: CylinderDimensions
    material: MaterialType
    cylinder_type: CylinderType
    mounting_type: MountingType

    cost_breakdown: CostBreakdown
    subtotal: float = Field(..., description="Ara toplam (TL)")
    profit_margin: float = Field(default=0.25, description="Kar marjı (%)")
    total_price: float = Field(..., description="Toplam fiyat (TL)")

    notes: Optional[str] = Field(None, description="Ek notlar")


class ImageAnalysisRequest(BaseModel):
    """Görüntü analiz isteği"""

    image_base64: str = Field(..., description="Base64 kodlanmış görüntü")
    file_name: Optional[str] = Field(None, description="Dosya adı")


class ImageAnalysisResult(BaseModel):
    """Görüntü analiz sonucu"""

    success: bool
    dimensions: Optional[CylinderDimensions] = None
    detected_material: Optional[MaterialType] = None
    detected_cylinder_type: Optional[CylinderType] = None
    detected_mounting_type: Optional[MountingType] = None
    confidence: float = Field(default=0.0, ge=0, le=1, description="Güven skoru")
    raw_analysis: Optional[str] = None
    error_message: Optional[str] = None


class ManualPricingRequest(BaseModel):
    """Manuel fiyatlandırma isteği"""

    dimensions: CylinderDimensions
    material: MaterialType = MaterialType.STEEL
    cylinder_type: CylinderType = CylinderType.DOUBLE_ACTING
    mounting_type: MountingType = MountingType.FLANGE
    quantity: int = Field(default=1, ge=1, description="Adet")
    profit_margin: float = Field(default=0.25, ge=0, le=1, description="Kar marjı")
