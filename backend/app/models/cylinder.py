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
    parameters: Optional["PricingParameters"] = Field(default=None, description="Özel fiyatlandırma parametreleri")


class MaterialPrices(BaseModel):
    """Malzeme fiyatları (TL/kg)"""
    steel: float = 45.0
    stainless: float = 180.0
    aluminum: float = 120.0


class MaterialMultipliers(BaseModel):
    """Malzeme çarpanları (çelik = 1.0 baz)"""
    steel: float = 1.0
    stainless: float = 2.8
    aluminum: float = 1.5


class MaterialDensities(BaseModel):
    """Malzeme yoğunlukları (g/cm³)"""
    steel: float = 7.85
    stainless: float = 8.0
    aluminum: float = 2.7


class LaborRates(BaseModel):
    """İşçilik ücretleri (TL/saat)"""
    machining: float = 850.0
    assembly: float = 650.0


class MountingPrices(BaseModel):
    """Bağlantı elemanı fiyatları (TL)"""
    flange: float = 450.0
    clevis: float = 380.0
    trunnion: float = 520.0
    foot: float = 320.0
    tie_rod: float = 280.0


class SealPrices(BaseModel):
    """Conta fiyatları (çap aralığına göre TL)"""
    small: float = 280.0   # < 50mm
    medium: float = 420.0  # 50-100mm
    large: float = 650.0   # > 100mm


class CylinderTypeMultipliers(BaseModel):
    """Silindir tipi çarpanları"""
    single_acting: float = 0.85
    double_acting: float = 1.0
    telescopic: float = 2.5


class InputLimit(BaseModel):
    """Giriş limiti"""
    min: float
    max: float


class InputLimits(BaseModel):
    """Giriş limitleri"""
    bore_diameter: InputLimit = InputLimit(min=10, max=500)
    rod_diameter: InputLimit = InputLimit(min=8, max=300)
    stroke_length: InputLimit = InputLimit(min=50, max=6000)
    wall_thickness: InputLimit = InputLimit(min=3, max=50)
    working_pressure: InputLimit = InputLimit(min=50, max=500)


class GeometryCoefficients(BaseModel):
    """Geometri formül katsayıları"""
    tube_extra_length: float = 100.0       # Gövde için strok + bu değer (mm)
    rod_extra_length: float = 150.0        # Mil için strok + bu değer (mm)
    chrome_extra_length: float = 50.0      # Krom kaplama için strok + bu değer (mm)
    piston_seal_clearance: float = 2.0     # Piston conta payı (mm)
    piston_thickness_ratio: float = 0.5    # Piston kalınlığı = çap × bu oran
    end_cap_thickness_ratio: float = 1.5   # Kapak kalınlığı = et kalınlığı × bu oran


class MachiningCoefficients(BaseModel):
    """İşleme süresi formül katsayıları"""
    base_hours: float = 2.0                # Temel işleme süresi (saat)
    bore_diameter_divisor: float = 50.0    # Çap / bu değer
    stroke_length_divisor: float = 300.0   # Strok / bu değer
    rod_diameter_divisor: float = 30.0     # Mil çapı / bu değer


class SealCoefficients(BaseModel):
    """Conta maliyet formül katsayıları"""
    base_diameter: float = 40.0            # Baz çap (mm)
    diameter_divisor: float = 100.0        # Çap farkı / bu değer
    double_acting_multiplier: float = 1.3  # Çift etkili için çarpan


class WallThicknessCoefficients(BaseModel):
    """Et kalınlığı hesap katsayıları"""
    stress_limit: float = 250.0            # İzin verilen gerilme (MPa)
    safety_margin: float = 3.0             # Güvenlik payı (mm)
    minimum_thickness: float = 6.0         # Minimum et kalınlığı (mm)


class PricingParameters(BaseModel):
    """Tüm fiyatlandırma parametreleri"""

    material_prices: MaterialPrices = MaterialPrices()
    material_multipliers: MaterialMultipliers = MaterialMultipliers()
    material_densities: MaterialDensities = MaterialDensities()
    chrome_plating_price: float = Field(default=0.35, description="Krom kaplama fiyatı (TL/cm²)")
    labor_rates: LaborRates = LaborRates()
    mounting_prices: MountingPrices = MountingPrices()
    seal_prices: SealPrices = SealPrices()
    cylinder_type_multipliers: CylinderTypeMultipliers = CylinderTypeMultipliers()
    input_limits: InputLimits = InputLimits()
    geometry_coefficients: GeometryCoefficients = GeometryCoefficients()
    machining_coefficients: MachiningCoefficients = MachiningCoefficients()
    seal_coefficients: SealCoefficients = SealCoefficients()
    wall_thickness_coefficients: WallThicknessCoefficients = WallThicknessCoefficients()
    assembly_hours: float = Field(default=1.5, description="Montaj süresi (saat)")
