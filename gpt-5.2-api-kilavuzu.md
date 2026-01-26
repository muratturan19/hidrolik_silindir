# GPT-5.2 API Kapsamlı Kullanım Kılavuzu

**Hazırlanma Tarihi:** Ocak 2026  
**Hedef Kullanıcı:** Windows Kullanıcıları, Türkçe Konuşanlar  
**Kodlama:** UTF-8

---

## İçindekiler

1. [GPT-5.2 Modelleri Hakkında](#1-gpt-52-modelleri-hakkında)
2. [API Key Edinme ve Kurulum](#2-api-key-edinme-ve-kurulum)
3. [Hangi API'yi Kullanmalıyım?](#3-hangi-apiyi-kullanmalıyım)
4. [Chat Completions API Kullanımı](#4-chat-completions-api-kullanımı)
5. [Responses API Kullanımı](#5-responses-api-kullanımı)
6. [Resim Yükleme ve Vision](#6-resim-yükleme-ve-vision)
7. [PDF Dosyaları Yükleme](#7-pdf-dosyaları-yükleme)
8. [Parametre Detayları](#8-parametre-detayları)
9. [Function Calling (Fonksiyon Çağırma)](#9-function-calling-fonksiyon-çağırma)
10. [Structured Outputs (Yapılandırılmış Çıktılar)](#10-structured-outputs-yapılandırılmış-çıktılar)
11. [Streaming (Akış)](#11-streaming-akış)
12. [Hata Yönetimi](#12-hata-yönetimi)
13. [Best Practices (En İyi Uygulamalar)](#13-best-practices-en-iyi-uygulamalar)
14. [Fiyatlandırma](#14-fiyatlandırma)

---

## 1. GPT-5.2 Modelleri Hakkında

### Mevcut Modeller

OpenAI'nin GPT-5.2 model ailesi şu modelleri içerir:

| Model Adı | Model String | Açıklama |
|-----------|--------------|----------|
| **GPT-5.2** | `gpt-5.2` | En karmaşık görevler için flagship model |
| **GPT-5.2 Chat** | `gpt-5.2-chat-latest` | ChatGPT'de kullanılan sohbet optimizeli model |
| **GPT-5.2 Pro** | `gpt-5.2-pro` | Daha fazla hesaplama gücü kullanarak en kaliteli cevaplar |
| **GPT-5.2 Codex** | `gpt-5.2-codex` | Kodlama görevleri için optimize edilmiş |
| **GPT-5 Mini** | `gpt-5-mini` | Daha küçük, hızlı ve ekonomik model |

### Önemli Özellikler

- ✅ **Reasoning (Muhakeme):** Model cevap üretmeden önce adım adım düşünür
- ✅ **Vision (Görme):** Resim ve PDF analizi yapabilir
- ✅ **Function Calling:** Harici araçları çağırabilir
- ✅ **Structured Outputs:** Kesin JSON şeması uyumlu çıktı
- ✅ **Uzun Bağlam:** 128K - 256K token context window
- ✅ **Bilgi Kesim Tarihi:** Ağustos 2025

### ⚠️ ÖNEMLİ FARKLAR

GPT-5 serisi **reasoning model** olduğu için bazı parametreler desteklenmez:

- ❌ `temperature` parametresi (sadece default değer 1.0 desteklenir veya hiç kullanılmaz)
- ❌ `top_p` parametresi
- ❌ `presence_penalty` ve `frequency_penalty`
- ✅ Bunların yerine `reasoning_effort` parametresi kullanılır

---

## 2. API Key Edinme ve Kurulum

### Adım 1: OpenAI Hesabı Oluşturma

1. https://platform.openai.com adresine gidin
2. "Sign Up" ile hesap oluşturun
3. Ödeme yöntemi ekleyin (kredi kartı gerekli)

### Adım 2: API Key Oluşturma

1. https://platform.openai.com/api-keys adresine gidin
2. "Create new secret key" butonuna tıklayın
3. Key'i güvenli bir yere kaydedin (bir daha gösterilmez!)

### Adım 3: Python Kurulumu (Windows)

```bash
# Python 3.8+ gereklidir
pip install --upgrade openai

# UTF-8 uyumluluk için
pip install python-dotenv
```

### Adım 4: API Key'i Ortam Değişkenine Ekleme

**Windows PowerShell:**
```powershell
$env:OPENAI_API_KEY = "sk-proj-xxxxxxxxxxxxx"
```

**Windows CMD:**
```cmd
set OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

**Kalıcı olarak (.env dosyası ile):**
```python
# .env dosyası oluşturun (proje klasöründe)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxx
```

```python
# Python kodunuzda
from dotenv import load_dotenv
import os

load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
```

---

## 3. Hangi API'yi Kullanmalıyım?

OpenAI'nin iki ana API endpoint'i var:

### Chat Completions API (`/v1/chat/completions`)
- ✅ Daha yaygın kullanılan, eski API
- ✅ Çoğu örnekte bu kullanılır
- ✅ Basit chat görevleri için yeterli
- ❌ PDF desteği sınırlı

### Responses API (`/v1/responses`) - **YENİ ve ÖNERİLEN**
- ✅ GPT-5.2 için optimize edilmiş
- ✅ Multimodal (metin, resim, PDF, audio)
- ✅ Daha esnek tool calling
- ✅ Conversation management
- ✅ GPT-5.2'nin tüm özelliklerini destekler

> **Öneri:** Yeni projeler için **Responses API** kullanın. GPT-5.2'nin tüm özelliklerinden faydalanabilirsiniz.

---

## 4. Chat Completions API Kullanımı

### Temel Kullanım

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()  # API key otomatik olarak env'den alınır

response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {"role": "system", "content": "Sen yardımcı bir asistansın."},
        {"role": "user", "content": "Merhaba, nasılsın?"}
    ]
)

print(response.choices[0].message.content)
```

### Detaylı Örnek (Tüm Parametrelerle)

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

try:
    response = client.chat.completions.create(
        # MODEL SEÇİMİ
        model="gpt-5.2",  # veya "gpt-5.2-chat-latest"
        
        # MESAJLAR (conversation history)
        messages=[
            {
                "role": "system", 
                "content": "Sen bir Python uzmanısın."
            },
            {
                "role": "user", 
                "content": "Bubble sort algoritmasını açıkla."
            }
        ],
        
        # TOKEN LİMİTİ
        max_completion_tokens=1000,  # Maksimum üretilecek token sayısı
        
        # REASONING EFFORT (GPT-5.2'ye özel!)
        reasoning={
            "effort": "medium"  # none, minimal, low, medium, high, xhigh
        },
        
        # VERBOSİTY (cevap uzunluğu/detay seviyesi)
        verbosity="medium",  # low, medium, high
        
        # SEED (tekrarlanabilir sonuçlar için)
        seed=42,
        
        # METADATA
        metadata={
            "user_id": "murat_12345",
            "session_id": "20260126_001"
        }
    )
    
    # CEVABI YAZDIRMA (UTF-8 güvenli)
    print(response.choices[0].message.content)
    
    # TOKEN KULLANIMI
    print(f"\nToken Kullanımı:")
    print(f"  Prompt tokens: {response.usage.prompt_tokens}")
    print(f"  Completion tokens: {response.usage.completion_tokens}")
    if hasattr(response.usage, 'completion_tokens_details'):
        print(f"  Reasoning tokens: {response.usage.completion_tokens_details.reasoning_tokens}")
    print(f"  Toplam: {response.usage.total_tokens}")
    
except Exception as e:
    print(f"Hata oluştu: {e}")
```

---

## 5. Responses API Kullanımı

Responses API, GPT-5.2'nin tüm özelliklerini destekleyen yeni API'dir.

### Temel Kullanım

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5.2",
    input="Python'da liste ve tuple arasındaki fark nedir?"
)

# Çıktıyı al
print(response.output_text)
```

### Detaylı Örnek

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5.2",
    
    # INPUT (mesaj listesi)
    input=[
        {
            "role": "system",
            "content": "Sen bir Python eğitmenisin."
        },
        {
            "role": "user",
            "content": "List comprehension nedir? Örnek ver."
        }
    ],
    
    # INSTRUCTIONS (sistem talimatları)
    instructions="Açıklamalarını Türkçe yap, kod örneklerini İngilizce yaz.",
    
    # REASONING EFFORT
    reasoning={
        "effort": "medium"
    },
    
    # VERBOSITY
    verbosity="medium",
    
    # MAX OUTPUT TOKENS
    max_output_tokens=1500
)

# Çıktıyı al
print(response.output_text)

# Detaylı bilgi
print(f"\nModel: {response.model}")
print(f"Created: {response.created_at}")
```

---

## 6. Resim Yükleme ve Vision

GPT-5.2 resimleri analiz edebilir. Üç yöntem vardır:

### Yöntem 1: URL ile Resim Gönderme

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Bu resimdeki nesneleri listele."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg",
                        "detail": "high"  # "low" veya "high"
                    }
                }
            ]
        }
    ]
)

print(response.choices[0].message.content)
```

### Yöntem 2: Base64 ile Resim Gönderme

```python
# -*- coding: utf-8 -*-
import base64
from openai import OpenAI

def encode_image(image_path):
    """Resmi base64'e çevir"""
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

client = OpenAI()

# Resmi encode et
base64_image = encode_image("resim.jpg")

response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Bu resimdeki metni oku (OCR)."
                },
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{base64_image}",
                        "detail": "high"
                    }
                }
            ]
        }
    ]
)

print(response.choices[0].message.content)
```

### Yöntem 3: File Upload (Responses API)

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

# Önce dosyayı upload et
with open("resim.jpg", "rb") as file:
    uploaded_file = client.files.create(
        file=file,
        purpose="vision"
    )

# Sonra response oluştur
response = client.responses.create(
    model="gpt-5.2",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": "Bu görseldeki bilgileri analiz et."
                },
                {
                    "type": "input_image",
                    "file_id": uploaded_file.id
                }
            ]
        }
    ]
)

print(response.output_text)
```

### Detail Parametresi

- **`"low"`**: Düşük çözünürlük, daha hızlı, daha az token
- **`"high"`**: Yüksek çözünürlük, daha yavaş, daha fazla token (detaylı analiz için)

---

## 7. PDF Dosyaları Yükleme

GPT-5.2 PDF dosyalarını doğrudan işleyebilir (hem metin hem görseller).

### Yöntem 1: URL ile PDF

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

response = client.responses.create(
    model="gpt-5.2",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": "Bu PDF'in içeriğini özetle."
                },
                {
                    "type": "input_file",
                    "url": "https://example.com/dokuman.pdf"
                }
            ]
        }
    ]
)

print(response.output_text)
```

### Yöntem 2: File Upload ile PDF

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

# PDF'i upload et
with open("dokuman.pdf", "rb") as file:
    uploaded_file = client.files.create(
        file=file,
        purpose="user_data"
    )

# Analiz et
response = client.responses.create(
    model="gpt-5.2",
    input=[
        {
            "role": "user",
            "content": [
                {
                    "type": "input_text",
                    "text": "Bu PDF'teki ana konuları listele."
                },
                {
                    "type": "input_file",
                    "file_id": uploaded_file.id
                }
            ]
        }
    ]
)

print(response.output_text)
```

### Yöntem 3: Base64 ile PDF (Chat Completions)

```python
# -*- coding: utf-8 -*-
import base64
from openai import OpenAI

def encode_pdf(pdf_path):
    """PDF'i base64'e çevir"""
    with open(pdf_path, "rb") as pdf_file:
        return base64.b64encode(pdf_file.read()).decode('utf-8')

client = OpenAI()

base64_pdf = encode_pdf("dokuman.pdf")

response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "text",
                    "text": "Bu PDF'teki tabloları çıkar ve analiz et."
                },
                {
                    "type": "image_url",  # PDF de image_url olarak gönderilir
                    "image_url": {
                        "url": f"data:application/pdf;base64,{base64_pdf}"
                    }
                }
            ]
        }
    ]
)

print(response.choices[0].message.content)
```

### PDF Limitleri

- ⚠️ **Maksimum sayfa:** 100 sayfa
- ⚠️ **Maksimum boyut:** 32MB (tüm dosyalar toplamı)
- ⚠️ **Sadece vision modellerde:** GPT-5.2, GPT-4o, GPT-4o-mini

---

## 8. Parametre Detayları

### 8.1. Model Seçimi

```python
model="gpt-5.2"  # veya gpt-5.2-chat-latest, gpt-5.2-pro, gpt-5-mini
```

### 8.2. Reasoning Effort (Muhakeme Seviyesi)

**GPT-5 serisi için en önemli parametre!** Model ne kadar düşünecek?

```python
reasoning={
    "effort": "medium"  # Seçenekler aşağıda
}
```

**Değerler:**
- `"none"`: Hiç reasoning yapmaz (en hızlı, GPT-5.1 default)
- `"minimal"`: Çok az reasoning (hızlı cevaplar için)
- `"low"`: Düşük seviye reasoning
- `"medium"`: Orta seviye (GPT-5.2 default, dengeli)
- `"high"`: Yüksek seviye (karmaşık problemler için)
- `"xhigh"`: Çok yüksek (en kaliteli cevaplar, GPT-5.2-pro için)

**Ne zaman hangisi?**
- Basit sohbet/chat → `minimal` veya `low`
- Genel kullanım → `medium` (default)
- Karmaşık analiz/kod → `high`
- En kaliteli çıktı → `xhigh` (GPT-5.2-pro ile)

**Örnek:**
```python
# Hızlı cevap istiyorsanız
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[...],
    reasoning={"effort": "minimal"}
)

# Karmaşık matematik problemi çözümü
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[...],
    reasoning={"effort": "high"}
)
```

### 8.3. Verbosity (Ayrıntı Seviyesi)

Cevabın ne kadar uzun/detaylı olacağını kontrol eder.

```python
verbosity="medium"  # low, medium, high
```

**Değerler:**
- `"low"`: Kısa, özet cevaplar (SQL sorgusu gibi basit kod için)
- `"medium"`: Dengeli (default, çoğu durum için ideal)
- `"high"`: Uzun, detaylı açıklamalar (dokümantasyon, eğitim için)

**Örnek:**
```python
# Kısa cevap
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {"role": "user", "content": "Python'da liste nasıl oluşturulur?"}
    ],
    verbosity="low"
)

