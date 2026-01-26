from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Uygulama ayarları"""

    app_name: str = "Hidrolik Silindir Fiyatlandırma API"
    debug: bool = False

    # OpenAI Ayarları
    openai_api_key: str = ""
    openai_model: str = "gpt-5.2"

    # Maliyet Hesaplama Parametreleri (TL/kg veya TL/birim)
    steel_price_per_kg: float = 45.0  # Çelik fiyatı
    chrome_plating_per_cm2: float = 0.8  # Krom kaplama
    seal_kit_base_price: float = 250.0  # Conta takımı baz fiyat
    labor_cost_per_hour: float = 350.0  # İşçilik saatlik

    # Malzeme yoğunlukları (g/cm³)
    steel_density: float = 7.85
    aluminum_density: float = 2.70
    stainless_density: float = 8.00

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
