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

# Metre bazlı hesaplanan bileşenler
METER_BASED_KEYWORDS = ['boru', 'mil', 'kromlu']


@dataclass
class PricingColumn:
    """Bir fiyatlandırma sütunu/kategorisi"""
    name: str
    display_name: str
    options: list[dict] = field(default_factory=list)
    is_meter_based: bool = False
    formula_add_mm: int = 0  # Deprecated: artık her option'ın kendi offset'i var


@dataclass
class PricingTable:
    """Tam fiyatlandırma tablosu"""
    columns: list[PricingColumn] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
    
    def __post_init__(self):
        # Her zaman metadata'da temel alanlar olsun
        if 'created_at' not in self.metadata:
            from datetime import datetime
            self.metadata['created_at'] = datetime.now().isoformat()
        if 'version' not in self.metadata:
            self.metadata['version'] = 1
        if 'last_updated' not in self.metadata:
            from datetime import datetime
            self.metadata['last_updated'] = datetime.now().isoformat()
        if 'update_history' not in self.metadata:
            self.metadata['update_history'] = []


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
        """Excel dosyasını parse et - multi-sheet format"""
        import io

        try:
            # Tüm sheet'leri oku
            excel_file = pd.ExcelFile(io.BytesIO(file_bytes), engine='openpyxl')
            sheet_names = excel_file.sheet_names
            logger.info(f"Excel: {len(sheet_names)} sheets found: {sheet_names}")

            all_categories = {}

            for sheet_name in sheet_names:
                logger.info(f"Parsing sheet: {sheet_name}")
                
                # Sheet'i oku
                df = pd.read_excel(io.BytesIO(file_bytes), sheet_name=sheet_name, engine='openpyxl', header=None)
                
                if len(df) < 2:  # En az header + 1 satır olmalı
                    logger.warning(f"Sheet {sheet_name} is too small, skipping")
                    continue

                # İlk satır header
                headers = df.iloc[0].values
                data_rows = df.iloc[1:]

                # Sheet'i parse et
                sheet_data = self._parse_sheet(sheet_name, headers, data_rows)
                if sheet_data:
                    all_categories[sheet_name] = sheet_data

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
                    "format": "multi_sheet",
                    "sheets": len(sheet_names),
                    "categories": len(columns_list),
                    "source": "excel_upload",
                    "filename": filename
                }
            )
            self._update_metadata("Excel Upload", f"Loaded {len(sheet_names)} sheets with {len(columns_list)} categories")
            self._save_data()

            return {
                "success": True,
                "format": "multi_sheet",
                "sheets": len(sheet_names),
                "categories": list(all_categories.keys()),
                "total_options": sum(len(data["options"]) for data in all_categories.values()),
                "meter_based_columns": [cat for cat, data in all_categories.items() if data["is_meter_based"]]
            }

        except Exception as e:
            logger.error(f"Excel parse error: {e}", exc_info=True)
            raise ValueError(f"Excel dosyası okunamadı: {str(e)}")

    def _parse_sheet(self, sheet_name: str, headers, data_rows: pd.DataFrame) -> dict:
        """Bir sheet'i parse et - her sheet bir kategori"""
        
        # Sheet adını kategoriye çevir
        category_name = sheet_name.replace('_', ' ').title()
        
        # Sütunları belirle - ilk boş olmayan sütundan başla
        value_col = None
        price_col = None
        offset_col = None
        discount_col = None
        
        for i, header in enumerate(headers):
            if pd.isna(header):
                continue
            
            header_str = str(header).strip().replace('\n', ' ')
            header_norm = self._normalize_turkish(header_str)
            
            if value_col is None and not any(kw in header_norm for kw in ['fiyat', 'strok', 'ilave', 'iskonto', 'price']):
                value_col = i
            elif self._is_price_column(header_str) and price_col is None:
                price_col = i
            elif 'strok' in header_norm or 'ilave' in header_norm:
                offset_col = i
            elif 'iskonto' in header_norm:
                discount_col = i
        
        # Fallback: Eğer fiyat sütunu bulunamadıysa ve value sütunu varsa,
        # value'dan sonraki ilk sütunu fiyat sütunu olarak kabul et
        if price_col is None and value_col is not None:
            for i in range(value_col + 1, len(headers)):
                if pd.notna(headers[i]) and 'iskonto' not in self._normalize_turkish(str(headers[i])):
                    price_col = i
                    logger.info(f"Fallback: Using column {i} ({headers[i]}) as price column")
                    break
        
        logger.info(f"Sheet {sheet_name}: value={value_col}, price={price_col}, offset={offset_col}, discount={discount_col}")
        
        # Değerleri topla
        options = []
        seen_values = set()
        
        for _, row in data_rows.iterrows():
            value = row.iloc[value_col] if value_col is not None and value_col < len(row) else None
            price = row.iloc[price_col] if price_col is not None and price_col < len(row) else None
            offset = row.iloc[offset_col] if offset_col is not None and offset_col < len(row) else None
            discount = row.iloc[discount_col] if discount_col is not None and discount_col < len(row) else 0
            
            if pd.notna(value) and str(value).strip():
                value_str = str(value).strip()
                
                # Aynı değeri tekrar ekleme
                if value_str in seen_values:
                    continue
                seen_values.add(value_str)
                
                price_float = self._parse_price(price) if pd.notna(price) else 0.0
                offset_int = int(offset) if pd.notna(offset) else 0
                discount_float = float(discount) if pd.notna(discount) else 0.0
                
                options.append({
                    "value": value_str,
                    "label": value_str,
                    "price": price_float,
                    "discount": discount_float,
                    "offset": offset_int
                })
        
        if not options:
            logger.warning(f"No options found in sheet {sheet_name}")
            return None
        
        # Metre bazlı mı kontrol et
        is_meter, default_add_mm = self._is_meter_based(category_name)
        
        logger.info(f"Parsed {sheet_name}: {len(options)} options, meter_based={is_meter}")
        
        return {
            "options": options,
            "is_meter_based": is_meter,
            "formula_add_mm": default_add_mm
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

    def calculate_price(self, selections: dict, stroke_mm: float = 0, manual_prices: dict = None) -> dict:
        if not self._pricing_table:
            return {"success": False, "error": "Fiyat tablosu yüklenmemiş"}

        if manual_prices is None:
            manual_prices = {}

        items = []
        total = 0

        for col in self._pricing_table.columns:
            selected_value = selections.get(col.name)
            # "YOK" seçiliyse bu bileşeni atla
            if not selected_value or selected_value.upper() == "YOK":
                continue

            for opt in col.options:
                if opt["value"] == selected_value:
                    # Manuel fiyat kontrolü
                    manual_price_key = f"{col.name}:{selected_value}"
                    if manual_price_key in manual_prices:
                        # Manuel fiyat kullan
                        manual_price = manual_prices[manual_price_key]
                        discount = opt.get("discount", 0)
                        price_after_discount = manual_price * (1 - discount / 100)

                        items.append({
                            "name": col.display_name,
                            "value": selected_value,
                            "unit_price": manual_price,
                            "unit": "€/adet (Manuel)",
                            "quantity": 1,
                            "discount_percent": discount,
                            "price_before_discount": round(manual_price, 2),
                            "price": round(price_after_discount, 2),
                            "is_manual": True
                        })
                        total += price_after_discount
                        break

                    unit_price = opt.get("price", 0)
                    discount = opt.get("discount", 0)
                    offset = opt.get("offset", 0)

                    if col.is_meter_based and stroke_mm > 0:
                        # Çapa özel offset kullan (yoksa deprecated değer)
                        length_mm = stroke_mm + (offset if offset > 0 else col.formula_add_mm)
                        length_m = length_mm / 1000.0
                        calculated_price = unit_price * length_m
                        
                        # İskonto uygula
                        price_after_discount = calculated_price * (1 - discount / 100)

                        items.append({
                            "name": col.display_name,
                            "value": selected_value,
                            "unit_price": unit_price,
                            "unit": "€/m",
                            "length_mm": length_mm,
                            "length_m": round(length_m, 3),
                            "offset_mm": offset if offset > 0 else col.formula_add_mm,
                            "discount_percent": discount,
                            "price_before_discount": round(calculated_price, 2),
                            "formula": f"({stroke_mm} + {offset if offset > 0 else col.formula_add_mm}) mm × {unit_price} €/m × (1 - {discount}%)",
                            "price": round(price_after_discount, 2)
                        })
                        total += price_after_discount
                    else:
                        # Sabit fiyat - iskonto uygula
                        price_after_discount = unit_price * (1 - discount / 100)
                        
                        items.append({
                            "name": col.display_name,
                            "value": selected_value,
                            "unit_price": unit_price,
                            "unit": "€/adet",
                            "quantity": 1,
                            "discount_percent": discount,
                            "price_before_discount": round(unit_price, 2),
                            "price": round(price_after_discount, 2)
                        })
                        total += price_after_discount
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

    def add_option(self, column_name: str, value: str, price: float, discount: float = 0, offset: int = 0) -> dict:
        """Mevcut kategoriye yeni option ekle"""
        if not self._pricing_table:
            raise ValueError("Fiyat tablosu yüklenmemiş")

        # Kategoriyi bul
        column = next((col for col in self._pricing_table.columns if col.name == column_name), None)
        if not column:
            raise ValueError(f"Kategori bulunamadı: {column_name}")
        
        action = "updated"
        existing = next((opt for opt in column.options if opt["value"] == value), None)
        if existing:
            # Güncelle
            existing["price"] = price
            existing["discount"] = discount
            existing["offset"] = offset
            logger.info(f"Updated option: {column_name} - {value}")
        else:
            # Yeni ekle
            action = "added"
            column.options.append({
                "value": value,
                "label": value,
                "price": price,
                "discount": discount,
                "offset": offset
            })
            logger.info(f"Added new option: {column_name} - {value}")

        # Metadata güncelle
        self._update_metadata(
            "Manual Edit", 
            f"{action.capitalize()} {value} in {column.display_name} (Price: €{price}, Discount: {discount}%)"
        )
        
        # Kaydet
        self._save_data()

        return {
            "column_name": column_name,
            "value": value,
            "total_options": len(column.options),
            "action": action
        }

    def _update_metadata(self, update_type: str, description: str):
        """Metadata güncelle ve history'ye ekle"""
        from datetime import datetime
        
        if not self._pricing_table:
            return
        
        now = datetime.now().isoformat()
        self._pricing_table.metadata['last_updated'] = now
        self._pricing_table.metadata['last_update_type'] = update_type
        
        # Version artır
        current_version = self._pricing_table.metadata.get('version', 1)
        self._pricing_table.metadata['version'] = current_version + 1
        
        # History'ye ekle
        if 'update_history' not in self._pricing_table.metadata:
            self._pricing_table.metadata['update_history'] = []
        
        self._pricing_table.metadata['update_history'].append({
            'version': self._pricing_table.metadata['version'],
            'type': update_type,
            'description': description,
            'timestamp': now
        })
        
        # History'yi son 50 kayıtla sınırla
        if len(self._pricing_table.metadata['update_history']) > 50:
            self._pricing_table.metadata['update_history'] = self._pricing_table.metadata['update_history'][-50:]

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
