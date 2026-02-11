import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .routers import pricing_router, analysis_router, excel_pricing_router, users_router, auth_router

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()
logger.info(f"Starting {settings.app_name}")

app = FastAPI(
    title=settings.app_name,
    description="""
    Hidrolik Silindir Fiyatlandırma API

    Bu API, hidrolik silindir imalat maliyetlerini hesaplamak için tasarlanmıştır.

    ## Özellikler

    * **Teknik Resim Analizi**: GPT-5.2 ile teknik resimlerden otomatik ölçü çıkarma
    * **Manuel Fiyatlandırma**: Ölçüleri manuel girerek maliyet hesaplama
    * **Detaylı Maliyet Dağılımı**: Malzeme, işçilik, kaplama vb. detaylı maliyet çıktısı

    ## Desteklenen Silindir Tipleri

    * Tek Etkili
    * Çift Etkili
    * Teleskopik
    """,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS ayarları
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router'ları ekle
app.include_router(pricing_router)
app.include_router(analysis_router)
app.include_router(excel_pricing_router)
app.include_router(users_router)
app.include_router(auth_router)


@app.get("/")
async def root():
    return {
        "message": "Hidrolik Silindir Fiyatlandırma API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}
