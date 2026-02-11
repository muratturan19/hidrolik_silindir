import { useState, useEffect } from 'react';
import { AlertCircle, X, Calculator } from 'lucide-react';

interface PriceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (price: number) => void;
  itemName: string;
  itemValue: string;
}

export function PriceInputModal({ isOpen, onClose, onSubmit, itemName, itemValue }: PriceInputModalProps) {
  const [price, setPrice] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setPrice('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    const numPrice = parseFloat(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      setError('Lütfen geçerli bir fiyat girin');
      return;
    }
    onSubmit(numPrice);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
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
              <span className="font-semibold">{itemName}</span> kategorisinde
            </p>
            <p className="text-lg font-bold text-amber-700">{itemValue}</p>
            <p className="text-xs text-amber-600 mt-2">
              Bu ölçünün fiyatı sistemde kayıtlı değil. Lütfen fiyatı öğrenip aşağıya girin.
            </p>
          </div>

          {/* Fiyat Girişi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fiyat (EUR)
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
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
          >
            <Calculator className="h-4 w-4" />
            Onayla
          </button>
        </div>
      </div>
    </div>
  );
}