# Detaylı açıklama
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {"role": "user", "content": "Makine öğrenimi nedir?"}
    ],
    verbosity="high"
)
```

### 8.4. Max Tokens

**Chat Completions API:**
```python
max_completion_tokens=1000  # Maksimum üretilecek token
```

**Responses API:**
```python
max_output_tokens=1500
```

**Not:** 
- Reasoning tokens bu limite dahil değildir
- Context window: 128K-256K token (model'e göre)

### 8.5. Temperature

⚠️ **UYARI:** GPT-5 serisi temperature'ı desteklemez!

```python
# ❌ YANLIŞ - Hata verir
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[...],
    temperature=0.7  # Desteklenmez!
)

# ✅ DOĞRU - Temperature kullanma, reasoning_effort kullan
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[...],
    reasoning={"effort": "medium"}
)
```

Eğer temperature desteği gerekiyorsa GPT-4.1 veya GPT-4o kullanın.

### 8.6. Seed (Tekrarlanabilirlik)

Aynı input için aynı çıktıyı almak için:

```python
seed=42  # Herhangi bir tam sayı
```

**Not:** %100 garanti değil, "best effort" basis.

### 8.7. Metadata

İstatistik ve tracking için:

```python
metadata={
    "user_id": "murat_001",
    "session_id": "20260126",
    "environment": "production"
}
```

---

## 9. Function Calling (Fonksiyon Çağırma)

Model harici araçları/fonksiyonları çağırabilir.

### Basit Örnek

```python
# -*- coding: utf-8 -*-
import json
from openai import OpenAI

