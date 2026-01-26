# AI 2D Teknik Resim Analiz Sistemi
## Kapsamli Teknik Kilavuz v3.0

**Tarih:** 2026-01-26
**Proje:** MQ_V3 - Teknik Resim Analiz Motoru
**Amac:** Baska bir programa entegrasyon icin teknik resim okuma konusunda kusursuz bir kilavuz

---

# ICINDEKILER

1. [Sistem Mimarisi](#1-sistem-mimarisi)
2. [LLM Entegrasyonu](#2-llm-entegrasyonu)
3. [PDF/Gorsel Onisleme](#3-pdfgorsel-onisleme)
4. [OCR Sistemi](#4-ocr-sistemi)
5. [Analiz Modlari](#5-analiz-modlari)
6. [Prompt Muhendisligi](#6-prompt-muhendisligi)
7. [Fallback Stratejisi](#7-fallback-stratejisi)
8. [API Entegrasyonu](#8-api-entegrasyonu)
9. [Veri Sema ve Modelleri](#9-veri-sema-ve-modelleri)
10. [Frontend Entegrasyonu](#10-frontend-entegrasyonu)
11. [Konfigurasyonlar](#11-konfigurasyonlar)
12. [Oneriler ve Best Practices](#12-oneriler-ve-best-practices)

---

# 1. SISTEM MIMARISI

## 1.1 Genel Bakis

```
+------------------------------------------------------------------+
|                    FRONTEND (React/TypeScript)                    |
+------------------------------------------------------------------+
| AIGeometryAnalyzerPage.tsx    - 2D Analiz UI                     |
| aiAnalysisService.ts          - API Istemci                      |
| AIConsentDialog.tsx           - GDPR/KVKK Onay                   |
+---------------------------+--------------------------------------+
                            |
                            v
+------------------------------------------------------------------+
|                    API KATMANI (FastAPI)                          |
+------------------------------------------------------------------+
| POST /api/ai/analyze-drawing  - Teknik resim analizi             |
| POST /api/ai/estimate-cost    - Maliyet tahmini                  |
| GET  /api/ai/health           - Saglik kontrolu                  |
| GET  /api/ai/status           - OpenAI/Anthropic durumu          |
+---------------------------+--------------------------------------+
                            |
                            v
+------------------------------------------------------------------+
|                    SERVIS KATMANI (Python)                        |
+------------------------------------------------------------------+
| EnhancedAnalyzer              - Ana analiz motoru                |
| AIAnalyzerService             - GPT-5.2 entegrasyonu             |
| AIFallbackStrategy            - Otomatik fallback                |
| PDFPreprocessor               - PDF -> Gorsel donusumu           |
| OCRExtractor                  - Metin cikariemi                  |
+---------------------------+--------------------------------------+
                            |
                            v
+------------------------------------------------------------------+
|                    LLM SERVISLERI                                 |
+------------------------------------------------------------------+
| OpenAI GPT-5.2               - Ana model (Responses API)         |
|   - Files API                - PDF yukleme                       |
|   - Vision API               - Gorsel analiz                     |
|   - Reasoning API            - Derin dusunme                     |
| Anthropic Claude Sonnet 4.5  - Fallback/Hybrid mod               |
+------------------------------------------------------------------+
```

## 1.2 Dosya Yapisi

```
backend/app/
├── api/routes/
│   └── ai.py                    # API endpoint'leri
├── services/
│   ├── ai_analyzer.py           # Ana analyzer (GPT-5.2)
│   ├── enhanced_analyzer.py     # Gelismis analiz motoru
│   ├── ai_fallback_mq.py        # Fallback stratejisi
│   ├── pdf_preprocessor.py      # PDF onisleme
│   ├── ocr_extractor.py         # OCR cikariemi
│   ├── analysis_config.py       # Konfigurasyon
│   ├── enhanced_prompts.py      # Ana promptlar
│   ├── progressive_prompts.py   # 3-asamali promptlar
│   └── multi_agent_prompts.py   # 5-agent paralel promptlar
└── core/
    └── config.py                # Sistem ayarlari

frontend/src/
├── services/
│   └── aiAnalysisService.ts     # API istemcisi
├── pages/
│   └── AIGeometryAnalyzerPage.tsx  # Analiz UI
└── components/
    ├── AIStatusBanner.tsx       # Durum gostergesi
    └── AIConsentDialog.tsx      # KVKK onay
```

---

# 2. LLM ENTEGRASYONU

## 2.1 OpenAI GPT-5.2 (Ana Model)

### Model Ozellikleri
```python
# backend/app/core/config.py
openai_model = "gpt-5.2"              # Ana model
openai_reasoning_model = "gpt-5.2"    # Reasoning destekli

# Reasoning seviyeleri
reasoning_efforts = {
    "xhigh": "En yuksek dogruluk (20-30 dk)",
    "high": "Dengeli (3-5 dk)",
    "medium": "Hizli (1-2 dk)"
}
```

### API Kullanimi - Responses API (2025+)
```python
from openai import OpenAI

client = OpenAI(api_key="your-api-key")

# PDF Yukleme (Files API)
file_upload = client.files.create(
    file=(filename, io.BytesIO(file_bytes), "application/pdf"),
    purpose="user_data"
)

# Analiz Cagrisi (Responses API)
response = client.responses.create(
    model="gpt-5.2",
    input=[
        {
            "type": "message",
            "role": "user",
            "content": [
                {"type": "input_text", "text": analysis_prompt},
                {"type": "input_file", "file_id": file_upload.id},
                # Opsiyonel: Ek gorseller
                {
                    "type": "input_image",
                    "image_url": f"data:image/png;base64,{image_b64}"
                }
            ]
        }
    ],
    reasoning={"effort": "xhigh"},  # xhigh | high | medium
    text={"verbosity": "high"},     # high | medium | low
    max_output_tokens=100000
)

# Yanit Cikariemi
output_text = response.output_text
# veya
for item in response.output:
    if item.type == 'message':
        for c in item.content:
            if c.type == 'output_text':
                output_text += c.text
```

### Token Kullanimi
```python
# Token limitleri
max_tokens_default = 100000    # Varsayilan
max_tokens_limit = 200000      # Maksimum
context_window = 500000        # GPT-5.2 context

# Token izleme
if hasattr(response, 'usage'):
    token_usage = {
        "input_tokens": response.usage.input_tokens,
        "output_tokens": response.usage.output_tokens,
        "total_tokens": response.usage.total_tokens
    }
```

## 2.2 Anthropic Claude (Fallback/Hybrid)

```python
import anthropic

client = anthropic.Anthropic(api_key="your-anthropic-key")

# Vision destekli mesaj
message = client.messages.create(
    model="claude-sonnet-4-5-20250929",
    max_tokens=50000,
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/png",
                        "data": image_b64
                    }
                },
                {
                    "type": "text",
                    "text": analysis_prompt
                }
            ]
        }
    ]
)

output_text = message.content[0].text
```

---

# 3. PDF/GORSEL ONISLEME

## 3.1 PDFPreprocessor Sinifi

```python
# backend/app/services/pdf_preprocessor.py

class PDFPreprocessor:
    """
    Teknik resim PDF'lerini AI analizi icin optimize eder

    Ozellikler:
    - Yuksek DPI render (200-400)
    - Rotasyon duzeltme (180 derece CAD cizimler)
    - Kontrast iyilestirme
    - Bolge tespiti (antet, ana gorunum)
    """

    def __init__(self, dpi: int = 400):
        self.dpi = dpi

    def process_pdf(self, pdf_bytes: bytes) -> Dict[str, Any]:
        """
        Ana isleme pipeline'i

        Donus:
            {
                "full_image": base64 PNG (ilk sayfa),
                "pages": [base64 PNG, ...],  # Tum sayfalar
                "regions": {
                    "header": base64 PNG,    # Antet bolgesi
                    "main_view": base64 PNG  # Ana gorunum
                },
                "corrected_pdf": bytes,      # Duzeltilmis PDF (opsiyonel)
                "metadata": {
                    "page_count": int,
                    "width": int,
                    "height": int,
                    "rotation_applied": bool
                }
            }
        """
```

## 3.2 Kullanilan Kutuphaneler

```python
# PDF Render
import fitz  # PyMuPDF
# DPI ayarlari
zoom = dpi / 72  # 72 varsayilan DPI
mat = fitz.Matrix(zoom, zoom)
pix = page.get_pixmap(matrix=mat, alpha=False)

# Goruntu Isleme
import cv2
import numpy as np
from PIL import Image

# Kontrast iyilestirme (CLAHE)
lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
l, a, b = cv2.split(lab)
clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
l_enhanced = clahe.apply(l)
enhanced = cv2.merge([l_enhanced, a, b])
result = cv2.cvtColor(enhanced, cv2.COLOR_LAB2BGR)

# Base64 donusumu
import base64
buffer = io.BytesIO()
pil_img.save(buffer, format="PNG", optimize=True)
img_base64 = base64.b64encode(buffer.read()).decode('utf-8')
```

## 3.3 Bolge Tespiti

```python
def _detect_regions(self, image: np.ndarray) -> Dict[str, np.ndarray]:
    """
    Kritik bolgeleri tespit et:
    - header: Antet kutusu (genelde sag alt, %30x%20)
    - main_view: Ana cizim alani (merkez %60x%60)
    """
    h, w = image.shape[:2]

    # ANTET: Sag alt kose (CAD standardi)
    header_w = int(w * 0.30)
    header_h = int(h * 0.20)
    header = image[h - header_h:h, w - header_w:w]

    # ANA GORUNUM: Merkez (antet haric)
    main_x1, main_x2 = int(w * 0.20), int(w * 0.80)
    main_y1, main_y2 = int(h * 0.15), int(h * 0.75)
    main_view = image[main_y1:main_y2, main_x1:main_x2]

    return {
        "header": header,
        "main_view": main_view
    }
```

## 3.4 Rotasyon Duzeltme

```python
def _fix_rotation(self, image: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    180 derece dondurulmus CAD cizimlerini tespit et ve duzelt

    Yontem: Kenar yogunlugu karsilastirmasi
    - Ust yaridaki kenar sayisi < Alt yarida * 1.3 ise -> ters
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    h = gray.shape[0]

    edges_top = cv2.Canny(gray[:h//2, :], 50, 150).sum()
    edges_bottom = cv2.Canny(gray[h//2:, :], 50, 150).sum()

    if edges_bottom > edges_top * 1.3:
        rotated = cv2.rotate(image, cv2.ROTATE_180)
        return rotated, True

    return image, False
```

---

# 4. OCR SISTEMI

## 4.1 OCRExtractor Sinifi

```python
# backend/app/services/ocr_extractor.py

class OCRExtractor:
    """
    Teknik resimlerden metin cikaran sinif

    Desteklenen motorlar:
    - gpt_vision: En dogruluk (varsayilan)
    - paddleocr: Teknik resimler icin optimize
    - tesseract: Hizli, yerel
    - easyocr: Cok dilli
    """

    def __init__(self, engine: str = "gpt_vision", api_key: str = None):
        self.engine = engine
        self.api_key = api_key
```

## 4.2 GPT Vision OCR

```python
def extract_text_from_base64(self, image_b64: str, filename: str) -> Dict:
    """GPT Vision ile yapilandirilmis OCR"""

    response = self.client.responses.create(
        model="gpt-5.2",
        input=[
            {
                "type": "message",
                "role": "user",
                "content": [
                    {"type": "input_text", "text": OCR_EXTRACTION_PROMPT},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/png;base64,{image_b64}"
                    }
                ]
            }
        ],
        reasoning={"effort": "low"},  # OCR icin dusuk yeterli
        max_output_tokens=2000
    )
```

## 4.3 OCR Prompt'u

```python
OCR_EXTRACTION_PROMPT = """Sen teknik resim OCR uzmanısin. Bu görselden TÜM metin bilgilerini cikar.

CIKARILACAK BILGILER:

1. ANTET BILGILERI (Sag alt kose):
   - Firma adi
   - Parca adi/numarasi
   - Malzeme
   - Revizyon
   - Tarih
   - Olcek
   - Cizen/Onaylayan

2. OLCU BILGILERI:
   - Tum sayisal degerler (orn: 150, 45.5, Ø60)
   - Toleranslar (orn: H7, h6, ±0.1, +0.05/-0.02)
   - Dis bilgileri (orn: M8, M10x1.5, G1/4)

3. YUZEY SIMGELERI:
   - Ra degerleri (orn: Ra 0.8, Ra 3.2)
   - Rz degerleri
   - Yuzey islem notlari

4. NOTLAR VE ACIKLAMALAR:
   - Genel tolerans notu
   - Isleme notlari
   - Kaplama/isil islem notlari

JSON CIKTISI:
{
  "header_info": {
    "company": "<firma adi>",
    "part_name": "<parca adi>",
    "part_number": "<parca no>",
    "material": "<malzeme>",
    "revision": "<revizyon>",
    "date": "<tarih>",
    "scale": "<olcek>"
  },
  "dimensions": [
    {"value": "<sayi>", "unit": "mm", "tolerance": "<tolerans>"}
  ],
  "threads": [
    {"type": "<M8>", "pitch": "<1.25>", "count": <adet>}
  ],
  "surface_finish": [
    {"value": "<Ra 0.8>", "location": "<yuzey>"}
  ],
  "notes": ["<not 1>", "<not 2>"],
  "ocr_confidence": <0-100>
}
"""
```

## 4.4 Akilli Metin Ayristirma (Smart Parsing)

```python
def _parse_raw_text(self, text: str) -> Dict[str, Any]:
    """Ham metni yapilandirilmis formata cevir"""

    result = {
        "dimensions": [],
        "tolerances": [],
        "threads": [],
        "surface_finish": [],
        "material_hints": []
    }

    # Toleranslar (±0.1, H7, g6)
    pm_pattern = r'(\d+(?:\.\d+)?)\s*(?:±|\+\/-)\s*(\d+(?:\.\d+)?)'
    fit_pattern = r'(\d+(?:\.\d+)?)\s*([A-Za-z]{1,2}\d{1,2})'

    # Yuzey puruluzu (Ra 3.2, Rz 10)
    ra_pattern = r'(?:Ra|Rz)\s*(\d+(?:\.\d+)?)'

    # Disler (M6, M10x1.5, G1/2)
    thread_pattern = r'(M\d+(?:x\d+(?:\.\d+)?)?|G\d+(?:\/\d+)?)'

    # Caplar (Ø10, Dia 10)
    dia_pattern = r'(?:Ø|Dia|Diameter)\s*(\d+(?:\.\d+)?)'

    # Malzeme ipuclari
    material_keywords = [
        "steel", "aluminum", "stainless", "celik", "aluminyum",
        "aisi", "din", "1.2344", "4140", "304", "316"
    ]

    return result
```

---

# 5. ANALIZ MODLARI

## 5.1 Mod Tanimlari

```python
# backend/app/services/analysis_config.py

class AnalysisMode(str, Enum):
    LEGACY_V1 = "legacy_v1"      # Orijinal tek-adim analiz
    ENHANCED_V2 = "enhanced_v2"  # Gelismis multi-modal
    TWO_STAGE = "two_stage"      # OCR + AI (2 asamali)
    HYBRID = "hybrid"            # GPT + Claude ensemble
    AUTO = "auto"                # Otomatik secim
```

## 5.2 Legacy V1 (Tek Adim)

```python
def _analyze_legacy(self, file_bytes, filename, max_tokens, progress_callback):
    """
    Orijinal tek-adim analiz
    - PDF direkt yuklenir
    - Tek bir GPT cagrisi
    - En hizli, en guvenilir
    """
    ai_service = AIAnalyzerService(api_key=self.openai_key)

    result = ai_service.analyze_technical_drawing(
        image_base64="",
        filename=filename,
        file_bytes=file_bytes,
        max_tokens=max_tokens,
        progress_callback=progress_callback
    )

    return result
```

## 5.3 Enhanced V2 (Multi-Modal)

```python
def _analyze_enhanced(self, file_bytes, filename, max_tokens, progress_callback, config):
    """
    Gelismis multi-modal analiz

    Strateji:
    1. PDF onisleme (gorsel + bolge tespiti)
    2. PDF metin katmani cikariemi
    3. Hem PDF hem gorselleri LLM'e gonder
    4. Fallback stratejisi ile calistir
    """

    # 1. PDF Onisleme
    preprocessed = preprocess_technical_drawing(file_bytes, dpi=config.pdf_dpi)

    # 2. PDF Metin Cikariemi (PyMuPDF)
    raw_pdf_text = self._extract_pdf_text(file_bytes)

    # 3. Multi-Modal Input Olustur
    input_content = [
        {"type": "input_text", "text": prompt},
        {"type": "input_file", "file_id": file_upload.id}
    ]

    # Yuksek cozunurluklu gorseller ekle
    if preprocessed and 'pages' in preprocessed:
        for page_b64 in preprocessed['pages'][:5]:  # Max 5 sayfa
            input_content.append({
                "type": "input_image",
                "image_url": f"data:image/jpeg;base64,{page_b64}"
            })

    # 4. Fallback ile calistir
    result = AIFallbackStrategy.execute_with_fallback(
        openai_client=self.openai_client,
        input_messages=[{"type": "message", "role": "user", "content": input_content}],
        max_output_tokens=max_tokens,
        start_from_strategy=start_from,
        mode="enhanced_v2"
    )
```

## 5.4 Two-Stage (OCR + AI)

```python
def _analyze_two_stage(self, file_bytes, filename, max_tokens, progress_callback, config):
    """
    Iki asamali analiz

    Asama 1: OCR ile on-cikarim (hizli, dusuk maliyet)
    Asama 2: OCR verisi + AI muhendislik analizi (derin)
    """

    # ASAMA 1: OCR
    preprocessed = preprocess_technical_drawing(file_bytes, dpi=config.pdf_dpi)
    ocr_extractor = OCRExtractor(engine="gpt_vision", api_key=self.openai_key)
    ocr_result = ocr_extractor.extract_text_from_base64(
        image_b64=preprocessed['full_image'],
        filename=filename
    )

    # ASAMA 2: Muhendislik Analizi
    engineering_prompt = get_engineering_analysis_prompt(ocr_result)

    result = AIFallbackStrategy.execute_with_fallback(
        openai_client=self.openai_client,
        input_messages=[...],
        mode="two_stage"
    )

    # OCR verisini sonuca ekle
    result["ocr_data"] = ocr_result
```

## 5.5 Hybrid (GPT + Claude)

```python
def _analyze_hybrid(self, file_bytes, filename, max_tokens, progress_callback, config):
    """
    Hybrid ensemble analiz

    1. GPT-5.2 ile analiz
    2. Claude Sonnet ile analiz
    3. Sonuclari birlestir ve karsilastir
    """

    # GPT Analizi
    gpt_result = self._analyze_enhanced(file_bytes, filename, max_tokens//2, None, config)

    # Claude Analizi
    claude_result = self._analyze_with_claude(file_bytes, filename, max_tokens//2, config)

    # Birlestir
    merged = self._merge_results(gpt_result, claude_result)

    # Agirlikli ortalama guven
    merged["overall_confidence"] = int(
        gpt_result.get("overall_confidence", 0) * 0.6 +
        claude_result.get("overall_confidence", 0) * 0.4
    )

    return merged
```

---

# 6. PROMPT MUHENDISLIGI

## 6.1 Ana Analiz Prompt'u

```python
# backend/app/services/enhanced_prompts.py

ENHANCED_ANALYSIS_PROMPT = """Sen Dunya capinda taninanan bir Bas Imalat Muhendisisin ve 30 yillik tecrubeyesahipsin.
Gorevin, bu teknik resmi en ince detayina kadar analiz ederek, uretim icin kritik olan tum verileri hatasiz cikarmaktir.

ANALIZ ADIMLARI:

1. ANTET OKUMA (Sag alt kose):
   - Malzeme spesifikasyonu (DIN/AISI/EN kodu ile)
   - Yuzey islem/kaplama turu
   - Parca numarasi, ismi, revizyonu
   - Olcek bilgisi (1:1, 1:2, vs.)
   - Ozel notlar ve uyarilar

2. BOYUT OKUMA (COK ONEMLI!):
   - TUM olculeri oku: uzunluk, genislik, yukseklik, caplar
   - Toleranslari kaydet: H7, h6, js6, ±0.01, ±0.1
   - Dis bilgileri: M6, M8, M10x1, Tr20x4, vs.
   - Yuzey puruzlulugu sembolleri: Ra 0.8, Ra 1.6, Ra 3.2, Rz 25
   - GD&T sembolleri:
     * Duzlemsellik (Flatness)
     * Diklik (Perpendicularity)
     * Paralellik (Parallelism)
     * Konum (Position)
     * Esmerkezlilik (Concentricity)

3. GEOMETRI VE URETILEBILIRLIK ANALIZI:
   - Parca tipi: somun, mil, flans, govde, plaka, vs.
   - Delik sayisi ve caplari
   - Ic/dis dis sayisi ve tipleri
   - Ince cidarlar (< 3mm dikkat!)
   - Derin cepler (derinlik > 4x genislik)
   - Ic koseler (takim erisimi - radyus var mi?)
   - Simetri durumu (setup sayisini etkiler)

4. MALZEME ONERILERI:
   - Antet'te yazani once oku (confidence: 95+)
   - Parca fonksiyonuna gore muhendislik onerisi yap
   - Alternatif malzemeler oner (maliyet/performans)
   - Her oneri icin gerekce ve confidence belirt

5. OPERASYON TAHMINLERI:
   - Gerekli operasyonlari listele
   - Her operasyon icin makina tipi belirt (3-Eksen, 5-Eksen, Torna, vs.)
   - Gercekci sure tahminleri yap (dakika)
   - Zorluk carpani ver (1.0 = kolay, 3.0 = cok zor)

6. MALIYET FAKTORLERI:
   - Uretimi zorlastiran faktorleri listele
   - Ozel takim/fikstur gereksinimleri
   - Setup sayisi ve sureleri
   - Kalite kontrol gereksinimleri (CMM gerekli mi?)

GUVENILIRLIK SEVIYELERI:
- 90-100: Metin net okunuyor (Kesin bilgi)
- 70-89: Metin okunuyor ama kismen (Yuksek ihtimal)
- 50-69: Metin bulanik, tahmin yurutülüyor (Dusuk guven)
- 0-49: Okunamiyor (NULL dondur, tahmin etme!)

TURKCE DIL KURALLARI:
- "Brunit" = Siyah oksit kaplama
  YANLIS: "yuzey brunitir", "brunit yuzey"
  DOGRU: "brunit kaplama", "siyah oksit kaplama"

- Isim tamlamalari DUZ:
  YANLIS: "malzemenin secimi" -> DOGRU: "malzeme secimi"
  YANLIS: "islemin yapilmasi" -> DOGRU: "islem"

- Teknik terimler:
  "Islah celigi" (AISI 4140, 42CrMo4)
  "Paslanmaz celik" (AISI 304, 316)
  "Yapi celigi" (St37, St52)
"""
```

## 6.2 Few-Shot Ornekler

```python
FEW_SHOT_EXAMPLES = [
    {
        "description": "Hidrolik Sikma Somunu - Silindirik parca, ic-dis dis",
        "input_hints": "Cap Ø60, ic dis M30x1.5, malzeme belirtilmemis",
        "output": {
            "title_block": {
                "material_specification": "Celik (Stahl)",
                "surface_treatment": "Brunit kaplama (siyah oksit)",
                "scale": "1:1"
            },
            "dimensions": {
                "height_mm": 45,
                "diameter_mm": 60,
                "weight_estimate_kg": 0.85,
                "raw_material_type": "cubuk"
            },
            "geometry_complexity": {
                "thin_walls": {"exists": False, "risk_level": "yok"},
                "hole_count": 1,
                "threaded_holes": {"count": 1, "types": ["M30x1.5 ic"]},
                "tight_tolerance_features": {"count": 2, "examples": ["Ø60 h6", "Ø30 H7"]}
            },
            "material_suggestions": [
                {
                    "material": "AISI 4140 (42CrMo4)",
                    "source": "muhendislik_onerisi",
                    "reasoning": "Hidrolik sikma uygulamasi yuksek basinc altinda calisir",
                    "confidence": 80,
                    "is_alternative": True
                }
            ],
            "operations": [
                {
                    "operation": "Tornalama",
                    "machine_type": "CNC Torna",
                    "estimated_time_minutes": 25,
                    "difficulty_factor": 1.3
                },
                {
                    "operation": "Dis Acma",
                    "machine_type": "CNC Torna",
                    "estimated_time_minutes": 10,
                    "difficulty_factor": 1.2
                }
            ],
            "overall_confidence": 85
        }
    }
]
```

## 6.3 Multi-Agent Prompt'lari (5 Uzman)

```python
# backend/app/services/multi_agent_prompts.py

# AGENT A: Geometri Okuyucu
AGENT_A_GEOMETRY = """SEN: GEOMETRY READER UZMAN AJANSIN

GOREVIN: Teknik resimdeki TUM BOYUTLARI ve GEOMETRIK OLCULERI oku.

ONCELIKLER:
1. Ana Boyutlar: uzunluk, genislik, yukseklik, caplar
2. Tum olculeri oku: kesit gorunumleri dahil
3. Acilar: pah acilari, konik acilar
4. Karmasik geometriler: delik konumlari, pattern'ler

JSON CIKTISI:
{
  "agent": "geometry_reader",
  "confidence": 0.85,
  "main_dimensions": {"length_mm": 150, "width_mm": 75, "height_mm": 40},
  "all_dimensions": [...],
  "diameters": [...],
  "angles": [...],
  "patterns": [...]
}
"""

# AGENT B: GD&T Okuyucu
AGENT_B_GDT = """SEN: GD&T UZMAN AJANSIN

GOREVIN: Toleranslari, yuzey puruzlulugunu ve geometrik tolerans sembollerini oku.

ONCELIKLER:
1. Boyut toleranslari: H7, h6, ±0.1
2. Yuzey puruzlulugu: Ra 0.8, Ra 3.2
3. GD&T sembolleri: diklik, paralellik, konum
"""

# AGENT C: Malzeme & Yuzey
AGENT_C_MATERIAL = """SEN: MALZEME VE YUZEY ISLEM UZMAN AJANSIN

GOREVIN: Malzeme spesifikasyonu, sertlik, kaplama ve isil islem bilgilerini oku.

ONCELIKLER:
1. Malzeme: DIN/AISI kodlari
2. Yuzey kaplamasi: brunit, krom, anodize
3. Isil islem: islah, sertlestirme
"""

# AGENT D: Antet Okuyucu
AGENT_D_HEADER = """SEN: ANTET OKUMA UZMAN AJANSIN

GOREVIN: Teknik resmin antet kutusundaki TUM bilgileri oku.

ONCELIKLER:
1. Parca bilgileri: ad, numara, revizyon
2. Firma bilgileri: musteri, tasarimci
3. Teknik bilgiler: olcek, tarih
"""

# AGENT E: Imalat Ozellikleri
AGENT_E_MACHINING = """SEN: IMALAT OZELLIKLERI UZMAN AJANSIN

GOREVIN: Disler, delikler, pahlar, islem gereksinimlerini belirle.

ONCELIKLER:
1. Dis bilgileri: M6, M8, ic/dis dis
2. Delik tipleri: gecme, kor, havsa
3. Pahlar ve radyusler
4. Imalat operasyonlari ve sure tahminleri
"""
```

## 6.4 Progressive (3-Asamali) Prompt'lar

```python
# backend/app/services/progressive_prompts.py

STAGE_1_PROMPT = """KADEME 1/3: ANTET + GENEL YAPI

Sen teknik resim uzmanisin. Bu kademede ANTET OKUMA ve GENEL YAPI TESPITI uzmanisn.

ONCELIKLER:
1. ANTET OKUMA (En yuksek guven):
   - Malzeme cinsi
   - Yuzey islemi
   - Olcek
   - Ozel notlar

2. PARCA TIPI TESPITI:
   - Ne cesit bir parca? (somun, flans, govde, mil vs.)
   - Fonksiyonu ne olabilir?

3. ANA BOYUTLAR:
   - Uzunluk, genislik, yukseklik (mm)
   - Tahmini agirlik

4. GENEL GEOMETRI:
   - Sekil: Silindirik / Kutusal / Karmasik
   - Simetri: Simetrik / Asimetrik
   - Delik sayisi
"""

STAGE_2_PROMPT = """KADEME 2/3: GEOMETRI + GD&T UZMANI

Kademe 1 sonuclarini aldin. Simdi sen GEOMETRI ve TOLERANS uzmanisin.

GOREV: HASSAS OLCUM VE TOLERANS ANALIZI

1. ANA BOYUTLAR:
   - H7, h6, js6 gibi ISO 286 toleranslari
   - ±0.01, ±0.05 gibi genel toleranslar

2. YUZEY PURUZLULUGU:
   - Ra 0.8, Ra 3.2, Ra 6.3 sembolleri
   - Hangi yuzeyler puruzsuz olmali?

3. DISLI BAGLANTILAR:
   - M6, M8, M10 vs. ISO metric disler
   - Ic dis mi, dis dis mi?
"""

STAGE_3_PROMPT = """KADEME 3/3: MALZEME + IMALAT UZMANI + DOGRULAYICI

Kademe 1 ve 2 sonuclarini aldin. Simdi sen IMALAT UZMANI ve DOGRULAYICI'sin.

GOREVLER:
1. CAPRAZ DOGRULAMA: OCR, gorsel, PDF verisini karsilastir
2. MALZEME DEGERLENDIRMESI: Parca fonksiyonuna uygun mu?
3. ISLEM ONERILERI: Hangi makineler, sureler
4. MALIYET FAKTORLERI: Zorlastiran faktorler
"""
```

---

# 7. FALLBACK STRATEJISI

## 7.1 AIFallbackStrategy Sinifi

```python
# backend/app/services/ai_fallback_mq.py

class AIFallbackStrategy:
    """
    Otomatik fallback mekanizmasi
    xhigh -> high -> medium -> GPT-5 (degradation)

    Timeout veya hata durumunda bir sonraki stratejiye gecer.
    """

    STRATEGIES = [
        {
            "model": "gpt-5.2",
            "reasoning": "xhigh",
            "timeout": 1800,  # 30 dakika
            "label": "AI xHigh Reasoning",
            "expected_time": "20-30 dakika"
        },
        {
            "model": "gpt-5.2",
            "reasoning": "high",
            "timeout": 300,   # 5 dakika
            "label": "AI High Reasoning",
            "expected_time": "3-5 dakika"
        },
        {
            "model": "gpt-5.2",
            "reasoning": "medium",
            "timeout": 120,   # 2 dakika
            "label": "AI Medium Reasoning",
            "expected_time": "1-2 dakika"
        },
        {
            "model": "gpt-5",
            "reasoning": "high",
            "timeout": 300,   # 5 dakika
            "label": "AI High Reasoning (Fallback)",
            "expected_time": "3-5 dakika"
        }
    ]
```

## 7.2 Fallback Calistiricisi

```python
@staticmethod
def execute_with_fallback(
    openai_client: OpenAI,
    input_messages: list,
    max_output_tokens: int,
    progress_callback=None,
    start_from_strategy: int = 0,
    mode: str = "unknown",
    file_size_bytes: int = None
) -> Dict[str, Any]:
    """
    Fallback stratejisi ile API cagrisi

    Args:
        start_from_strategy: Hangi strateji ile baslayacak
            0 = xhigh (en iyi, en yavas)
            1 = high (dengeli)
            2 = medium (hizli)

    Returns:
        {
            "response": API yaniti,
            "strategy_used": Kullanilan strateji,
            "total_attempts": Toplam deneme sayisi
        }
    """

    strategies = AIFallbackStrategy.STRATEGIES[start_from_strategy:]

    for idx, strategy in enumerate(strategies):
        try:
            # Her strateji icin timeout'lu client olustur
            client_with_timeout = OpenAI(
                api_key=openai_client.api_key,
                timeout=float(strategy["timeout"]),
                max_retries=1
            )

            response = client_with_timeout.responses.create(
                model=strategy["model"],
                input=input_messages,
                reasoning={"effort": strategy["reasoning"]},
                max_output_tokens=max_output_tokens
            )

            # Basarili!
            return {
                "response": response,
                "strategy_used": strategy,
                "total_attempts": idx + 1
            }

        except (httpx.ReadTimeout, httpx.ConnectTimeout) as e:
            # Timeout -> sonraki stratejiye gec
            if idx == len(strategies) - 1:
                raise Exception("Tum stratejiler zaman asimina ugradi")
            continue

        except RateLimitError as e:
            # Rate limit -> sonraki stratejiye gec
            continue

        except APIError as e:
            # API hatasi -> sonraki stratejiye gec
            continue
```

---

# 8. API ENTEGRASYONU

## 8.1 FastAPI Endpoint

```python
# backend/app/api/routes/ai.py

from fastapi import APIRouter, UploadFile, File, Query
from fastapi.concurrency import run_in_threadpool

router = APIRouter(prefix="/ai", tags=["AI Analysis"])

@router.post("/analyze-drawing", summary="Analyze technical drawing with GPT-5.2")
async def analyze_drawing(
    request: Request,
    file: UploadFile = File(...),
    max_tokens: int = None,
    mode: AnalysisModeEnum = Query(
        default=AnalysisModeEnum.LEGACY_V1,
        description="Analysis mode: legacy_v1, enhanced_v2"
    ),
    reasoning_level: str = Query(
        default="high",
        description="Reasoning level: medium, high, xhigh"
    ),
    raw_material_type: Optional[str] = Query(
        default="solid-block",
        description="Raw material: solid-block, forging, casting, plate, bar, tube"
    ),
    performance_profile: PerformanceProfile = Query(
        default=PerformanceProfile.MINIMAL,
        description="Performance: minimal (Cloud), pro (Local)"
    )
) -> Dict[str, Any]:
    """
    Teknik resim analiz endpoint'i

    Parameters:
    - file: Teknik resim (PDF, PNG, JPG)
    - max_tokens: Maksimum token (varsayilan: 100000)
    - mode: Analiz modu
    - reasoning_level: Reasoning seviyesi
    - raw_material_type: Ham malzeme tipi
    - performance_profile: Performans profili

    Returns:
    - Malzeme onerileri
    - Operasyon tavsiyeleri
    - Sure tahminleri
    - Karmasiklik analizi
    - Token kullanimi
    """

    # Rate limiting
    if not rate_limiter.is_allowed(f"ai_analyze:{client_ip}", 10, 3600):
        raise RateLimitExceeded("Saatlik 10 analiz limitini astiniz")

    # Dosya tipi kontrolu
    allowed_types = ["image/jpeg", "image/png", "application/pdf"]
    if file.content_type not in allowed_types:
        raise FileValidationError("Desteklenmeyen dosya tipi")

    # Analiz calistir (threadpool'da)
    analyzer = EnhancedAnalyzer()
    result = await run_in_threadpool(
        analyzer.analyze,
        file_bytes=contents,
        filename=file.filename,
        mode=mode.value,
        max_tokens=max_tokens,
        config=config,
        raw_material_type=raw_material_type
    )

    return result
```

## 8.2 Diger Endpoint'ler

```python
@router.post("/estimate-cost")
async def estimate_cost(
    analysis_result: Dict[str, Any],
    material_prices: Dict[str, float] = {},
    hourly_rate: float = 150.0
) -> Dict[str, Any]:
    """Maliyet tahmini (GPT-5-Mini ile)"""

@router.get("/health")
async def ai_health_check() -> Dict[str, str]:
    """AI servis saglik kontrolu"""

@router.get("/status")
async def check_ai_status() -> Dict[str, Any]:
    """OpenAI & Anthropic API durumu"""
```

---

# 9. VERI SEMA VE MODELLERI

## 9.1 Analiz Sonuc Semasi (TypeScript)

```typescript
// frontend/src/services/aiAnalysisService.ts

interface AIAnalysisResult {
  // Antet Bilgileri
  title_block: {
    material_specification: string | null;
    surface_treatment: string | null;
    special_notes: string | null;
    scale: string | null;
  };

  // Boyutlar
  dimensions: {
    length_mm: number | null;
    width_mm: number | null;
    height_mm: number | null;
    weight_estimate_kg: number | null;
    raw_material_type: string | null;
    notes: string;
  };

  // Geometri Karmasikligi
  geometry_complexity: {
    thin_walls: {
      exists: boolean;
      min_thickness_mm: number | null;
      risk_level: string;
    };
    hole_count: number;
    threaded_holes: {
      count: number;
      types: string[];
    };
    tight_tolerance_features: {
      count: number;
      examples: string[];
    };
    internal_corners: boolean;
    deep_pockets: boolean;
    symmetry: string;
  };

  // Malzeme Onerileri
  material_suggestions: Array<{
    material: string;
    reasoning: string;
    confidence: number;
  }>;

  // Operasyonlar
  operations: Array<{
    operation: string;
    machine_type: string;
    description: string;
    estimated_time_minutes: number;
    difficulty_factor: number;
    confidence: number;
  }>;

  // Yuzey Spesifikasyonlari
  surface_specifications: {
    roughness_requirements: string[];
    coating_required: boolean;
    coating_type: string | null;
    welding_points: {
      exists: boolean;
      count: number;
      type: string | null;
    };
  };

  // Kalite Kontrol
  quality_control: {
    measurement_difficulty: string;
    special_tools_needed: boolean;
    inspection_time_minutes: number;
  };

  // Maliyet Faktorleri
  cost_impact_factors: string[];

  // Uyarilar ve Oneriler
  warnings_and_recommendations: string[];

  // Genel Guven Skoru
  overall_confidence: number;

  // Analiz Notlari
  analysis_notes: string;

  // Token Kullanimi
  token_usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };

  // Hata Durumu
  error?: string;
  incomplete_warning?: string;

  // Strateji Bilgisi
  strategy_used?: string;
  total_attempts?: number;
}
```

## 9.2 Python JSON Semasi

```python
# Beklenen JSON Ciktisi
analysis_schema = {
    "title_block": {
        "part_name": "<parca adi>",
        "part_number": "<parca no>",
        "material_specification": "<DIN/AISI kodu>",
        "surface_treatment": "<kaplama turu>",
        "special_notes": "<ozel notlar>",
        "scale": "<olcek>"
    },
    "dimensions": {
        "length_mm": "<sayi>",
        "width_mm": "<sayi>",
        "height_mm": "<sayi>",
        "diameter_mm": "<ana cap>",
        "weight_estimate_kg": "<tahmini agirlik>",
        "raw_material_type": "<levha|cubuk|boru|dokum>",
        "key_tolerances": ["<H7 Ø30>", "<h6 Ø25>"],
        "geometric_tolerances": [
            {"type": "<Paralellik>", "value": "<0.02>", "datum": "<A>"}
        ],
        "surface_finish": ["<Ra 0.8>", "<Ra 3.2>"],
        "threads": [
            {"type": "<M8>", "count": "<adet>", "internal": "<true/false>"}
        ]
    },
    "geometry_complexity": {
        "part_type": "<somun|mil|flans|govde|plaka>",
        "thin_walls": {
            "exists": "<true/false>",
            "min_thickness_mm": "<sayi>",
            "risk_level": "<yok|dusuk|orta|yuksek>"
        },
        "hole_count": "<toplam delik>",
        "threaded_holes": {"count": "<sayi>", "types": ["<M6>", "<M8>"]},
        "tight_tolerance_features": {"count": "<sayi>", "examples": ["<H7>"]},
        "internal_corners": "<true/false>",
        "deep_pockets": "<true/false>",
        "symmetry": "<simetrik|asimetrik>",
        "complexity_level": "<dusuk|orta|yuksek>"
    },
    "material_suggestions": [
        {
            "material": "<DIN/AISI kodu>",
            "source": "<antet|geometri_analizi|muhendislik_onerisi>",
            "reasoning": "<gerekce>",
            "confidence": "<0-100>",
            "is_alternative": "<true/false>"
        }
    ],
    "operations": [
        {
            "operation": "<Tornalama|Frezeleme|Delme|Taslama>",
            "machine_type": "<CNC Torna|3-Eksen CNC|5-Eksen CNC>",
            "description": "<detayli aciklama>",
            "estimated_time_minutes": "<dakika>",
            "difficulty_factor": "<1.0-3.0>",
            "confidence": "<0-100>",
            "sequence": "<sira>"
        }
    ],
    "surface_specifications": {
        "roughness_requirements": ["<Ra 0.8>"],
        "coating_required": "<true/false>",
        "coating_type": "<Nikel|Krom|Anodize|Brunit>",
        "heat_treatment": "<Islah|Sertlestirme>",
        "welding_points": {"exists": "<true/false>", "count": "<sayi>"}
    },
    "quality_control": {
        "measurement_difficulty": "<kolay|orta|zor>",
        "special_tools_needed": "<true/false>",
        "required_tools": ["<CMM>", "<Profilometre>"],
        "inspection_time_minutes": "<dakika>"
    },
    "cost_impact_factors": ["<faktor 1>", "<faktor 2>"],
    "warnings_and_recommendations": ["<uyari 1>", "<oneri 2>"],
    "overall_confidence": "<0-100>",
    "analysis_notes": "<genel notlar>"
}
```

---

# 10. FRONTEND ENTEGRASYONU

## 10.1 API Istemci Fonksiyonu

```typescript
// frontend/src/services/aiAnalysisService.ts

export async function analyzeTechnicalDrawing(
  file: File,
  options?: {
    onProgress?: (message: string, progress: number) => void;
    maxTokens?: number;
    mode?: 'legacy_v1' | 'enhanced_v2';
    reasoningLevel?: 'medium' | 'high' | 'xhigh';
    rawMaterialType?: 'solid-block' | 'forging' | 'casting' | 'plate' | 'bar' | 'tube';
    performanceProfile?: 'minimal' | 'pro';
    signal?: AbortSignal;
  }
): Promise<AIAnalysisResult> {
  const {
    onProgress,
    maxTokens = 100000,
    mode = 'legacy_v1',
    reasoningLevel = 'high',
    rawMaterialType = 'solid-block',
    performanceProfile = 'minimal',
    signal
  } = options || {};

  // Dosya validasyonu
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Desteklenmeyen dosya tipi');
  }

  if (file.size > 25 * 1024 * 1024) {
    throw new Error('Dosya cok buyuk (max 25 MB)');
  }

  // Progress bildir
  onProgress?.('Dosya yukleniyor...', 15);

  // Form data olustur
  const formData = new FormData();
  formData.append('file', file);

  // Query parametreleri
  const params = new URLSearchParams({
    max_tokens: maxTokens.toString(),
    mode,
    reasoning_level: reasoningLevel,
    raw_material_type: rawMaterialType,
    performance_profile: performanceProfile
  });

  // API cagrisi
  const response = await fetch(`${API_BASE}/ai/analyze-drawing?${params}`, {
    method: 'POST',
    body: formData,
    signal
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return await response.json();
}
```

## 10.2 React Kullanim Ornegi

```tsx
// frontend/src/pages/AIGeometryAnalyzerPage.tsx

import { analyzeTechnicalDrawing, AIAnalysisResult } from '../services/aiAnalysisService';

function AIGeometryAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AIAnalysisResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    if (!file) return;

    setLoading(true);
    setResult(null);

    try {
      const analysis = await analyzeTechnicalDrawing(file, {
        onProgress: (message, pct) => {
          setStatus(message);
          setProgress(pct);
        },
        mode: 'enhanced_v2',
        reasoningLevel: 'high',
        rawMaterialType: 'solid-block'
      });

      setResult(analysis);
    } catch (error) {
      console.error('Analiz hatasi:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <button onClick={handleAnalyze} disabled={!file || loading}>
        Analiz Et
      </button>

      {loading && (
        <div>
          <progress value={progress} max={100} />
          <p>{status}</p>
        </div>
      )}

      {result && (
        <div>
          <h3>Malzeme: {result.title_block.material_specification}</h3>
          <h3>Guven: %{result.overall_confidence}</h3>

          <h4>Boyutlar:</h4>
          <p>{result.dimensions.length_mm} x {result.dimensions.width_mm} x {result.dimensions.height_mm} mm</p>

          <h4>Operasyonlar:</h4>
          <ul>
            {result.operations.map((op, i) => (
              <li key={i}>{op.operation} - {op.estimated_time_minutes} dk</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

# 11. KONFIGURASYONLAR

## 11.1 AnalysisConfig Sinifi

```python
# backend/app/services/analysis_config.py

@dataclass
class AnalysisConfig:
    # Temel Ayarlar
    mode: AnalysisMode = AnalysisMode.LEGACY_V1
    performance_profile: PerformanceProfile = PerformanceProfile.MINIMAL

    # Prompt Ayarlari
    prompt_style: PromptStyle = PromptStyle.BASIC
    include_few_shot_examples: bool = False
    few_shot_count: int = 3

    # Model Ayarlari
    primary_model: str = "gpt-5.2"
    secondary_model: str = "claude-sonnet-4-5-20250929"
    use_reasoning: bool = True
    reasoning_effort: str = "xhigh"  # xhigh | high | medium

    # Token Ayarlari
    max_tokens: int = 500000
    ocr_max_tokens: int = 50000
    analysis_max_tokens: int = 450000

    # Validation Ayarlari
    validation_level: ValidationLevel = ValidationLevel.BASIC
    enable_physics_check: bool = False
    enable_material_validation: bool = True

    # OCR Ayarlari
    enable_ocr_preextraction: bool = False
    ocr_engine: str = "tesseract"  # gpt_vision | paddleocr | tesseract | easyocr
    ocr_languages: list = ["tur", "eng", "deu"]

    # PDF Preprocessing
    pdf_dpi: int = 300  # 200 (minimal) | 300 (pro) | 400 (max)
    enable_contrast_enhancement: bool = True
    enable_rotation_fix: bool = True
    enable_region_detection: bool = True

    # Guvenlik
    fallback_to_legacy: bool = True
    max_retries: int = 2
```

## 11.2 Performans Profilleri

```python
def set_performance_profile(self, profile: PerformanceProfile):
    """Performans profiline gore ayarlari guncelle"""

    if profile == PerformanceProfile.MINIMAL:
        # Cloud/Demo icin optimize (dusuk RAM)
        self.pdf_dpi = 200
        self.enable_ocr_preextraction = False
        self.enable_contrast_enhancement = False
        self.enable_rotation_fix = False
        self.enable_region_detection = False
        self.reasoning_effort = "medium"

    elif profile == PerformanceProfile.PRO:
        # Local/Server icin optimize (yuksek kalite)
        self.pdf_dpi = 300
        self.enable_ocr_preextraction = True
        self.enable_contrast_enhancement = True
        self.enable_rotation_fix = True
        self.enable_region_detection = True
        self.reasoning_effort = "high"
```

## 11.3 Mod Konfigurasyon Fabrikaları

```python
@classmethod
def for_legacy(cls) -> "AnalysisConfig":
    """Legacy V1 - mevcut calisn sistem"""
    return cls(
        mode=AnalysisMode.LEGACY_V1,
        prompt_style=PromptStyle.BASIC,
        validation_level=ValidationLevel.NONE,
        enable_ocr_preextraction=False,
        fallback_to_legacy=False
    )

@classmethod
def for_enhanced(cls) -> "AnalysisConfig":
    """Enhanced V2 - iyilestirilmis sistem"""
    return cls(
        mode=AnalysisMode.ENHANCED_V2,
        prompt_style=PromptStyle.FEW_SHOT,
        include_few_shot_examples=True,
        few_shot_count=3,
        validation_level=ValidationLevel.STRICT,
        enable_physics_check=True,
        fallback_to_legacy=True
    )

@classmethod
def for_maximum_accuracy(cls) -> "AnalysisConfig":
    """Maksimum dogruluk"""
    return cls(
        mode=AnalysisMode.TWO_STAGE,
        prompt_style=PromptStyle.COMPREHENSIVE,
        include_few_shot_examples=True,
        enable_ocr_preextraction=True,
        pdf_dpi=400,
        validation_level=ValidationLevel.PHYSICS,
        max_tokens=150000
    )
```

## 11.4 Malzeme Veritabani

```python
MATERIAL_DATABASE = {
    # Celikler
    "AISI 4140": {"density": 7.85, "machinability": 0.65, "din": "42CrMo4", "type": "alasimli_celik"},
    "AISI 4340": {"density": 7.85, "machinability": 0.55, "din": "34CrNiMo6", "type": "alasimli_celik"},
    "C45": {"density": 7.85, "machinability": 0.70, "din": "1.0503", "type": "karbon_celik"},

    # Paslanmaz celikler
    "AISI 304": {"density": 8.00, "machinability": 0.45, "din": "1.4301", "type": "paslanmaz"},
    "AISI 316": {"density": 8.00, "machinability": 0.40, "din": "1.4401", "type": "paslanmaz"},

    # Aluminyumlar
    "AlMg3": {"density": 2.66, "machinability": 0.90, "din": "EN AW-5754", "type": "aluminyum"},
    "AlSi9Cu3": {"density": 2.75, "machinability": 0.85, "din": "EN AC-46000", "type": "aluminyum_dokum"},

    # Dokum demirler
    "GG25": {"density": 7.25, "machinability": 0.80, "din": "EN-GJL-250", "type": "dokum"},
    "GGG40": {"density": 7.10, "machinability": 0.75, "din": "EN-GJS-400-15", "type": "sfero_dokum"},
}
```

## 11.5 Operasyon Standartlari

```python
OPERATION_STANDARDS = {
    "Tornalama": {
        "machines": ["CNC Torna", "Konvansiyonel Torna"],
        "time_per_setup_min": 15,
        "typical_tolerance": "IT7-IT9",
        "surface_finish": "Ra 1.6 - Ra 6.3"
    },
    "Frezeleme": {
        "machines": ["3-Eksen CNC", "5-Eksen CNC", "Konvansiyonel Freze"],
        "time_per_setup_min": 20,
        "typical_tolerance": "IT7-IT10",
        "surface_finish": "Ra 1.6 - Ra 6.3"
    },
    "Taslama": {
        "machines": ["Silindirik Taslama", "Satih Taslama"],
        "time_per_setup_min": 30,
        "typical_tolerance": "IT5-IT7",
        "surface_finish": "Ra 0.2 - Ra 0.8"
    },
    "Tel Erozyon": {
        "machines": ["Tel Erozyon", "Wire EDM"],
        "time_per_mm_cut_min": 2,
        "typical_tolerance": "IT6-IT8",
        "surface_finish": "Ra 0.8 - Ra 3.2"
    }
}
```

---

# 12. ONERILER VE BEST PRACTICES

## 12.1 Prompt Muhendisligi Onerileri

1. **Rol Tanimla**: "Sen 30 yillik deneyimli bir CNC imalat muhendisisin"
2. **Oncelikleri Belirt**: Numarali liste ile net talimatlar
3. **Guven Seviyeleri**: 90+, 70-89, 50-69, <50 icin farkli davranis
4. **Few-Shot Ornekler**: 2-3 ornek analiz sonucu ekle
5. **JSON Semasi Ver**: Beklenen cikti formatini goster
6. **Dilbilgisi Kurallari**: Turkce teknik terminoloji kurallari
7. **Hata Yonetimi**: "Bilmiyorsan null dondur, uydurma!"

## 12.2 PDF Isleme Onerileri

1. **DPI Secimi**:
   - Cloud/Demo: 200 DPI (dusuk RAM)
   - Production: 300 DPI (dengeli)
   - Maksimum: 400 DPI (en yuksek kalite)

2. **Onisleme**:
   - Rotasyon duzeltme (180 derece CAD cizimleri)
   - Kontrast iyilestirme (CLAHE)
   - Bolge tespiti (antet, ana gorunum)

3. **Multi-Modal Girdi**:
   - PDF + Yuksek cozunurluklu gorseller birlikte gonder
   - PDF metin katmani ayrica cikar ve prompt'a ekle

## 12.3 Token Yonetimi

1. **Token Limitleri**:
   - Varsayilan: 100,000
   - Maksimum: 200,000
   - Context window: 500,000 (GPT-5.2)

2. **Token Dagilimi (Two-Stage)**:
   - OCR: 50,000
   - Analiz: 450,000

3. **Token Izleme**:
   - Her yanit sonrasi token kullanimi kaydet
   - Maliyet tahminleri icin kullan

## 12.4 Hata Yonetimi

1. **Fallback Stratejisi**:
   - xhigh -> high -> medium -> legacy
   - Her seviyede timeout ve retry

2. **Rate Limit**:
   - IP basina saatlik 10 istek
   - Kota asimi durumunda kullanici uyarisi

3. **Validation**:
   - JSON parse hatalari icin onarim dene
   - Eksik alanlar icin varsayilan degerler

## 12.5 Guvenlik Onerileri

1. **Dosya Kontrolu**:
   - Tip: PDF, PNG, JPG
   - Boyut: Max 25 MB
   - Isim sanitizasyonu

2. **API Key Yonetimi**:
   - Environment variable kullan
   - Log'larda maskele

3. **KVKK/GDPR**:
   - Kullanici onayı al
   - Veri saklama politikası uygula

---

# EK: HIZLI BASLANGIC KODU

## Minimal Entegrasyon Ornegi

```python
from openai import OpenAI
import fitz
import base64
import json

def analyze_technical_drawing(pdf_path: str, api_key: str) -> dict:
    """Minimal teknik resim analizi"""

    # 1. OpenAI client
    client = OpenAI(api_key=api_key)

    # 2. PDF'i oku
    with open(pdf_path, 'rb') as f:
        pdf_bytes = f.read()

    # 3. PDF'i goruntiye cevir
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    page = doc[0]
    pix = page.get_pixmap(matrix=fitz.Matrix(4, 4))  # 300 DPI
    image_bytes = pix.tobytes("png")
    image_b64 = base64.b64encode(image_bytes).decode()
    doc.close()

    # 4. Dosya yukle
    import io
    file_upload = client.files.create(
        file=("drawing.pdf", io.BytesIO(pdf_bytes), "application/pdf"),
        purpose="user_data"
    )

    # 5. Analiz prompt'u
    prompt = """Bu teknik resmi analiz et ve asagidaki JSON formatinda dondur:
    {
        "material": "malzeme",
        "dimensions": {"length": 0, "width": 0, "height": 0},
        "operations": [{"name": "operasyon", "time_minutes": 0}],
        "confidence": 0
    }
    """

    # 6. API cagrisi
    response = client.responses.create(
        model="gpt-5.2",
        input=[{
            "type": "message",
            "role": "user",
            "content": [
                {"type": "input_text", "text": prompt},
                {"type": "input_file", "file_id": file_upload.id},
                {"type": "input_image", "image_url": f"data:image/png;base64,{image_b64}"}
            ]
        }],
        reasoning={"effort": "high"},
        max_output_tokens=50000
    )

    # 7. JSON parse
    output_text = response.output_text
    json_start = output_text.find('{')
    json_end = output_text.rfind('}') + 1
    result = json.loads(output_text[json_start:json_end])

    # 8. Temizlik
    client.files.delete(file_id=file_upload.id)

    return result

# Kullanim
result = analyze_technical_drawing("ornek.pdf", "sk-xxx")
print(json.dumps(result, indent=2, ensure_ascii=False))
```

---

**Bu dokuman MQ_V3 projesindeki AI 2D Analiz sisteminin tam teknik kilavuzudur.**

**Versiyon:** 3.0
**Son Guncelleme:** 2026-01-26
**Yazar:** Claude AI (Anthropic)
