#!/bin/bash
cd "$(dirname "$0")/backend"

# Virtual environment oluştur (yoksa)
if [ ! -d "venv" ]; then
    echo "Virtual environment oluşturuluyor..."
    python3 -m venv venv
fi

# Aktivasyon
source venv/bin/activate

# Bağımlılıkları yükle
pip install -r requirements.txt

# .env kontrolü
if [ ! -f ".env" ]; then
    echo "UYARI: .env dosyası bulunamadı!"
    echo "Lütfen .env.example dosyasını .env olarak kopyalayın ve OPENAI_API_KEY değerini girin."
    cp .env.example .env
fi

# Sunucuyu başlat
echo "Backend başlatılıyor..."
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
