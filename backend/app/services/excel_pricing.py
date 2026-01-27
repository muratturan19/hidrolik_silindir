"""
Excel Tabanlı Fiyatlandırma Servisi

Hidrolik silindir bileşenleri için Excel'den fiyat okuma ve hesaplama.
Metre bazlı ve sabit fiyatlı bileşenleri destekler.
"""

import json
import logging
import re
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field
import pandas as pd

logger = logging.getLogger(__name__)

# Veri dosyası yolu
DATA_DIR = Path(__file__).parent.parent / "data"
PRICING_DATA_FILE = DATA_DIR / "pricing_table.json"
SETTINGS_FILE = DATA_DIR / "pricing_settings.json"

# Varsayılan formül ayarları
DEFAULT_SETTINGS = {
    "boru_offset_mm": 120,
    "mil_offset_mm": 150,
    "formulas": {
        "boru": "Boru Fiyatı = (Strok + {offset}mm) × Metre Fiyatı / 1000",
        "mil": "Mil Fiyatı = (Strok + {offset}mm) × Metre Fiyatı / 1000"
    }
}

# Metre bazlı hesaplanan bileşenler ve formülleri
METER_BASED_KEYWORDS = ['boru', 'mil', 'kromlu']


@dataclass
class PricingColumn:
    """Bir fiyatlandırma sütunu/kategorisi"""
    name: str
    display_name: str
    options: list[dict] = field(default_factory=list)
    is_meter_based: bool = False
    formula_add_mm: int = 0


@dataclass
class PricingTable:
    """Tam fiyatlandırma tablosu"""
    columns: list[PricingColumn] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)