client = OpenAI()

# 1. Fonksiyonları tanımla
tools = [
    {
        "type": "function",
        "function": {
            "name": "hava_durumu_getir",
            "description": "Belirtilen şehir için hava durumu bilgisi getirir",
            "strict": True,  # Kesin şema uyumluluğu için
            "parameters": {
                "type": "object",
                "properties": {
                    "sehir": {
                        "type": "string",
                        "description": "Şehir adı, örn: İstanbul, Ankara"
                    },
                    "birim": {
                        "type": "string",
                        "enum": ["celsius", "fahrenheit"],
                        "description": "Sıcaklık birimi"
                    }
                },
                "required": ["sehir"],
                "additionalProperties": False
            }
        }
    }
]

# 2. İlk API çağrısı
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {"role": "user", "content": "İstanbul'un hava durumu nasıl?"}
    ],
    tools=tools,
    tool_choice="auto"  # Model gerekirse fonksiyonu çağırır
)

# 3. Model fonksiyon çağırdı mı kontrol et
message = response.choices[0].message

if message.tool_calls:
    # 4. Fonksiyon çağrısını işle
    for tool_call in message.tool_calls:
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)
        
        print(f"Çağrılan fonksiyon: {function_name}")
        print(f"Parametreler: {arguments}")
        
        # 5. Gerçek fonksiyonu çalıştır (sizin kodunuz)
        if function_name == "hava_durumu_getir":
            # Örnek: Gerçek API çağrısı yapabilirsiniz
            sonuc = {
                "sehir": arguments["sehir"],
                "sicaklik": 18,
                "durum": "Parçalı bulutlu"
            }
        
        # 6. Sonucu model'e geri gönder
        messages = [
            {"role": "user", "content": "İstanbul'un hava durumu nasıl?"},
            message,  # Model'in cevabı
            {
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(sonuc)
            }
        ]
        
        # 7. Final cevabı al
        final_response = client.chat.completions.create(
            model="gpt-5.2",
            messages=messages
        )
        
        print(f"\nFinal Cevap:\n{final_response.choices[0].message.content}")
