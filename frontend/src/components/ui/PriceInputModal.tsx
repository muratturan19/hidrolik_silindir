import { useState, useEffect } from 'react';
import { AlertCircle, X, Calculator } from 'lucide-react';

interface PriceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (price: number, discount: number, saveToDb: boolean) => void;
  itemName: string;
  itemValue: string;
}

export function PriceInputModal({ isOpen, onClose, onSubmit, itemName, itemValue }: PriceInputModalProps) {
  const [price, setPrice] = useState<string>('');
  const [discount, setDiscount] = useState<string>('0');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPrice('');
      setDiscount('0');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (saveToDb: boolean) => {
    const numPrice = parseFloat(price);
    const numDiscount = parseFloat(discount);
    
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Lütfen geçerli bir fiyat girin');
      return;
    }
    
    if (isNaN(numDiscount) || numDiscount < 0 || numDiscount > 100) {
      setError('İskonto 0-100 arası olmalı');
      return;
    }
    
    onSubmit(numPrice, numDiscount, saveToDb);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(false);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold">Fiyat Bilgisi Eksik</h3>
                <p className="text-sm text-amber-50 mt-0.5">Manuel fiyat girişi gerekli</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Ürün Bilgisi */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm text-amber-900 mb-1">
              <span className="font-semibold">{itemName}:</span> {itemValue}
            </p>
            <p className="text-xs text-amber-700">
              Bu ürün için fiyat bilgisi bulunamadı. Lütfen manuel olarak giriniz.
            </p>
          </div>

          {/* Fiyat ve İskonto Girişi */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fiyat (EUR) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  €
                </span>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => {
                    setPrice(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  autoFocus
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-medium ${
                    error && error.includes('fiyat') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İskonto (%)
              </label>
              <div className="relative">
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                  %
                </span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => {
                    setDiscount(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  step="1"
                  min="0"
                  max="100"
                  placeholder="0"
                  className={`w-full pl-4 pr-8 py-3 border rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg font-medium ${
                    error && error.includes('İskonto') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Error mesajı */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 space-y-2">
          <div className="flex gap-2">
            <button
              onClick={() => handleSubmit(false)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-medium rounded-xl hover:from-blue-600 hover:to-indigo-600 transition-all shadow-lg shadow-blue-500/25"
            >
              <Calculator className="h-4 w-4" />
              Hesapla ve Kullan
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            İptal
          </button>
        </div>
      </div>
    </div>
  );
}
