from fastapi import APIRouter, HTTPException, UploadFile, File
import base64
from ..models import ImageAnalysisRequest, ImageAnalysisResult, PricingResult
from ..services import ImageAnalyzer, PricingEngine

router = APIRouter(prefix="/api/analysis", tags=["Teknik Resim Analizi"])

# Lazy initialization - will be created on first use
_image_analyzer: ImageAnalyzer | None = None
def get_image_analyzer() -> ImageAnalyzer:
    global _image_analyzer
    if _image_analyzer is None:
        _image_analyzer = ImageAnalyzer()
    return _image_analyzer


@router.post("/analyze", response_model=ImageAnalysisResult)
async def analyze_image(request: ImageAnalysisRequest) -> ImageAnalysisResult:
    """
    Base64 kodlanmış teknik resmi analiz et

    Gelişmiş analiz stratejisi:
    - PDF dosyaları için native PDF + metin çıkarma + görüntü fallback
    - Görüntü dosyaları için doğrudan Vision API
    - Çoklu kaynak doğrulaması
    """
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
    """
    Dosya yükleyerek teknik resmi analiz et

    Desteklenen formatlar:
    - PDF (önerilen - native PDF desteği ile en iyi sonuç)
    - PNG, JPEG, WebP (görüntü dosyaları)

    Analiz Adımları:
    1. Dosya tipi belirleme
    2. PDF için: Metin çıkarma + Native PDF analizi + Vision fallback
    3. Görüntü için: Doğrudan Vision analizi
    4. Sonuçları birleştirme ve doğrulama
    """

    # Dosya tipi kontrolü
    allowed_types = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"]
    if file.content_type and file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Desteklenmeyen dosya tipi: {file.content_type}. "
                   f"Desteklenen tipler: {', '.join(allowed_types)}"
        )

    try:
        # Dosyayı oku
        contents = await file.read()

        # Yeni analyze metodunu kullan (bytes ile çalışır)
        analyzer = get_image_analyzer()
        result = await analyzer.analyze(
            file_bytes=contents,
            file_name=file.filename or "",
            mime_type=file.content_type or ""
        )
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-and-price", response_model=PricingResult)
async def analyze_and_calculate_price(
    file: UploadFile = File(...),
    profit_margin: float = 0.25
) -> PricingResult:
    """
    Teknik resmi analiz et ve direkt fiyat hesapla

    Tek adımda:
    1. Teknik resmi analiz et (PDF veya görüntü)
    2. Tespit edilen ölçülerle fiyat hesapla
    3. Detaylı maliyet dağılımı döndür
    """

    # Dosyayı oku
    contents = await file.read()

    # Analiz et
    try:
        analyzer = get_image_analyzer()
        analysis_result = await analyzer.analyze(
            file_bytes=contents,
            file_name=file.filename or "",
            mime_type=file.content_type or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analiz hatası: {str(e)}")

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
    pricing_engine = PricingEngine()
    pricing_result = pricing_engine.calculate_pricing(
        dimensions=analysis_result.dimensions,
        material=material,
        cylinder_type=cylinder_type,
        mounting_type=mounting_type,
        profit_margin=profit_margin
    )

    return pricing_result


@router.get("/supported-formats")
async def get_supported_formats():
    """Desteklenen dosya formatları ve analiz stratejileri"""
    return {
        "formats": {
            "application/pdf": {
                "extension": ".pdf",
                "description": "PDF dosyası (önerilen)",
                "strategy": [
                    "1. PDF'den metin çıkarma (PyMuPDF/pdfplumber)",
                    "2. Antet bilgilerini parse etme",
                    "3. Regex ile ölçü değerlerini bulma",
                    "4. GPT-5.2 native PDF analizi",
                    "5. PDF'i görüntüye çevirip Vision analizi (fallback)",
                    "6. Sonuçları birleştirme ve doğrulama"
                ]
            },
            "image/png": {
                "extension": ".png",
                "description": "PNG görüntü",
                "strategy": ["GPT-5.2 Vision API ile doğrudan analiz"]
            },
            "image/jpeg": {
                "extension": ".jpg, .jpeg",
                "description": "JPEG görüntü",
                "strategy": ["GPT-5.2 Vision API ile doğrudan analiz"]
            },
            "image/webp": {
                "extension": ".webp",
                "description": "WebP görüntü",
                "strategy": ["GPT-5.2 Vision API ile doğrudan analiz"]
            }
        },
        "recommendation": "En iyi sonuç için PDF formatı önerilir. PDF'ler hem metin hem görsel analiz ile işlenir."
    }
