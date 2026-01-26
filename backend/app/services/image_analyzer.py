"""
Gelişmiş Teknik Resim Analiz Servisi

Strateji:
1. Dosya tipi belirleme (PDF vs Image)
2. PDF için: Native PDF gönderme + PDF parser ile metin çıkarma
3. Image için: Base64 vision analizi
4. Adımlı analiz: Önce antet/context, sonra ölçüler
5. Fallback mekanizması ile güvenilirlik
6. Sonuçları birleştirme ve doğrulama
"""

import json
import re
import base64
from typing import Optional
from dataclasses import dataclass
from openai import AsyncOpenAI
from ..models import (
    CylinderDimensions,
    MaterialType,
    CylinderType,
    MountingType,
    ImageAnalysisResult
)
from ..config import get_settings

# PDF işleme için opsiyonel importlar
try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False

try:
    import pdfplumber
    PDFPLUMBER_AVAILABLE = True
except ImportError:
    PDFPLUMBER_AVAILABLE = False


@dataclass
class ExtractedPDFData:
    """PDF'den çıkarılan ham veriler"""
    text_content: str = ""
    dimensions_found: list = None
    title_block: dict = None
    tables: list = None
    page_count: int = 0

    def __post_init__(self):
        if self.dimensions_found is None:
            self.dimensions_found = []
        if self.tables is None:
            self.tables = []


@dataclass
class AnalysisStep:
    """Analiz adımı sonucu"""
    step_name: str
    success: bool
    data: dict = None
    confidence: float = 0.0
    error: str = None