```

### Responses API ile Function Calling

```python
# -*- coding: utf-8 -*-
import json
from openai import OpenAI

client = OpenAI()

tools = [
    {
        "type": "function",
        "function": {
            "name": "veritabani_sorgula",
            "description": "SQL veritabanını sorgular",
            "strict": True,
            "parameters": {
                "type": "object",
                "properties": {
                    "sorgu": {
                        "type": "string",
                        "description": "SQL sorgusu"
                    }
                },
                "required": ["sorgu"],
                "additionalProperties": False
            }
        }
    }
]

response = client.responses.create(
    model="gpt-5.2",
    input="2024 yılındaki toplam satışları göster",
    tools=tools
)

# Tool call kontrolü
for item in response.output:
    if item.type == "function_call":
        print(f"Fonksiyon: {item.name}")
        print(f"Argümanlar: {item.arguments}")
```

### Tool Choice Parametresi

```python
# Otomatik: Model gerektiğinde çağırır
tool_choice="auto"

# Hiç çağırma
tool_choice="none"

# Mutlaka çağır
tool_choice="required"

# Belirli bir fonksiyonu çağır
tool_choice={
    "type": "function",
    "function": {"name": "hava_durumu_getir"}
}
```

---

## 10. Structured Outputs (Yapılandırılmış Çıktılar)

Model'in çıktısını kesin bir JSON şemasına uygun şekilde almak için.

### Yöntem 1: Pydantic ile (Python)

```python
# -*- coding: utf-8 -*-
from openai import OpenAI
from pydantic import BaseModel
from typing import List

