from fastapi import APIRouter, HTTPException, UploadFile, File
import base64
from ..models import ImageAnalysisRequest, ImageAnalysisResult, ManualPricingRequest, PricingResult
from ..services import ImageAnalyzer, PricingEngine

router = APIRouter(prefix="/api/analysis", tags=["Teknik Resim Analizi"])

# Lazy initialization - will be created on first use
_image_analyzer: ImageAnalyzer | None = None
_pricing_engine: PricingEngine | None = None


def get_image_analyzer() -> ImageAnalyzer:
    global _image_analyzer
    if _image_analyzer is None:
        _image_analyzer = ImageAnalyzer()
    return _image_analyzer


def get_pricing_engine() -> PricingEngine:
    global _pricing_engine
    if _pricing_engine is None:
        _pricing_engine = PricingEngine()
    return _pricing_engine


@router.post("/analyze", response_model=ImageAnalysisResult)
async def analyze_image(request: ImageAnalysisRequest) -> ImageAnalysisResult:
    """Base64 kodlanmış teknik resmi analiz et"""
    try:
        result = await get_image_analyzer().analyze_technical_drawing(
            image_base64=request.image_base64,
            file_name=request.file_name
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload", response_model=ImageAnalysisResult)
async def upload_and_analyze(file: UploadFile = File(...)) -> ImageAnalysisResult:
    """Dosya yükleyerek teknik resmi analiz et"""

    # Dosya tipi kontrolü
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya tipi: {file.content_type}. "
                   f"Desteklenen tipler: {', '.join(allowed_types)}"
        )

    try:
        # Dosyayı oku ve base64'e çevir
        contents = await file.read()
        image_base64 = base64.b64encode(contents).decode("utf-8")

        # Analiz et
        result = await get_image_analyzer().analyze_technical_drawing(
            image_base64=image_base64,
            file_name=file.filename
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-and-price", response_model=PricingResult)
async def analyze_and_calculate_price(
    file: UploadFile = File(...),
    profit_margin: float = 0.25
) -> PricingResult:
    """Teknik resmi analiz et ve direkt fiyat hesapla"""

    # Önce analiz et
    analysis_result = await upload_and_analyze(file)

    if not analysis_result.success or not analysis_result.dimensions:
        raise HTTPException(
            status_code=400,
            detail=analysis_result.error_message or "Teknik resim analizi başarısız"
        )

    # Varsayılan değerler
    from ..models import MaterialType, CylinderType, MountingType

    material = analysis_result.detected_material or MaterialType.STEEL
    cylinder_type = analysis_result.detected_cylinder_type or CylinderType.DOUBLE_ACTING
    mounting_type = analysis_result.detected_mounting_type or MountingType.FLANGE

    # Fiyat hesapla
    pricing_result = get_pricing_engine().calculate_pricing(
        dimensions=analysis_result.dimensions,
        material=material,
        cylinder_type=cylinder_type,
        mounting_type=mounting_type,
        profit_margin=profit_margin
    )

    return pricing_result
