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
        self._load_saved_data()

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

    def _is_price_column(self, col_name: str) -> bool:
        """Sütun bir fiyat sütunu mu?"""
        col_lower = col_name.lower()
        return 'fiyat' in col_lower or 'price' in col_lower or 'ücret' in col_lower

    def _is_meter_based(self, col_name: str) -> tuple[bool, int]:
        """Metre bazlı sütun mu? Formül değerini döndür."""
        col_lower = self._slugify(col_name)
        if 'boru' in col_lower:
            return True, 120  # Boru boyu = Strok + 120mm
        if 'mil' in col_lower or 'kromlu' in col_lower:
            return True, 100  # Mil boyu = Strok + 100mm
        return False, 0

    def parse_excel(self, file_bytes: bytes, filename: str) -> dict:
        """Excel dosyasını parse et"""
        import io

        try:
            # Excel'i oku - header=0 ile ilk satırı başlık olarak al
            df = pd.read_excel(io.BytesIO(file_bytes), engine='openpyxl', header=0)

            logger.info(f"Excel loaded: {df.shape[0]} rows, {df.shape[1]} columns")
            logger.info(f"All columns: {list(df.columns)}")

            # Sütun isimlerini temizle
            df.columns = [str(col).strip() if pd.notna(col) else f'Unnamed_{i}'
                         for i, col in enumerate(df.columns)]

            return self._parse_paired_columns(df)

        except Exception as e:
            logger.error(f"Excel parse error: {e}", exc_info=True)
            raise ValueError(f"Excel dosyası okunamadı: {str(e)}")

    def _parse_paired_columns(self, df: pd.DataFrame) -> dict:
        """
        Eşleştirilmiş sütunları parse et.
        Format: [Değer Sütunu] [Fiyat Sütunu] ... [Değer Sütunu] [Fiyat Sütunu]
        """
        columns = list(df.columns)
        categories = {}
        processed = set()

        logger.info(f"Parsing {len(columns)} columns...")

        # Önce tüm fiyat sütunlarını bul
        price_columns = {}
        for i, col in enumerate(columns):
            if self._is_price_column(str(col)):
                price_columns[i] = col
                logger.info(f"Found price column at {i}: {col}")

        # Her fiyat sütunu için önceki değer sütununu bul
        for price_idx, price_col in price_columns.items():
            # Önceki sütunu bul (boş/unnamed olmayanı)
            value_col = None
            value_idx = None

            for j in range(price_idx - 1, -1, -1):
                col_name = str(columns[j])
                if j not in processed and not col_name.startswith('Unnamed') and col_name.strip():
                    if not self._is_price_column(col_name):
                        value_col = columns[j]
                        value_idx = j
                        break

            if value_col is None:
                logger.warning(f"No value column found for price column: {price_col}")
                continue

            logger.info(f"Pairing: {value_col} <-> {price_col}")
            processed.add(value_idx)
            processed.add(price_idx)

            # Değerleri topla
            options = []
            for _, row in df.iterrows():
                value = row[value_col]
                price = row[price_col] if price_col in row else 0

                if pd.notna(value) and str(value).strip():
                    value_str = str(value).strip()
                    price_float = self._parse_price(price)

                    options.append({
                        "value": value_str,
                        "label": value_str,
                        "price": price_float
                    })

            if options:
                is_meter, add_mm = self._is_meter_based(str(value_col))
                display_name = str(value_col).strip()

                categories[display_name] = {
                    "options": options,
                    "is_meter_based": is_meter,
                    "formula_add_mm": add_mm
                }
                logger.info(f"Added category: {display_name} with {len(options)} options")

        # Fiyat sütunu olmayan değer sütunlarını da ekle (fiyatsız)
        for i, col in enumerate(columns):
            col_name = str(col)
            if i not in processed and not col_name.startswith('Unnamed') and col_name.strip():
                if not self._is_price_column(col_name):
                    options = []
                    for _, row in df.iterrows():
                        value = row[col]
                        if pd.notna(value) and str(value).strip():
                            value_str = str(value).strip()
                            options.append({
                                "value": value_str,
                                "label": value_str,
                                "price": 0
                            })

                    if options:
                        is_meter, add_mm = self._is_meter_based(col_name)
                        categories[col_name] = {
                            "options": options,
                            "is_meter_based": is_meter,
                            "formula_add_mm": add_mm
                        }
                        logger.info(f"Added category (no price): {col_name} with {len(options)} options")

        # PricingTable oluştur
        columns_list = [
            PricingColumn(
                name=self._slugify(cat),
                display_name=cat,
                options=data["options"],
                is_meter_based=data["is_meter_based"],
                formula_add_mm=data["formula_add_mm"]
            )
            for cat, data in categories.items()
        ]

        self._pricing_table = PricingTable(
            columns=columns_list,
            metadata={
                "format": "paired",
                "row_count": len(df),
                "column_count": len(columns_list)
            }
        )
        self._save_data()

        return {
            "success": True,
            "format": "paired",
            "categories": list(categories.keys()),
            "total_options": sum(len(data["options"]) for data in categories.values()),
            "meter_based_columns": [cat for cat, data in categories.items() if data["is_meter_based"]]
        }

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
            if selected_value:
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