class Urun(BaseModel):
    """Ürün bilgisi"""
    ad: str
    fiyat: float
    stok: int
    kategoriler: List[str]

class UrunListesi(BaseModel):
    """Ürün listesi"""
    urunler: List[Urun]
    toplam_urun: int

client = OpenAI()

# Pydantic model'i JSON schema'ya çevir
schema = UrunListesi.model_json_schema()

response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {
            "role": "user",
            "content": "Bir elektronik mağazasında 3 ürün oluştur."
        }
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "urun_listesi",
            "strict": True,
            "schema": schema
        }
    }
)

# JSON'u parse et
import json
sonuc = json.loads(response.choices[0].message.content)

print(f"Toplam ürün: {sonuc['toplam_urun']}")
for urun in sonuc['urunler']:
    print(f"- {urun['ad']}: {urun['fiyat']} TL")
```

### Yöntem 2: Manuel JSON Schema

```python
# -*- coding: utf-8 -*-
from openai import OpenAI
import json

client = OpenAI()

schema = {
    "type": "object",
    "properties": {
        "isim": {
            "type": "string",
            "description": "Kişinin adı"
        },
        "yas": {
            "type": "integer",
            "minimum": 0,
            "maximum": 120
        },
        "meslek": {
            "type": "string"
        },
        "hobiler": {
            "type": "array",
            "items": {"type": "string"}
        }
    },
    "required": ["isim", "yas"],
    "additionalProperties": False
}

