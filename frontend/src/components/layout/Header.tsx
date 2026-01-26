import { useState } from 'react';
import { Coins, ChevronDown, X } from 'lucide-react';

interface Currency {
  code: string;
  symbol: string;
  name: string;
}

const currencies: Currency[] = [
  { code: 'TRY', symbol: '₺', name: 'Türk Lirası' },
  { code: 'USD', symbol: '$', name: 'Amerikan Doları' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'İngiliz Sterlini' },
];

interface HeaderProps {
  sidebarCollapsed: boolean;
  currency: string;
  exchangeRate: number;
  onCurrencyChange: (currency: string, rate: number) => void;
}

export function Header({ sidebarCollapsed, currency, exchangeRate, onCurrencyChange }: HeaderProps) {
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [rateInput, setRateInput] = useState('');

  const currentCurrency = currencies.find((c) => c.code === currency) || currencies[0];

  const handleCurrencySelect = (curr: Currency) => {
    if (curr.code === 'TRY') {
      onCurrencyChange('TRY', 1);
      setShowCurrencyModal(false);
    } else {
      setSelectedCurrency(curr);
      setRateInput('');
    }
  };

  const handleRateConfirm = () => {
    const rate = parseFloat(rateInput);
    if (rate > 0 && selectedCurrency) {
      onCurrencyChange(selectedCurrency.code, rate);
      setShowCurrencyModal(false);
      setSelectedCurrency(null);
      setRateInput('');
    }
  };

  return (
    <>
      <header
        className={`
          fixed top-0 right-0 h-16 bg-white/80 backdrop-blur-md border-b border-gray-200 z-30
          transition-all duration-300
          ${sidebarCollapsed ? 'left-16' : 'left-64'}
        `}
      >
        <div className="h-full px-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Hidrolik Silindir Fiyatlandırma
            </h2>
            <p className="text-sm text-gray-500">İmalat maliyet hesaplama sistemi</p>
          </div>

          {/* Currency Selector */}
          <button
            onClick={() => setShowCurrencyModal(true)}
            className="
              flex items-center gap-2 px-4 py-2 rounded-xl
              bg-gray-50 hover:bg-gray-100 border border-gray-200
              transition-all duration-200
            "
          >
            <Coins className="h-4 w-4 text-gray-500" />
            <span className="font-medium text-gray-700">{currentCurrency.symbol}</span>
            <span className="text-sm text-gray-500">{currentCurrency.code}</span>
            {currency !== 'TRY' && (
              <span className="text-xs text-gray-400">(1 TRY = {(1/exchangeRate).toFixed(4)})</span>
            )}
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      </header>

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Para Birimi Seçimi</h3>
              <button
                onClick={() => {
                  setShowCurrencyModal(false);
                  setSelectedCurrency(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {!selectedCurrency ? (
                <div className="space-y-2">
                  {currencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => handleCurrencySelect(curr)}
                      className={`
                        w-full flex items-center gap-4 px-4 py-3 rounded-xl
                        transition-all duration-200
                        ${currency === curr.code
                          ? 'bg-indigo-50 border-2 border-indigo-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }
                      `}
                    >
                      <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-xl font-semibold">
                        {curr.symbol}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-gray-900">{curr.name}</p>
                        <p className="text-sm text-gray-500">{curr.code}</p>
                      </div>
                      {currency === curr.code && (
                        <div className="ml-auto">
                          <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center text-3xl font-bold text-indigo-600 mx-auto mb-3">
                      {selectedCurrency.symbol}
                    </div>
                    <p className="text-gray-900 font-medium">{selectedCurrency.name}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Döviz Kuru (1 {selectedCurrency.code} = ? TRY)
                    </label>
                    <input
                      type="number"
                      value={rateInput}
                      onChange={(e) => setRateInput(e.target.value)}
                      placeholder="Örn: 32.50"
                      step="0.0001"
                      className="
                        w-full px-4 py-3 rounded-xl border border-gray-200
                        focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                        text-lg font-medium text-center
                      "
                      autoFocus
                    />
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Tüm TL fiyatları bu kura bölünerek {selectedCurrency.code}'ye çevrilecek
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => setSelectedCurrency(null)}
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Geri
                    </button>
                    <button
                      onClick={handleRateConfirm}
                      disabled={!rateInput || parseFloat(rateInput) <= 0}
                      className="
                        flex-1 px-4 py-3 rounded-xl
                        bg-indigo-600 text-white font-medium
                        hover:bg-indigo-700 transition-colors
                        disabled:opacity-50 disabled:cursor-not-allowed
                      "
                    >
                      Onayla
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
