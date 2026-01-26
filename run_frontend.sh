#!/bin/bash
cd "$(dirname "$0")/frontend"

# Bağımlılıkları yükle (node_modules yoksa)
if [ ! -d "node_modules" ]; then
    echo "Bağımlılıklar yükleniyor..."
    npm install
fi

# Frontend'i başlat
echo "Frontend başlatılıyor..."
npm run dev
