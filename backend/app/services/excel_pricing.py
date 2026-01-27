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
# format: "column_key": {"add_mm": X} -> uzunluk = strok + X mm
METER_BASED_COLUMNS = {
    "boru_olcusu": {"add_mm": 120, "label": "Boru"},  # Boru boyu = Strok + 120mm
    "h8_boru": {"add_mm": 120, "label": "Boru"},
    "kromlu_mil_olcusu": {"add_mm": 100, "label": "Kromlu Mil"},  # Mil boyu = Strok + 100mm
    "kromlu_mil": {"add_mm": 100, "label": "Kromlu Mil"},
}


@dataclass
class PricingColumn:
    """Bir fiyatlandırma sütunu/kategorisi"""
    name: str
    display_name: str
    options: list[dict] = field(default_factory=list)  # [{value, label, price}]
    is_meter_based: bool = False  # Metre bazlı mı?
    formula_add_mm: int = 0  # Strok'a eklenecek mm


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
        """Data dizininin var olduğundan emin ol"""
        DATA_DIR.mkdir(parents=True, exist_ok=True)

    def _load_saved_data(self):
        """Kaydedilmiş veriyi yükle"""
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
        """Veriyi kaydet"""
        if self._pricing_table:
            try:
                data = self._pricing_table_to_dict(self._pricing_table)
                with open(PRICING_DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                logger.info("Pricing data saved successfully")
            except Exception as e:
                logger.error(f"Failed to save pricing data: {e}")

    def _pricing_table_to_dict(self, table: PricingTable) -> dict:
        """PricingTable'ı dict'e çevir"""
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
        """Dict'i PricingTable'a çevir"""
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
        """Fiyat değerini parse et (€, TL, virgül vb. destekler)"""
        if pd.isna(value):
            return 0.0

        val_str = str(value).strip()
        if not val_str:
            return 0.0

        # Para birimi sembollerini ve boşlukları temizle
        val_str = val_str.replace('€', '').replace('₺', '').replace('TL', '').replace('EUR', '').strip()

        # Avrupa formatı: 1.234,56 -> 1234.56
        # Eğer hem nokta hem virgül varsa
        if ',' in val_str and '.' in val_str:
            # Noktayı binlik ayırıcı, virgülü ondalık kabul et
            val_str = val_str.replace('.', '').replace(',', '.')
        elif ',' in val_str:
            # Sadece virgül var - ondalık ayırıcı
            val_str = val_str.replace(',', '.')

        try:
            return float(val_str)
        except ValueError:
            return 0.0

    def _slugify(self, text: str) -> str:
        """Metni slug formatına çevir"""
        # Türkçe karakterleri değiştir
        tr_map = {
            'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u',
            'Ç': 'C', 'Ğ': 'G', 'İ': 'I', 'Ö': 'O', 'Ş': 'S', 'Ü': 'U'
        }
        for tr, en in tr_map.items():
            text = text.replace(tr, en)

        # Küçük harf, boşlukları alt çizgi yap
        text = text.lower().strip()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[\s_-]+', '_', text)
        return text

    def _is_meter_based_column(self, col_name: str) -> tuple[bool, int]:
        """Sütunun metre bazlı olup olmadığını ve formül değerini kontrol et"""
        slug = self._slugify(col_name)

        for key, config in METER_BASED_COLUMNS.items():
            if key in slug:
                return True, config["add_mm"]

        # Özel kontroller
        if 'boru' in slug and ('metre' in slug or 'olcu' in slug):
            return True, 120
        if 'mil' in slug and ('metre' in slug or 'olcu' in slug):
            return True, 100
        if 'kromlu' in slug:
            return True, 100

        return False, 0

    def parse_excel(self, file_bytes: bytes, filename: str) -> dict:
        """
        Excel dosyasını parse et - Hidrolik silindir fiyat tablosu formatı

        Beklenen format:
        | BORU ÖLÇÜSÜ | H8 BORU METRE FİYATI | ARKA KAPAK | ARKA KAPAK FİYATI | ...
        | Ø40/50      | 29,33 €              | Ø40/50     | 3,39 €            | ...
        """
        import io

        try:
            # Excel dosyasını oku
            df = pd.read_excel(io.BytesIO(file_bytes), engine='openpyxl')
            logger.info(f"Excel loaded: {df.shape[0]} rows, {df.shape[1]} columns")
            logger.info(f"Columns: {list(df.columns)}")

            # Hidrolik silindir tablosu formatını parse et
            return self._parse_cylinder_format(df)

        except Exception as e:
            logger.error(f"Excel parse error: {e}")
            raise ValueError(f"Excel dosyası okunamadı: {str(e)}")

    def _parse_cylinder_format(self, df: pd.DataFrame) -> dict:
        """
        Hidrolik silindir fiyat tablosu formatını parse et

        Her sütun çifti: [Değer Sütunu] [Fiyat Sütunu]
        Fiyat sütunu "FİYAT" veya "FİYATI" içerir
        """
        columns = list(df.columns)
        categories = {}
        processed_columns = []

        i = 0
        while i < len(columns):
            col_name = str(columns[i]).strip()

            # Boş veya Unnamed sütunları atla
            if not col_name or 'Unnamed' in col_name:
                i += 1
                continue

            col_lower = col_name.lower()

            # Bu sütun zaten bir fiyat sütunu mu?
            if 'fiyat' in col_lower or 'price' in col_lower:
                i += 1
                continue

            # Sonraki sütun fiyat sütunu mu?
            price_col = None
            price_col_index = None

            # Sonraki birkaç sütuna bak (bazen araya boş sütun girebilir)
            for j in range(i + 1, min(i + 3, len(columns))):
                next_col = str(columns[j]).lower()
                if 'fiyat' in next_col or 'price' in next_col:
                    price_col = columns[j]
                    price_col_index = j
                    break

            # Değerleri topla
            options = []
            for idx, row in df.iterrows():
                value = row[columns[i]]
                if pd.notna(value) and str(value).strip():
                    value_str = str(value).strip()
                    price = 0.0

                    if price_col is not None:
                        price = self._parse_price(row[price_col])

                    options.append({
                        "value": value_str,
                        "label": value_str,
                        "price": price
                    })

            if options:
                # Metre bazlı mı kontrol et
                is_meter, add_mm = self._is_meter_based_column(col_name)

                categories[col_name] = {
                    "options": options,
                    "is_meter_based": is_meter,
                    "formula_add_mm": add_mm
                }
                processed_columns.append(col_name)

            # Sonraki sütun grubuna geç
            if price_col_index:
                i = price_col_index + 1
            else:
                i += 1

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
                "format": "cylinder",
                "row_count": len(df),
                "column_count": len(columns_list)
            }
        )
        self._save_data()

        return {
            "success": True,
            "format": "cylinder",
            "categories": processed_columns,
            "total_options": sum(len(data["options"]) for data in categories.values()),
            "meter_based_columns": [cat for cat, data in categories.items() if data["is_meter_based"]]
        }

    def get_dropdown_options(self) -> dict:
        """Dropdown seçeneklerini getir"""
        if not self._pricing_table:
            return {
                "success": False,
                "error": "Fiyat tablosu yüklenmemiş",
                "columns": []
            }

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
        """
        Seçimlere göre fiyat hesapla

        Args:
            selections: {"column_name": "selected_value", ...}
            stroke_mm: Strok uzunluğu (mm) - metre bazlı hesaplamalar için

        Returns:
            {
                "success": True,
                "items": [{"name": "...", "value": "...", "unit_price": 10, "quantity": 1, "price": 100}, ...],
                "total": 500
            }
        """
        if not self._pricing_table:
            return {
                "success": False,
                "error": "Fiyat tablosu yüklenmemiş"
            }

        items = []
        total = 0

        for col in self._pricing_table.columns:
            selected_value = selections.get(col.name)
            if selected_value:
                # Seçilen değerin fiyatını bul
                for opt in col.options:
                    if opt["value"] == selected_value:
                        unit_price = opt.get("price", 0)

                        if col.is_meter_based and stroke_mm > 0:
                            # Metre bazlı hesaplama
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
                            # Sabit fiyat
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
        """Yüklü veriyi temizle"""
        self._pricing_table = None
        if PRICING_DATA_FILE.exists():
            PRICING_DATA_FILE.unlink()
        logger.info("Pricing data cleared")

    def update_columns(self, columns_data: list):
        """Frontend'den gelen güncellenmiş sütunları kaydet"""
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
        logger.info(f"Updated pricing data with {len(columns)} columns")


# Singleton instance
_service: Optional[ExcelPricingService] = None


def get_excel_pricing_service() -> ExcelPricingService:
    """Singleton servis instance'ı al"""
    global _service
    if _service is None:
        _service = ExcelPricingService()
    return _service