response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {"role": "user", "content": "Murat, 45 yaşında, mühendis"}
    ],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "kisi_bilgisi",
            "strict": True,
            "schema": schema
        }
    }
)

kisi = json.loads(response.choices[0].message.content)
print(kisi)
```

### Responses API ile Structured Output

```python
# -*- coding: utf-8 -*-
from openai import OpenAI
from pydantic import BaseModel

class Ozet(BaseModel):
    baslik: str
    ana_noktalar: list[str]
    sonuc: str

client = OpenAI()

response = client.responses.parse(
    model="gpt-5.2",
    input=[
        {"role": "user", "content": "Bu makaleyi özetle: [metin buraya]"}
    ],
    text_format=Ozet
)

# Doğrudan Pydantic objesi olarak al
ozet = response.output_parsed
print(f"Başlık: {ozet.baslik}")
print(f"Ana Noktalar: {ozet.ana_noktalar}")
```

---

## 11. Streaming (Akış)

Cevabı parça parça almak için (real-time uygulamalar):

### Chat Completions Streaming

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

stream = client.chat.completions.create(
    model="gpt-5.2",
    messages=[
        {"role": "user", "content": "Python hakkında kısa bir şiir yaz."}
    ],
    stream=True
)

print("Cevap geliyor:\n")
for chunk in stream:
    if chunk.choices[0].delta.content is not None:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

### Responses API Streaming

```python
# -*- coding: utf-8 -*-
from openai import OpenAI

client = OpenAI()

with client.responses.stream(
    model="gpt-5.2",
    input="Türkiye'nin başkenti neresidir ve neden?"
) as stream:
    for event in stream:
        if event.type == "response.output_text.delta":
            print(event.delta, end="", flush=True)
        elif event.type == "response.done":
            print("\n\n[Tamamlandı]")
```

### Structured Output Streaming

```python
# -*- coding: utf-8 -*-
from openai import OpenAI
from pydantic import BaseModel

class VeriModeli(BaseModel):
    kategori: str
    etiketler: list[str]

client = OpenAI()

with client.responses.stream(
    model="gpt-5.2",
    input="Bu metni kategorize et: [metin]",
    text_format=VeriModeli
) as stream:
    for event in stream:
        if event.type == "response.output_text.delta":
            print(event.delta, end="")
```

---

## 12. Hata Yönetimi

### Yaygın Hatalar ve Çözümleri

```python
# -*- coding: utf-8 -*-
from openai import OpenAI, OpenAIError, APIError, RateLimitError, APIConnectionError