class ExcelPricingService:
    """Excel tabanlı fiyatlandırma servisi"""

    def __init__(self):
        self._ensure_data_dir()
        self._pricing_table: Optional[PricingTable] = None
        self._settings: dict = DEFAULT_SETTINGS.copy()
        self._load_settings()
        self._load_saved_data()

    def _load_settings(self):
        """Ayarları dosyadan yükle"""
        if SETTINGS_FILE.exists():
            try:
                with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                    saved = json.load(f)
                    self._settings.update(saved)
                    logger.info(f"Settings loaded: boru={self._settings['boru_offset_mm']}mm, mil={self._settings['mil_offset_mm']}mm")
            except Exception as e:
                logger.error(f"Failed to load settings: {e}")

    def _save_settings(self):
        """Ayarları dosyaya kaydet"""
        try:
            with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(self._settings, f, ensure_ascii=False, indent=2)
            logger.info("Settings saved")
        except Exception as e:
            logger.error(f"Failed to save settings: {e}")

    def get_settings(self) -> dict:
        """Mevcut ayarları döndür"""
        return {
            "boru_offset_mm": self._settings.get("boru_offset_mm", 120),
            "mil_offset_mm": self._settings.get("mil_offset_mm", 150),
            "formulas": self._settings.get("formulas", DEFAULT_SETTINGS["formulas"])
        }

    def update_settings(self, boru_offset_mm: int = None, mil_offset_mm: int = None) -> dict:
        """Formül ayarlarını güncelle"""
        if boru_offset_mm is not None:
            self._settings["boru_offset_mm"] = boru_offset_mm
        if mil_offset_mm is not None:
            self._settings["mil_offset_mm"] = mil_offset_mm
        self._save_settings()

        # Pricing table'daki offset değerlerini de güncelle
        if self._pricing_table:
            for col in self._pricing_table.columns:
                col_lower = self._normalize_turkish(col.display_name)
                if 'boru' in col_lower:
                    col.formula_add_mm = self._settings["boru_offset_mm"]
                elif 'mil' in col_lower or 'kromlu' in col_lower:
                    col.formula_add_mm = self._settings["mil_offset_mm"]
            self._save_data()

        return self.get_settings()

    def _ensure_data_dir(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    def _load_saved_data(self):
        if PRICING_DATA_FILE.exists():
            try:
                with open(PRICING_DATA_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._pricing_table = self._dict_to_pricing_table(data)
                    logger.info(f"Loaded pricing data with {len(self._pricing_table.columns)} columns")
            except Exception as e:
                logger.error(f"Failed to load pricing data: {e}")
                self._pricing_table = None

    def _save_data(self):
        if self._pricing_table:
            try:
                data = self._pricing_table_to_dict(self._pricing_table)
                with open(PRICING_DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                logger.info("Pricing data saved successfully")
            except Exception as e:
                logger.error(f"Failed to save pricing data: {e}")

    def _pricing_table_to_dict(self, table: PricingTable) -> dict:
        return {
            "columns": [
                {
                    "name": col.name,
                    "display_name": col.display_name,
                    "options": col.options,
                    "is_meter_based": col.is_meter_based,
                    "formula_add_mm": col.formula_add_mm
                }
                for col in table.columns
            ],
            "metadata": table.metadata
        }

    def _dict_to_pricing_table(self, data: dict) -> PricingTable:
        columns = [
            PricingColumn(
                name=col["name"],
                display_name=col["display_name"],
                options=col["options"],
                is_meter_based=col.get("is_meter_based", False),
                formula_add_mm=col.get("formula_add_mm", 0)
            )
            for col in data.get("columns", [])
        ]
        return PricingTable(columns=columns, metadata=data.get("metadata", {}))

    def _parse_price(self, value) -> float:
        if pd.isna(value):
            return 0.0
        val_str = str(value).strip()
        if not val_str:
            return 0.0
        # Para birimi ve boşlukları temizle
        val_str = re.sub(r'[€₺TL\sEUR]', '', val_str)
        # Avrupa formatı: virgülü noktaya çevir
        if ',' in val_str and '.' in val_str:
            val_str = val_str.replace('.', '').replace(',', '.')
        elif ',' in val_str:
            val_str = val_str.replace(',', '.')
        try:
            return float(val_str)
        except ValueError:
            return 0.0

    def _slugify(self, text: str) -> str:
        tr_map = {'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
                  'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'}
        for tr, en in tr_map.items():
            text = text.replace(tr, en)
        text = text.lower().strip()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[\s_-]+', '_', text)
        return text

    def _normalize_turkish(self, text: str) -> str:
        """Türkçe karakterleri normalize et"""
        replacements = {
            'İ': 'I', 'ı': 'i', 'Ş': 'S', 'ş': 's',
            'Ğ': 'G', 'ğ': 'g', 'Ü': 'U', 'ü': 'u',
            'Ö': 'O', 'ö': 'o', 'Ç': 'C', 'ç': 'c',
            'i̇': 'i'  # combining dot issue
        }
        for tr, en in replacements.items():
            text = text.replace(tr, en)
        return text.lower()

    def _is_price_column(self, col_name: str) -> bool:
        """Sütun bir fiyat sütunu mu?"""
        col_normalized = self._normalize_turkish(col_name)
        return 'fiyat' in col_normalized or 'price' in col_normalized or 'ucret' in col_normalized

    def _is_meter_based(self, col_name: str) -> tuple[bool, int]:
        """Metre bazlı sütun mu? Formül değerini döndür."""
        col_normalized = self._normalize_turkish(col_name)
        if 'boru' in col_normalized:
            return True, self._settings.get("boru_offset_mm", 120)
        if 'mil' in col_normalized or 'kromlu' in col_normalized:
            return True, self._settings.get("mil_offset_mm", 150)
        return False, 0

    def _find_header_rows(self, df: pd.DataFrame) -> list[int]:
        """Tüm başlık satırlarını bul - Excel'de birden fazla bölüm olabilir"""
        keywords = ['fiyat', 'olcu', 'boru', 'mil', 'kapak', 'piston', 'mafsal', 'bogaz', 'flans', 'terazi']
        header_rows = []

        for idx, row in df.iterrows():
            row_text = ' '.join(self._normalize_turkish(str(v)) for v in row.values if pd.notna(v))
            matches = sum(1 for kw in keywords if kw in row_text)
            if matches >= 2:  # En az 2 anahtar kelime varsa bu başlık satırı
                header_rows.append(idx)
                logger.info(f"Header row at {idx}: {[str(v)[:20] for v in row.values if pd.notna(v)]}")

        return header_rows if header_rows else [0]

    def parse_excel(self, file_bytes: bytes, filename: str) -> dict:
        """Excel dosyasını parse et - çoklu bölüm destekli"""
        import io

        try:
            # Header olmadan oku
            df = pd.read_excel(io.BytesIO(file_bytes), engine='openpyxl', header=None)
            logger.info(f"Excel: {df.shape[0]} rows, {df.shape[1]} columns")

            # Başlık satırlarını bul
            header_rows = self._find_header_rows(df)
            logger.info(f"Found header rows: {header_rows}")

            # Her bölümü ayrı parse et
            all_categories = {}

            for i, header_row in enumerate(header_rows):
                # Bölümün bitiş satırını bul
                if i + 1 < len(header_rows):
                    end_row = header_rows[i + 1]
                else:
                    end_row = len(df)

                logger.info(f"Parsing section {i+1}: rows {header_row} to {end_row}")

                # Başlık satırını al
                headers = df.iloc[header_row].values

                # Veri satırlarını al
                data_rows = df.iloc[header_row + 1:end_row]

                # Bu bölümdeki kategorileri parse et
                section_categories = self._parse_section(headers, data_rows)
                all_categories.update(section_categories)

            # PricingTable oluştur
            columns_list = [
                PricingColumn(
                    name=self._slugify(cat),
                    display_name=cat,
                    options=data["options"],
                    is_meter_based=data["is_meter_based"],
                    formula_add_mm=data["formula_add_mm"]
                )
                for cat, data in all_categories.items()
            ]

            self._pricing_table = PricingTable(
                columns=columns_list,
                metadata={
                    "format": "multi_section",
                    "sections": len(header_rows),
                    "row_count": len(df),
                    "column_count": len(columns_list)
                }
            )
            self._save_data()

            return {
                "success": True,
                "format": "multi_section",
                "sections": len(header_rows),
                "categories": list(all_categories.keys()),
                "total_options": sum(len(data["options"]) for data in all_categories.values()),
                "meter_based_columns": [cat for cat, data in all_categories.items() if data["is_meter_based"]]
            }

        except Exception as e:
            logger.error(f"Excel parse error: {e}", exc_info=True)
            raise ValueError(f"Excel dosyası okunamadı: {str(e)}")

    def _parse_section(self, headers, data_rows: pd.DataFrame) -> dict:
        """Bir bölümü parse et - sütun çiftlerini bul"""
        categories = {}

        # Sütun çiftlerini bul: [Değer] [Fiyat] [Boş] [Değer] [Fiyat] [Boş] ...
        i = 0
        while i < len(headers):
            header = headers[i]

            # Boş sütunu atla
            if pd.isna(header) or str(header).strip() == '':
                i += 1
                continue

            header_str = str(header).strip().replace('\n', ' ')

            # Fiyat sütunu mu?
            if self._is_price_column(header_str):
                i += 1
                continue

            # Değer sütunu - sonraki fiyat sütununu bul
            value_col = i
            price_col = None

            if i + 1 < len(headers):
                next_header = headers[i + 1]
                if pd.notna(next_header) and self._is_price_column(str(next_header)):
                    price_col = i + 1

            logger.info(f"Category: {header_str}, value_col={value_col}, price_col={price_col}")

            # Değerleri topla
            options = []
            seen_values = set()

            for _, row in data_rows.iterrows():
                value = row.iloc[value_col] if value_col < len(row) else None
                price = row.iloc[price_col] if price_col and price_col < len(row) else 0

                if pd.notna(value) and str(value).strip():
                    value_str = str(value).strip()

                    # Aynı değeri tekrar ekleme
                    if value_str in seen_values:
                        continue
                    seen_values.add(value_str)

                    price_float = self._parse_price(price)

                    options.append({
                        "value": value_str,
                        "label": value_str,
                        "price": price_float
                    })

            if options:
                is_meter, add_mm = self._is_meter_based(header_str)
                categories[header_str] = {
                    "options": options,
                    "is_meter_based": is_meter,
                    "formula_add_mm": add_mm
                }
                logger.info(f"Added: {header_str} with {len(options)} options, meter_based={is_meter}")

            # Sonraki sütun çiftine geç
            i += 2 if price_col else 1

        return categories

    def get_dropdown_options(self) -> dict:
        if not self._pricing_table:
            return {"success": False, "error": "Fiyat tablosu yüklenmemiş", "columns": []}

        return {
            "success": True,
            "columns": [
                {
                    "name": col.name,
                    "display_name": col.display_name,
                    "options": col.options,
                    "is_meter_based": col.is_meter_based,
                    "formula_add_mm": col.formula_add_mm
                }
                for col in self._pricing_table.columns
            ],
            "metadata": self._pricing_table.metadata
        }

    def calculate_price(self, selections: dict, stroke_mm: float = 0) -> dict:
        if not self._pricing_table:
            return {"success": False, "error": "Fiyat tablosu yüklenmemiş"}

        items = []
        total = 0

        for col in self._pricing_table.columns:
            selected_value = selections.get(col.name)
            # "YOK" seçiliyse bu bileşeni atla
            if not selected_value or selected_value.upper() == "YOK":
                continue

            for opt in col.options:
                if opt["value"] == selected_value:
                    unit_price = opt.get("price", 0)

                    if col.is_meter_based and stroke_mm > 0:
                        length_mm = stroke_mm + col.formula_add_mm
                        length_m = length_mm / 1000.0
                        calculated_price = unit_price * length_m

                        items.append({
                            "name": col.display_name,
                            "value": selected_value,
                            "unit_price": unit_price,
                            "unit": "€/m",
                            "length_mm": length_mm,
                            "length_m": round(length_m, 3),
                            "formula": f"({stroke_mm} + {col.formula_add_mm}) mm × {unit_price} €/m",
                            "price": round(calculated_price, 2)
                        })
                        total += calculated_price
                    else:
                        items.append({
                            "name": col.display_name,
                            "value": selected_value,
                            "unit_price": unit_price,
                            "unit": "€/adet",
                            "quantity": 1,
                            "price": unit_price
                        })
                        total += unit_price
                    break

        return {
            "success": True,
            "items": items,
            "total": round(total, 2),
            "stroke_mm": stroke_mm,
            "currency": "EUR"
        }

    def clear_data(self):
        self._pricing_table = None
        if PRICING_DATA_FILE.exists():
            PRICING_DATA_FILE.unlink()
        logger.info("Pricing data cleared")

    def update_columns(self, columns_data: list):
        columns = [
            PricingColumn(
                name=col.get("name", self._slugify(col.get("display_name", "unknown"))),
                display_name=col.get("display_name", "Unknown"),
                options=col.get("options", []),
                is_meter_based=col.get("is_meter_based", False),
                formula_add_mm=col.get("formula_add_mm", 0)
            )
            for col in columns_data
        ]
        self._pricing_table = PricingTable(
            columns=columns,
            metadata={"format": "manual_edit", "updated": True}
        )
        self._save_data()


# Singleton instance
_service: Optional[ExcelPricingService] = None


def get_excel_pricing_service() -> ExcelPricingService:
    global _service
    if _service is None:
        _service = ExcelPricingService()
    return _service
