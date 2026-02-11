# Hidrolik Silindir Fiyatlandırma Sistemi

Hidrolik silindir imalat maliyetlerini hesaplamak için geliştirilmiş, GPT-5.2 destekli akıllı fiyatlandırma uygulaması.

### Güncel Durum (Şubat 2026) - "Tek Kod Tabanı" Entegrasyonu
Bu proje, "Strateji 1: Smart Config" prensibine göre Delta Portal'a entegre edilmiştir.
- **Portal Modu:** `deploy_hidrolik_v2.ps1` ile sunucuya atıldığında `VITE_APP_MODE=PORTAL` ile çalışır. "Portala Dön" butonu aktif olur.
- **Standalone Modu:** Yerel geliştirme sırasında kendi kendine çalışır.
- **Veri Güvenliği:** Dağıtım sırasında veritabanı dosyaları korunur.

## Özellikler

- **Teknik Resim Analizi**: GPT-5.2 ile teknik resimlerden otomatik ölçü çıkarma
- **Manuel Fiyatlandırma**: Ölçüleri manuel girerek maliyet hesaplama
- **Detaylı Maliyet Dağılımı**: Malzeme, işçilik, kaplama vb. detaylı maliyet çıktısı
- **Grafiksel Görselleştirme**: Maliyet dağılımını pasta grafik ile görüntüleme

## Desteklenen Silindir Tipleri

- Tek Etkili
- Çift Etkili
- Teleskopik

## Desteklenen Malzemeler

- Çelik (St52)
- Paslanmaz Çelik (AISI 304/316)
- Alüminyum

## Bağlantı Tipleri

- Flanşlı
- Mafsallı (Clevis)
- Trunyon
- Ayaklı
- Bağlantı Çubuklu

## Kurulum

### Gereksinimler

- Python 3.13+
- Node.js 18+
- OpenAI API Key (GPT-5.2 erişimi)

### Backend Kurulumu

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# .env dosyası oluştur
cp .env.example .env
# .env dosyasına OPENAI_API_KEY değerini ekle

# Sunucuyu başlat
uvicorn app.main:app --reload --port 8000
```

### Frontend Kurulumu

```bash
cd frontend
npm install
npm run dev
```

## Kullanım

1. Backend'i başlatın (port 8000)
2. Frontend'i başlatın (port 5173)
3. Tarayıcıda `http://localhost:5173` adresine gidin
4. Teknik resim yükleyin veya ölçüleri manuel girin
5. Fiyat hesaplamasını görüntüleyin

## API Endpoints

### Fiyatlandırma

- `POST /api/pricing/calculate` - Manuel fiyat hesaplama
- `GET /api/pricing/materials` - Malzeme listesi
- `GET /api/pricing/cylinder-types` - Silindir tipleri
- `GET /api/pricing/mounting-types` - Bağlantı tipleri

### Teknik Resim Analizi

- `POST /api/analysis/upload` - Dosya yükleyerek analiz
- `POST /api/analysis/analyze` - Base64 görüntü analizi
- `POST /api/analysis/analyze-and-price` - Analiz ve direkt fiyatlandırma

## Proje Yapısı

```
hidrolik_silindir/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI ana uygulama
│   │   ├── config.py            # Ayarlar
│   │   ├── models/              # Pydantic modeller
│   │   ├── routers/             # API endpoint'leri
│   │   └── services/            # İş mantığı
│   │       ├── pricing_engine.py    # Maliyet hesaplama
│   │       └── image_analyzer.py    # GPT-5.2 entegrasyonu
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Ana uygulama
│   │   ├── components/          # React bileşenleri
│   │   ├── services/            # API servisleri
│   │   └── types/               # TypeScript tipleri
│   └── package.json
└── README.md
```

## Maliyet Hesaplama Formülü

Sistem aşağıdaki bileşenleri hesaba katarak maliyet hesaplar:

1. **Gövde Maliyeti**: Çelik boru ağırlığı × malzeme fiyatı
2. **Piston Mili Maliyeti**: Mil ağırlığı × malzeme fiyatı
3. **Piston Maliyeti**: Piston ağırlığı × malzeme fiyatı
4. **Kapak Maliyeti**: Kapak ağırlığı × malzeme fiyatı
5. **Krom Kaplama**: Kaplama alanı × birim fiyat
6. **Conta Takımı**: Çapa ve tipe göre değişken
7. **İşleme Maliyeti**: Tahmini işleme süresi × saat ücreti
8. **Montaj Maliyeti**: Sabit montaj süresi × saat ücreti
9. **Bağlantı Elemanı**: Bağlantı tipine göre sabit maliyet

## Lisans

MIT License