client = OpenAI()

try:
    response = client.chat.completions.create(
        model="gpt-5.2",
        messages=[{"role": "user", "content": "Merhaba"}]
    )
    
except RateLimitError as e:
    print(f"Rate limit aşıldı: {e}")
    print("Lütfen biraz bekleyip tekrar deneyin.")
    
except APIConnectionError as e:
    print(f"API bağlantı hatası: {e}")
    print("İnternet bağlantınızı kontrol edin.")
    
except APIError as e:
    print(f"API hatası (status {e.status_code}): {e}")
    
except OpenAIError as e:
    print(f"OpenAI hatası: {e}")
    
except Exception as e:
    print(f"Beklenmeyen hata: {e}")
```

### Retry Mekanizması

```python
# -*- coding: utf-8 -*-
import time
from openai import OpenAI, RateLimitError

def api_cagir_retry(client, max_retry=3):
    """Hata durumunda yeniden dene"""
    for i in range(max_retry):
        try:
            response = client.chat.completions.create(
                model="gpt-5.2",
                messages=[{"role": "user", "content": "Test"}]
            )
            return response
            
        except RateLimitError:
            if i < max_retry - 1:
                wait_time = (2 ** i)  # Exponential backoff
                print(f"Rate limit! {wait_time} saniye bekleniyor...")
                time.sleep(wait_time)
            else:
                raise
                
        except Exception as e:
            print(f"Hata: {e}")
            raise

client = OpenAI()
response = api_cagir_retry(client)
```

---

## 13. Best Practices (En İyi Uygulamalar)

### 1. API Key Güvenliği

```python
# ✅ DOĞRU - Environment variable kullan
import os
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ❌ YANLIŞ - Kod içine yazmayın!
client = OpenAI(api_key="sk-proj-xxxx")  # GİTHUB'a pushlarsanız tehlikeli!
```

### 2. UTF-8 Kodlama (Windows)

```python
# -*- coding: utf-8 -*-
# Dosyanın en üstüne ekleyin!

# Dosya okurken
with open("dosya.txt", "r", encoding="utf-8") as f:
    icerik = f.read()

# Dosya yazarken
with open("cikti.txt", "w", encoding="utf-8") as f:
    f.write("Türkçe karakterler: ğüşıöçĞÜŞİÖÇ")
```

### 3. Token Limiti Kontrolü

```python
import tiktoken

def token_say(text, model="gpt-5.2"):
    """Metindeki token sayısını hesapla"""
    encoding = tiktoken.encoding_for_model(model)
    return len(encoding.encode(text))

metin = "Çok uzun bir metin..."
token_sayisi = token_say(metin)

if token_sayisi > 100000:
    print(f"Uyarı: Metin çok uzun ({token_sayisi} token)")
```

### 4. Maliyet Optimizasyonu

```python
# Düşük reasoning için daha ucuz
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[...],
    reasoning={"effort": "minimal"},  # Daha az reasoning token
    verbosity="low",  # Daha az output token
    max_completion_tokens=500  # Limit koy
)

# Karmaşık görevler için yüksek
response = client.chat.completions.create(
    model="gpt-5.2",
    messages=[...],
    reasoning={"effort": "high"},
    verbosity="high"
)
```

### 5. Context Management

```python
# Uzun konuşmalarda eski mesajları kaldır
def context_yonet(mesajlar, max_token=100000):
    """Context'i yönet, eski mesajları çıkar"""
    while token_say(str(mesajlar)) > max_token:
        # En eski user/assistant mesajını çıkar (system mesajı kalsın)
        if len(mesajlar) > 1 and mesajlar[1]["role"] != "system":
            mesajlar.pop(1)
        else:
            break
    return mesajlar
