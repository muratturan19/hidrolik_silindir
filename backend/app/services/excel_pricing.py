"""
Excel Tabanlı Fiyatlandırma Servisi

Excel dosyasından bileşen ve fiyat bilgilerini okur,
dropdown seçenekleri ve fiyat hesaplama sağlar.
"""

import json
import logging
from pathlib import Path
from typing import Optional
from dataclasses import dataclass, field
import pandas as pd

logger = logging.getLogger(__name__)

# Veri dosyası yolu
DATA_DIR = Path(__file__).parent.parent / "data"
PRICING_DATA_FILE = DATA_DIR / "pricing_table.json"


@dataclass
class PricingColumn:
    """Bir fiyatlandırma sütunu/kategorisi"""
    name: str
    display_name: str
    options: list[dict] = field(default_factory=list)  # [{value, label, price}]


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
                    "options": col.options
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
                options=col["options"]
            )
            for col in data.get("columns", [])
        ]
        return PricingTable(columns=columns, metadata=data.get("metadata", {}))

    def parse_excel(self, file_bytes: bytes, filename: str) -> dict:
        """
        Excel dosyasını parse et

        Beklenen format (Seçenek 1 - Dikey):
        | Kategori      | Seçenek | Fiyat |
        |---------------|---------|-------|
        | Silindir Çapı | Ø50     | 100   |
        | Silindir Çapı | Ø63     | 120   |
        | Mil Çapı      | Ø25     | 50    |

        Veya (Seçenek 2 - Yatay, her sütun bir kategori):
        | Silindir Çapı | Fiyat | Mil Çapı | Fiyat | ...
        | Ø50          | 100   | Ø25      | 50    |
        | Ø63          | 120   | Ø32      | 60    |
        """
        import io

        try:
            # Excel dosyasını oku
            df = pd.read_excel(io.BytesIO(file_bytes), engine='openpyxl')
            logger.info(f"Excel loaded: {df.shape[0]} rows, {df.shape[1]} columns")
            logger.info(f"Columns: {list(df.columns)}")

            # Format tespiti
            columns_lower = [str(c).lower() for c in df.columns]

            # Format 1: Kategori | Seçenek | Fiyat
            if any('kategori' in c or 'bileşen' in c or 'component' in c for c in columns_lower):
                return self._parse_vertical_format(df)

            # Format 2: Her sütun çifti bir kategori (Seçenek, Fiyat)
            elif any('fiyat' in c or 'price' in c for c in columns_lower):
                return self._parse_horizontal_format(df)

            # Format 3: Basit format - ilk satır header, sonrakiler değerler
            else:
                return self._parse_simple_format(df)

        except Exception as e:
            logger.error(f"Excel parse error: {e}")
            raise ValueError(f"Excel dosyası okunamadı: {str(e)}")

    def _parse_vertical_format(self, df: pd.DataFrame) -> dict:
        """Dikey format: Kategori | Seçenek | Fiyat"""
        # Sütun isimlerini normalize et
        col_mapping = {}
        for col in df.columns:
            col_lower = str(col).lower()
            if 'kategori' in col_lower or 'bileşen' in col_lower or 'component' in col_lower:
                col_mapping['category'] = col
            elif 'seçenek' in col_lower or 'değer' in col_lower or 'option' in col_lower or 'value' in col_lower:
                col_mapping['option'] = col
            elif 'fiyat' in col_lower or 'price' in col_lower or 'ücret' in col_lower:
                col_mapping['price'] = col

        if len(col_mapping) < 3:
            raise ValueError("Dikey format için Kategori, Seçenek ve Fiyat sütunları gerekli")

        # Kategorilere göre grupla
        categories = {}
        for _, row in df.iterrows():
            cat = str(row[col_mapping['category']]).strip()
            opt = str(row[col_mapping['option']]).strip()
            price = float(row[col_mapping['price']]) if pd.notna(row[col_mapping['price']]) else 0

            if cat not in categories:
                categories[cat] = []

            categories[cat].append({
                "value": opt,
                "label": opt,
                "price": price
            })

        # PricingTable oluştur
        columns = [
            PricingColumn(
                name=self._slugify(cat),
                display_name=cat,
                options=opts
            )
            for cat, opts in categories.items()
        ]

        self._pricing_table = PricingTable(
            columns=columns,
            metadata={"format": "vertical", "row_count": len(df)}
        )
        self._save_data()

        return {
            "success": True,
            "format": "vertical",
            "categories": list(categories.keys()),
            "total_options": sum(len(opts) for opts in categories.values())
        }

    def _parse_horizontal_format(self, df: pd.DataFrame) -> dict:
        """Yatay format: Her sütun çifti bir kategori"""
        columns = list(df.columns)
        categories = {}

        i = 0
        while i < len(columns):
            col_name = str(columns[i])

            # "Fiyat" sütununu atla
            if 'fiyat' in col_name.lower() or 'price' in col_name.lower():
                i += 1
                continue

            # Sonraki sütun fiyat mı?
            price_col = None
            if i + 1 < len(columns):
                next_col = str(columns[i + 1]).lower()
                if 'fiyat' in next_col or 'price' in next_col:
                    price_col = columns[i + 1]

            # Değerleri topla
            options = []
            for _, row in df.iterrows():
                value = row[columns[i]]
                if pd.notna(value) and str(value).strip():
                    price = float(row[price_col]) if price_col and pd.notna(row[price_col]) else 0
                    options.append({
                        "value": str(value).strip(),
                        "label": str(value).strip(),
                        "price": price
                    })

            if options:
                categories[col_name] = options

            i += 2 if price_col else 1

        # PricingTable oluştur
        columns_list = [
            PricingColumn(
                name=self._slugify(cat),
                display_name=cat,
                options=opts
            )
            for cat, opts in categories.items()
        ]

        self._pricing_table = PricingTable(
            columns=columns_list,
            metadata={"format": "horizontal", "row_count": len(df)}
        )
        self._save_data()

        return {
            "success": True,
            "format": "horizontal",
            "categories": list(categories.keys()),
            "total_options": sum(len(opts) for opts in categories.values())
        }

    def _parse_simple_format(self, df: pd.DataFrame) -> dict:
        """Basit format: Her sütun bir kategori, değerler satırlarda"""
        categories = {}

        for col in df.columns:
            col_name = str(col)
            values = df[col].dropna().unique()

            options = []
            for val in values:
                val_str = str(val).strip()
                if val_str:
                    # Fiyat değeri var mı kontrol et (sayısal ise)
                    try:
                        price = float(val_str.replace(',', '.').replace('₺', '').replace('TL', '').strip())
                        options.append({
                            "value": val_str,
                            "label": val_str,
                            "price": price
                        })
                    except ValueError:
                        options.append({
                            "value": val_str,
                            "label": val_str,
                            "price": 0
                        })

            if options:
                categories[col_name] = options

        # PricingTable oluştur
        columns = [
            PricingColumn(
                name=self._slugify(cat),
                display_name=cat,
                options=opts
            )
            for cat, opts in categories.items()
        ]

        self._pricing_table = PricingTable(
            columns=columns,
            metadata={"format": "simple", "row_count": len(df)}
        )
        self._save_data()

        return {
            "success": True,
            "format": "simple",
            "categories": list(categories.keys()),
            "total_options": sum(len(opts) for opts in categories.values())
        }

    def _slugify(self, text: str) -> str:
        """Metni slug formatına çevir"""
        import re
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
                    "options": col.options
                }
                for col in self._pricing_table.columns
            ],
            "metadata": self._pricing_table.metadata
        }

    def calculate_price(self, selections: dict) -> dict:
        """
        Seçimlere göre fiyat hesapla

        Args:
            selections: {"column_name": "selected_value", ...}

        Returns:
            {
                "success": True,
                "items": [{"name": "...", "value": "...", "price": 100}, ...],
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
                        price = opt.get("price", 0)
                        items.append({
                            "name": col.display_name,
                            "value": selected_value,
                            "price": price
                        })
                        total += price
                        break

        return {
            "success": True,
            "items": items,
            "total": total,
            "currency": "TRY"
        }

    def clear_data(self):
        """Yüklü veriyi temizle"""
        self._pricing_table = None
        if PRICING_DATA_FILE.exists():
            PRICING_DATA_FILE.unlink()
        logger.info("Pricing data cleared")


# Singleton instance
_service: Optional[ExcelPricingService] = None


def get_excel_pricing_service() -> ExcelPricingService:
    """Singleton servis instance'ı al"""
    global _service
    if _service is None:
        _service = ExcelPricingService()
    return _service
