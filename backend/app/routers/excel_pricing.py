"""
Excel Tabanlı Fiyatlandırma API Endpoint'leri
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Dict, Any
import logging

from ..services.excel_pricing import get_excel_pricing_service

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/excel-pricing", tags=["Excel Pricing"])


class PriceCalculationRequest(BaseModel):
    """Fiyat hesaplama isteği"""
    selections: Dict[str, str]
    stroke_mm: float = 0  # Strok uzunluğu (mm) - metre bazlı hesaplamalar için


@router.post("/upload")
async def upload_excel(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Excel fiyat tablosunu yükle

    Desteklenen formatlar:
    1. Dikey: Kategori | Seçenek | Fiyat
    2. Yatay: Her sütun çifti bir kategori (Değer, Fiyat)
    3. Basit: Her sütun bir kategori
    """
    # Dosya tipi kontrolü
    if not file.filename:
        raise HTTPException(status_code=400, detail="Dosya adı gerekli")

    allowed_extensions = ['.xlsx', '.xls']
    if not any(file.filename.lower().endswith(ext) for ext in allowed_extensions):
        raise HTTPException(
            status_code=400,
            detail="Sadece Excel dosyaları (.xlsx, .xls) desteklenir"
        )

    try:
        contents = await file.read()
        logger.info(f"Excel file uploaded: {file.filename}, size: {len(contents)} bytes")

        service = get_excel_pricing_service()
        result = service.parse_excel(contents, file.filename)

        return {
            "success": True,
            "message": "Excel dosyası başarıyla yüklendi",
            **result
        }

    except ValueError as e:
        logger.error(f"Excel parse error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Excel upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Dosya işlenirken hata oluştu: {str(e)}")


@router.get("/options")
async def get_dropdown_options() -> Dict[str, Any]:
    """
    Dropdown seçeneklerini getir

    Returns:
        {
            "success": True,
            "columns": [
                {
                    "name": "silindir_capi",
                    "display_name": "Silindir Çapı",
                    "options": [
                        {"value": "Ø50", "label": "Ø50", "price": 100},
                        {"value": "Ø63", "label": "Ø63", "price": 120}
                    ]
                },
                ...
            ]
        }
    """
    service = get_excel_pricing_service()
    result = service.get_dropdown_options()

    if not result.get("success"):
        raise HTTPException(
            status_code=404,
            detail=result.get("error", "Fiyat tablosu bulunamadı")
        )

    return result


@router.post("/calculate")
async def calculate_price(request: PriceCalculationRequest) -> Dict[str, Any]:
    """
    Seçimlere göre fiyat hesapla

    Request body:
        {
            "selections": {
                "silindir_capi": "Ø50",
                "mil_capi": "Ø25",
                ...
            }
        }

    Returns:
        {
            "success": True,
            "items": [
                {"name": "Silindir Çapı", "value": "Ø50", "price": 100},
                {"name": "Mil Çapı", "value": "Ø25", "price": 50}
            ],
            "total": 150
        }
    """
    service = get_excel_pricing_service()
    result = service.calculate_price(request.selections, request.stroke_mm)

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Fiyat hesaplanamadı")
        )

    return result


@router.delete("/clear")
async def clear_pricing_data() -> Dict[str, Any]:
    """Yüklü fiyat tablosunu temizle"""
    service = get_excel_pricing_service()
    service.clear_data()

    return {
        "success": True,
        "message": "Fiyat tablosu temizlendi"
    }


class UpdateColumnsRequest(BaseModel):
    """Sütun güncelleme isteği"""
    columns: list


@router.post("/update")
async def update_pricing_data(request: UpdateColumnsRequest) -> Dict[str, Any]:
    """Fiyat tablosunu güncelle (frontend'den düzenleme sonrası)"""
    service = get_excel_pricing_service()

    try:
        service.update_columns(request.columns)
        return {
            "success": True,
            "message": "Fiyat tablosu güncellendi"
        }
    except Exception as e:
        logger.error(f"Update error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Fiyat tablosu durumunu kontrol et"""
    service = get_excel_pricing_service()
    result = service.get_dropdown_options()

    if result.get("success"):
        return {
            "loaded": True,
            "column_count": len(result.get("columns", [])),
            "columns": [col["display_name"] for col in result.get("columns", [])],
            "metadata": result.get("metadata", {})
        }
    else:
        return {
            "loaded": False,
            "message": "Fiyat tablosu yüklenmemiş"
        }


class SettingsUpdateRequest(BaseModel):
    """Ayar güncelleme isteği"""
    boru_offset_mm: int = None
    mil_offset_mm: int = None


@router.get("/settings")
async def get_settings() -> Dict[str, Any]:
    """Formül ayarlarını getir"""
    service = get_excel_pricing_service()
    return {
        "success": True,
        **service.get_settings()
    }


@router.put("/settings")
async def update_settings(request: SettingsUpdateRequest) -> Dict[str, Any]:
    """Formül ayarlarını güncelle"""
    service = get_excel_pricing_service()
    updated = service.update_settings(
        boru_offset_mm=request.boru_offset_mm,
        mil_offset_mm=request.mil_offset_mm
    )
    return {
        "success": True,
        "message": "Ayarlar güncellendi",
        **updated
    }