```

### 6. Prompt Engineering

```python
# ✅ DOĞRU - Net, spesifik talimat
messages = [
    {
        "role": "system",
        "content": """Sen bir Python kod asistanısın.
Görevler:
1. Kod örnekleri ver (PEP 8 uyumlu)
2. Türkçe açıkla
3. Potansiyel hataları belirt"""
    },
    {
        "role": "user",
        "content": "Dosya okuma örneği ver (encoding: utf-8)"
    }
]

# ❌ YANLIŞ - Belirsiz
messages = [
    {"role": "user", "content": "Python kod ver"}
]
```

---

## 14. Fiyatlandırma

### GPT-5.2 Fiyatları (Ocak 2026)

| Model | Input (1M token) | Output (1M token) | Cached Input |
|-------|------------------|-------------------|--------------|
| **gpt-5.2** | $1.75 | $14.00 | 90% indirim |
| **gpt-5.2-chat-latest** | $1.75 | $14.00 | 90% indirim |
| **gpt-5.2-pro** | Daha yüksek | Daha yüksek | - |
| **gpt-5-mini** | Daha düşük | Daha düşük | - |

### Reasoning Tokens

- Reasoning tokens **completion_tokens** içinde sayılır
- Görünmez ama ücretlendirilir
- `reasoning_effort: high` → Daha fazla reasoning token → Daha yüksek maliyet

### Maliyet Hesaplama Örneği

```python
# -*- coding: utf-8 -*-
def maliyet_hesapla(prompt_tokens, completion_tokens, reasoning_tokens=0):
    """GPT-5.2 maliyet hesapla (USD)"""
    input_price = 1.75 / 1_000_000  # $1.75 per 1M tokens
    output_price = 14.00 / 1_000_000  # $14.00 per 1M tokens
    
    input_cost = prompt_tokens * input_price
    output_cost = (completion_tokens + reasoning_tokens) * output_price
    
    total = input_cost + output_cost
    
    return {
        "input_cost": input_cost,
        "output_cost": output_cost,
        "total_usd": total,
        "total_try": total * 35  # Yaklaşık kur (değişir!)
    }

# Örnek kullanım
response = client.chat.completions.create(...)
usage = response.usage

maliyet = maliyet_hesapla(
    prompt_tokens=usage.prompt_tokens,
    completion_tokens=usage.completion_tokens,
    reasoning_tokens=getattr(usage.completion_tokens_details, 'reasoning_tokens', 0)
)

print(f"Maliyet: ${maliyet['total_usd']:.6f} (~{maliyet['total_try']:.4f} TL)")
```

---

## Ek Kaynaklar

### Resmi Dokümantasyon
- https://platform.openai.com/docs/guides/latest-model
- https://platform.openai.com/docs/api-reference/chat
- https://platform.openai.com/docs/guides/vision
- https://platform.openai.com/docs/guides/function-calling

### Community
- https://community.openai.com
- https://cookbook.openai.com

### Rate Limits
- https://platform.openai.com/docs/guides/rate-limits

---

## Özet Kontrol Listesi

✅ API key'i ortam değişkeninde saklayın  
✅ UTF-8 encoding kullanın (Windows)  
✅ GPT-5.2 için `reasoning_effort` kullanın, `temperature` DEĞİL  
✅ Reasoning effort'u görevinize göre ayarlayın (minimal → xhigh)  
✅ PDF ve resim için vision-capable model seçin  
✅ Function calling için `strict: true` kullanın  
✅ Structured outputs için Pydantic kullanın  
✅ Token limitlerini kontrol edin  
✅ Hata yönetimi ve retry mekanizması ekleyin  
✅ Maliyeti optimize edin (verbosity, reasoning effort)  

---

**Son Güncelleme:** 26 Ocak 2026  
**Hazırlayan:** Claude (Anthropic)  
**Hedef:** Windows + Python + UTF-8 + Türkçe Kullanıcılar

Bu kılavuz internetten yapılan kapsamlı araştırmaya dayanarak hazırlanmıştır. 
Lütfen kullanmadan önce resmi OpenAI dokümantasyonunu kontrol edin.