class TechnicalDrawingAnalyzer:
    """
    Gelişmiş Teknik Resim Analiz Sınıfı

    Hidrolik silindir teknik resimlerini analiz etmek için
    çoklu strateji ve fallback mekanizması kullanır.
    """

    # Hidrolik silindir teknik resimlerinde kullanılan yaygın terimler
    DIMENSION_PATTERNS = {
        'bore_diameter': [
            r'[ØD]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|MM)?',  # Ø80, D80
            r'(?:bore|silindir|piston)\s*(?:çap[ıi]?|diameter|dia\.?)\s*[:\s]*(\d+(?:[.,]\d+)?)',
            r'(?:iç|inner)\s*(?:çap|diameter)\s*[:\s]*(\d+(?:[.,]\d+)?)',
        ],
        'rod_diameter': [
            r'(?:mil|rod|shaft)\s*(?:çap[ıi]?|diameter|dia\.?)\s*[:\s]*[Ø]?(\d+(?:[.,]\d+)?)',
            r'[Ød]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|MM)?.*(?:mil|rod|shaft)',
            r'(?:piston\s*mil|piston\s*rod)\s*[:\s]*[Ø]?(\d+(?:[.,]\d+)?)',
        ],
        'stroke_length': [
            r'(?:strok|stroke|course|hareket)\s*(?:boyu?|length)?\s*[:\s]*(\d+(?:[.,]\d+)?)',
            r'(?:S|C)\s*[=:]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|MM)?',
            r'(\d+(?:[.,]\d+)?)\s*(?:mm|MM)?\s*(?:strok|stroke)',
        ],
        'working_pressure': [
            r'(?:çalışma|working|max\.?|maksimum)\s*(?:basınç|pressure)\s*[:\s]*(\d+(?:[.,]\d+)?)\s*(?:bar|Bar|BAR|MPa)',
            r'(\d+(?:[.,]\d+)?)\s*(?:bar|Bar|BAR|MPa)',
            r'P\s*[=:]\s*(\d+(?:[.,]\d+)?)',
        ],
    }

    # Antet bilgileri için pattern'ler
    TITLE_BLOCK_PATTERNS = {
        'project_name': r'(?:proje|project|iş)\s*(?:ad[ıi]?|name)\s*[:\s]*(.+)',
        'drawing_number': r'(?:çizim|drawing|resim)\s*(?:no|number|numaras[ıi])\s*[:\s]*(.+)',
        'revision': r'(?:rev(?:izyon)?|revision)\s*[:\s]*(.+)',
        'scale': r'(?:ölçek|scale)\s*[:\s]*(\d+\s*:\s*\d+)',
        'material': r'(?:malzeme|material)\s*[:\s]*(.+)',
        'customer': r'(?:müşteri|customer|firma)\s*[:\s]*(.+)',
    }

    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.openai_model
        self.analysis_steps: list[AnalysisStep] = []

    def _create_system_prompt(self, context: str = "") -> str:
        """Detaylı ve bağlamsal system prompt oluştur"""

        base_prompt = """Sen bir HİDROLİK SİLİNDİR teknik resim analiz uzmanısın.
Türkiye'deki hidrolik silindir üreticileri için çalışıyorsun.

## GÖREV
Verilen teknik resimden HİDROLİK SİLİNDİR imalatı için gerekli KRİTİK ÖLÇÜLERİ tespit et.

## HİDROLİK SİLİNDİR HAKKINDA
Hidrolik silindirler, hidrolik basınçla doğrusal hareket üreten aktüatörlerdir.
Ana bileşenler:
- GÖVDE (Tube/Barrel): Silindirik boru, içinde piston hareket eder
- PİSTON: Gövde içinde hareket eden parça, sızdırmazlık contaları vardır
- PİSTON MİLİ (Rod): Pistona bağlı, dışarı çıkan mil
- KAPAKLAR: Ön ve arka kapaklar (gland, head)
- CONTA TAKIMI: Sızdırmazlık elemanları

## KRİTİK ÖLÇÜLER (Öncelik sırasına göre)

### 1. SİLİNDİR İÇ ÇAPI (Bore Diameter) - EN ÖNEMLİ
- Gövde borusunun İÇ çapı
- Genellikle Ø sembolü ile gösterilir (örn: Ø80, Ø100)
- Teknik resimlerde "D", "bore", "silindir çapı" olarak geçer
- DIN/ISO standartlarında yaygın değerler: 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250 mm

### 2. PİSTON MİLİ ÇAPI (Rod Diameter)
- Dışarı çıkan milin çapı
- Silindir çapından KÜÇÜK olmalı (genellikle %50-70 oranında)
- "d", "rod", "mil çapı", "shaft" olarak geçer
- Yaygın değerler: 16, 20, 25, 28, 32, 36, 40, 45, 50, 56, 63, 70, 80, 90 mm

### 3. STROK BOYU (Stroke Length)
- Pistonun hareket mesafesi
- Toplam uzunluk DEĞİL, sadece hareket mesafesi
- "S", "stroke", "strok", "course", "hareket" olarak geçer
- Genellikle teknik resimlerde çift ok işareti (↔) ile gösterilir

### 4. ÇALIŞMA BASINCI (Working Pressure) - Opsiyonel
- Maksimum çalışma basıncı
- bar veya MPa cinsinden
- Standart: 160 bar, 200 bar, 250 bar, 320 bar

## ÖLÇÜ BİRİMLERİ
- Uzunluk: mm (milimetre) - varsayılan
- Basınç: bar veya MPa (1 MPa = 10 bar)
- Birimsiz sayılar mm olarak kabul edilebilir

## TEKNİK RESİM OKUMA İPUÇLARI
1. Kesit görünüşlerde (section view) iç ölçüler daha net görünür
2. Antet (title block) genellikle sağ altta, malzeme ve proje bilgisi içerir
3. Ölçü çizgileri (dimension lines) ok uçlu çizgilerdir
4. Toleranslar parantez içinde veya ± ile gösterilir
5. Çap sembolleri: Ø (çap), R (yarıçap), ⌀ (alternatif çap)

## SİLİNDİR TİPLERİ
- single_acting (Tek Etkili): Tek yönde hidrolik güç, dönüş yaylı
- double_acting (Çift Etkili): Her iki yönde hidrolik güç - EN YAYGIN
- telescopic (Teleskopik): İç içe geçmiş silindirler, uzun strok

## BAĞLANTI TİPLERİ
- flange: Flanşlı bağlantı (cıvatalı montaj)
- clevis: Mafsallı (U şeklinde, pim ile bağlantı)
- trunnion: Trunyon (yanal pivot noktaları)
- foot: Ayaklı (tabana montaj)
- tie_rod: Bağlantı çubuklu (dış çubuklar ile montaj)

## MALZEME TESPİTİ
- steel (Çelik): St52, S355, CK45 - En yaygın
- stainless (Paslanmaz): AISI 304, 316 - Korozif ortamlar için
- aluminum (Alüminyum): Hafif uygulamalar için
"""

        if context:
            base_prompt += f"""

## EK BAĞLAM BİLGİSİ
Aşağıdaki bilgiler PDF'den veya önceki analizden elde edilmiştir:
{context}

Bu bilgileri ölçüleri doğrulamak ve tutarsızlıkları tespit etmek için kullan.
"""

        base_prompt += """

## ÇIKTI FORMATI
Yanıtını SADECE aşağıdaki JSON formatında ver:
{
    "success": true,
    "dimensions": {
        "bore_diameter": <sayı mm cinsinden>,
        "rod_diameter": <sayı mm cinsinden>,
        "stroke_length": <sayı mm cinsinden>,
        "wall_thickness": <sayı veya null>,
        "working_pressure": <sayı bar cinsinden veya null>
    },
    "material": "steel" | "stainless" | "aluminum" | null,
    "cylinder_type": "single_acting" | "double_acting" | "telescopic" | null,
    "mounting_type": "flange" | "clevis" | "trunnion" | "foot" | "tie_rod" | null,
    "confidence": <0.0-1.0 arası güven skoru>,
    "reasoning": "<Ölçüleri nasıl tespit ettiğinin kısa açıklaması>",
    "warnings": ["<Olası sorunlar veya belirsizlikler>"]
}

EĞER ölçüler okunamıyorsa:
{
    "success": false,
    "error": "<Detaylı hata açıklaması>",
    "partial_data": {<tespit edilebilenler>},
    "confidence": 0
}
"""
        return base_prompt

    async def _extract_pdf_text(self, pdf_bytes: bytes) -> ExtractedPDFData:
        """PDF'den metin ve yapısal veri çıkar"""
        result = ExtractedPDFData()

        # PyMuPDF ile dene
        if PYMUPDF_AVAILABLE:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                result.page_count = len(doc)

                full_text = []
                for page in doc:
                    full_text.append(page.get_text())

                result.text_content = "\n".join(full_text)
                doc.close()
            except Exception as e:
                print(f"PyMuPDF error: {e}")

        # pdfplumber ile tablo çıkarma dene
        if PDFPLUMBER_AVAILABLE and not result.text_content:
            try:
                import io
                with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
                    result.page_count = len(pdf.pages)

                    full_text = []
                    for page in pdf.pages:
                        text = page.extract_text()
                        if text:
                            full_text.append(text)

                        # Tabloları çıkar
                        tables = page.extract_tables()
                        if tables:
                            result.tables.extend(tables)

                    result.text_content = "\n".join(full_text)
            except Exception as e:
                print(f"pdfplumber error: {e}")

        # Regex ile ölçü değerlerini bul
        if result.text_content:
            result.dimensions_found = self._extract_dimensions_from_text(result.text_content)
            result.title_block = self._extract_title_block(result.text_content)

        return result

    def _extract_dimensions_from_text(self, text: str) -> list[dict]:
        """Metinden ölçü değerlerini regex ile çıkar"""
        found_dimensions = []

        for dim_type, patterns in self.DIMENSION_PATTERNS.items():
            for pattern in patterns:
                matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    try:
                        value = float(match.group(1).replace(',', '.'))
                        found_dimensions.append({
                            'type': dim_type,
                            'value': value,
                            'pattern': pattern,
                            'context': text[max(0, match.start()-30):match.end()+30]
                        })
                    except (ValueError, IndexError):
                        continue

        return found_dimensions

    def _extract_title_block(self, text: str) -> dict:
        """Antet bilgilerini çıkar"""
        title_block = {}

        for field, pattern in self.TITLE_BLOCK_PATTERNS.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                title_block[field] = match.group(1).strip()

        return title_block

    async def _analyze_with_native_pdf(self, pdf_bytes: bytes, context: str = "") -> AnalysisStep:
        """GPT-5.2 native PDF desteği ile analiz"""
        step = AnalysisStep(step_name="native_pdf_analysis", success=False)

        try:
            pdf_base64 = base64.b64encode(pdf_bytes).decode('utf-8')

            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._create_system_prompt(context)},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Bu PDF teknik resimden hidrolik silindir ölçülerini çıkar."
                            },
                            {
                                "type": "file",
                                "file": {
                                    "filename": "technical_drawing.pdf",
                                    "file_data": f"data:application/pdf;base64,{pdf_base64}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.1
            )

            result_text = response.choices[0].message.content
            step.data = self._parse_llm_response(result_text)
            step.success = step.data.get("success", False)
            step.confidence = step.data.get("confidence", 0)

        except Exception as e:
            step.error = str(e)
            # Native PDF desteklenmiyorsa, alternatif yönteme geç
            if "file" in str(e).lower() or "unsupported" in str(e).lower():
                step.error = "Native PDF not supported, will fallback to image"

        return step

    async def _analyze_with_vision(
        self,
        image_base64: str,
        mime_type: str = "image/png",
        context: str = ""
    ) -> AnalysisStep:
        """GPT-5.2 Vision API ile görüntü analizi"""
        step = AnalysisStep(step_name="vision_analysis", success=False)

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._create_system_prompt(context)},
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Bu teknik resimden hidrolik silindir ölçülerini çıkar."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{mime_type};base64,{image_base64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000,
                temperature=0.1
            )

            result_text = response.choices[0].message.content
            step.data = self._parse_llm_response(result_text)
            step.success = step.data.get("success", False)
            step.confidence = step.data.get("confidence", 0)

        except Exception as e:
            step.error = str(e)

        return step

    async def _convert_pdf_to_images(self, pdf_bytes: bytes) -> list[str]:
        """PDF sayfalarını görüntüye çevir"""
        images = []

        if PYMUPDF_AVAILABLE:
            try:
                doc = fitz.open(stream=pdf_bytes, filetype="pdf")
                for page_num in range(min(len(doc), 3)):  # İlk 3 sayfa
                    page = doc[page_num]
                    # Yüksek çözünürlük için zoom
                    mat = fitz.Matrix(2.0, 2.0)
                    pix = page.get_pixmap(matrix=mat)
                    img_bytes = pix.tobytes("png")
                    images.append(base64.b64encode(img_bytes).decode('utf-8'))
                doc.close()
            except Exception as e:
                print(f"PDF to image conversion error: {e}")

        return images

    def _parse_llm_response(self, response_text: str) -> dict:
        """LLM yanıtını parse et"""
        try:
            # JSON bloğunu bul
            json_match = re.search(r'\{[\s\S]*\}', response_text)
            if json_match:
                return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

        return {
            "success": False,
            "error": "JSON parse failed",
            "raw_response": response_text
        }

    def _merge_results(self, steps: list[AnalysisStep], pdf_data: Optional[ExtractedPDFData] = None) -> dict:
        """Birden fazla analiz adımının sonuçlarını birleştir"""
        merged = {
            "success": False,
            "dimensions": {},
            "confidence": 0,
            "sources": [],
            "warnings": []
        }

        # En yüksek güvenilirlikli başarılı sonucu bul
        successful_steps = [s for s in steps if s.success and s.data]
        if not successful_steps:
            # Partial data varsa kullan
            for step in steps:
                if step.data and step.data.get("partial_data"):
                    merged["partial_data"] = step.data["partial_data"]
                    merged["warnings"].append(f"Only partial data from {step.step_name}")
            return merged

        # En güvenilir sonucu seç
        best_step = max(successful_steps, key=lambda s: s.confidence)
        merged = best_step.data.copy()
        merged["primary_source"] = best_step.step_name
        merged["sources"] = [s.step_name for s in successful_steps]

        # PDF'den çıkarılan verilerle doğrula
        if pdf_data and pdf_data.dimensions_found:
            validation_warnings = self._validate_with_pdf_data(
                merged.get("dimensions", {}),
                pdf_data.dimensions_found
            )
            merged["warnings"] = merged.get("warnings", []) + validation_warnings

        # Diğer başarılı sonuçlarla karşılaştır
        if len(successful_steps) > 1:
            cross_validation = self._cross_validate_results(successful_steps)
            merged["cross_validation"] = cross_validation
            if cross_validation.get("discrepancies"):
                merged["warnings"].append("Sonuçlar arasında tutarsızlık var")

        return merged

    def _validate_with_pdf_data(self, dimensions: dict, pdf_dimensions: list) -> list[str]:
        """LLM sonuçlarını PDF parser sonuçlarıyla doğrula"""
        warnings = []

        for pdf_dim in pdf_dimensions:
            dim_type = pdf_dim['type']
            pdf_value = pdf_dim['value']
            llm_value = dimensions.get(dim_type)

            if llm_value and abs(llm_value - pdf_value) > 1:  # 1mm tolerans
                warnings.append(
                    f"{dim_type}: LLM={llm_value}mm, PDF parser={pdf_value}mm - Farklı değerler"
                )

        return warnings

    def _cross_validate_results(self, steps: list[AnalysisStep]) -> dict:
        """Birden fazla sonucu karşılaştır"""
        validation = {"consistent": True, "discrepancies": []}

        if len(steps) < 2:
            return validation

        base = steps[0].data.get("dimensions", {})
        for step in steps[1:]:
            other = step.data.get("dimensions", {})
            for key in base:
                if key in other:
                    diff = abs(base.get(key, 0) - other.get(key, 0))
                    if diff > 2:  # 2mm tolerans
                        validation["consistent"] = False
                        validation["discrepancies"].append({
                            "dimension": key,
                            "values": [base.get(key), other.get(key)],
                            "sources": [steps[0].step_name, step.step_name]
                        })

        return validation

    async def analyze(
        self,
        file_bytes: bytes,
        file_name: str = "",
        mime_type: str = ""
    ) -> ImageAnalysisResult:
        """
        Ana analiz metodu - Adımlı ve fallback'li analiz

        Akış:
        1. Dosya tipini belirle
        2. PDF ise: Text çıkar + Native PDF dene + Vision fallback
        3. Görüntü ise: Direkt Vision analizi
        4. Sonuçları birleştir ve doğrula
        """
        self.analysis_steps = []
        pdf_data = None
        context = ""

        # Dosya tipini belirle
        is_pdf = mime_type == "application/pdf" or file_name.lower().endswith('.pdf')

        if is_pdf:
            # Adım 1: PDF'den metin çıkar
            pdf_data = await self._extract_pdf_text(file_bytes)

            # Context oluştur
            if pdf_data.text_content:
                context_parts = []
                if pdf_data.title_block:
                    context_parts.append(f"Antet Bilgileri: {json.dumps(pdf_data.title_block, ensure_ascii=False)}")
                if pdf_data.dimensions_found:
                    dims_summary = [f"{d['type']}: {d['value']}mm" for d in pdf_data.dimensions_found[:10]]
                    context_parts.append(f"PDF'den bulunan olası ölçüler: {', '.join(dims_summary)}")
                context = "\n".join(context_parts)

            # Adım 2: Native PDF analizi dene
            native_step = await self._analyze_with_native_pdf(file_bytes, context)
            self.analysis_steps.append(native_step)

            # Adım 3: Native başarısızsa, PDF'i görüntüye çevirip Vision ile dene
            if not native_step.success or native_step.confidence < 0.7:
                images = await self._convert_pdf_to_images(file_bytes)
                for i, img_base64 in enumerate(images):
                    vision_step = await self._analyze_with_vision(img_base64, "image/png", context)
                    vision_step.step_name = f"vision_pdf_page_{i+1}"
                    self.analysis_steps.append(vision_step)

                    # Yüksek güvenilirlik varsa dur
                    if vision_step.success and vision_step.confidence >= 0.85:
                        break
        else:
            # Görüntü dosyası - direkt Vision analizi
            img_base64 = base64.b64encode(file_bytes).decode('utf-8')

            # MIME type belirle
            if not mime_type:
                if file_name.lower().endswith('.png'):
                    mime_type = 'image/png'
                elif file_name.lower().endswith(('.jpg', '.jpeg')):
                    mime_type = 'image/jpeg'
                elif file_name.lower().endswith('.webp'):
                    mime_type = 'image/webp'
                else:
                    mime_type = 'image/png'

            vision_step = await self._analyze_with_vision(img_base64, mime_type, context)
            self.analysis_steps.append(vision_step)

        # Sonuçları birleştir
        final_result = self._merge_results(self.analysis_steps, pdf_data)

        # ImageAnalysisResult'a dönüştür
        return self._to_analysis_result(final_result)

    def _to_analysis_result(self, merged: dict) -> ImageAnalysisResult:
        """Birleştirilmiş sonucu ImageAnalysisResult'a dönüştür"""

        if not merged.get("success"):
            return ImageAnalysisResult(
                success=False,
                error_message=merged.get("error", "Analiz başarısız"),
                confidence=merged.get("confidence", 0),
                raw_analysis=json.dumps(merged, ensure_ascii=False, indent=2)
            )

        dims_data = merged.get("dimensions", {})
        try:
            dimensions = CylinderDimensions(
                bore_diameter=dims_data.get("bore_diameter"),
                rod_diameter=dims_data.get("rod_diameter"),
                stroke_length=dims_data.get("stroke_length"),
                wall_thickness=dims_data.get("wall_thickness"),
                working_pressure=dims_data.get("working_pressure", 160)
            )
        except Exception as e:
            return ImageAnalysisResult(
                success=False,
                error_message=f"Ölçü dönüştürme hatası: {str(e)}",
                raw_analysis=json.dumps(merged, ensure_ascii=False, indent=2)
            )

        # Enum değerlerini çevir
        material = None
        if merged.get("material"):
            try:
                material = MaterialType(merged["material"])
            except ValueError:
                pass

        cylinder_type = None
        if merged.get("cylinder_type"):
            try:
                cylinder_type = CylinderType(merged["cylinder_type"])
            except ValueError:
                pass

        mounting_type = None
        if merged.get("mounting_type"):
            try:
                mounting_type = MountingType(merged["mounting_type"])
            except ValueError:
                pass

        # Notları birleştir
        notes_parts = []
        if merged.get("reasoning"):
            notes_parts.append(f"Analiz: {merged['reasoning']}")
        if merged.get("warnings"):
            notes_parts.append(f"Uyarılar: {', '.join(merged['warnings'])}")
        if merged.get("sources"):
            notes_parts.append(f"Kaynaklar: {', '.join(merged['sources'])}")

        return ImageAnalysisResult(
            success=True,
            dimensions=dimensions,
            detected_material=material,
            detected_cylinder_type=cylinder_type,
            detected_mounting_type=mounting_type,
            confidence=merged.get("confidence", 0.8),
            raw_analysis="\n".join(notes_parts) if notes_parts else None
        )


# Backward compatibility için alias
class ImageAnalyzer(TechnicalDrawingAnalyzer):
    """Eski API ile uyumluluk için wrapper"""

    async def analyze_technical_drawing(
        self,
        image_base64: str,
        file_name: str | None = None
    ) -> ImageAnalysisResult:
        """Eski metod - base64 görüntü ile çağrı"""
        file_bytes = base64.b64decode(image_base64)

        mime_type = "image/png"
        if file_name:
            if file_name.lower().endswith('.pdf'):
                mime_type = "application/pdf"
            elif file_name.lower().endswith(('.jpg', '.jpeg')):
                mime_type = "image/jpeg"
            elif file_name.lower().endswith('.webp'):
                mime_type = "image/webp"

        return await self.analyze(file_bytes, file_name or "", mime_type)
