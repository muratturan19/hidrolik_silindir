import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Calculator, Ruler } from 'lucide-react';
import {
  getExcelPricingOptions,
  getExcelPricingStatus,
  calculateExcelPrice,
  type ExcelPricingColumn,
  type ExcelPriceResult,
} from '../services/api';

interface TableSelectorProps {
  currency: string;
  exchangeRate: number;
}

export function TableSelector({ currency, exchangeRate }: TableSelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [columns, setColumns] = useState<ExcelPricingColumn[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [strokeMm, setStrokeMm] = useState<number>(500);
  const [priceResult, setPriceResult] = useState<ExcelPriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    loadOptions();
  }, []);

  const loadOptions = async () => {
    setIsLoading(true);
    try {
      const status = await getExcelPricingStatus();
      if (status.loaded) {
        const result = await getExcelPricingOptions();
        if (result.success && result.columns) {
          setColumns(result.columns);
        }
      }
    } catch {
      // Sessizce hata - dropdown'lar boş kalacak
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectionChange = (columnName: string, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [columnName]: value,
    }));
    setPriceResult(null);
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const result = await calculateExcelPrice(selections, strokeMm);
      setPriceResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fiyat hesaplanırken hata oluştu');
    } finally {
      setIsCalculating(false);
    }
  };

  const formatPrice = (price: number, resultCurrency?: string) => {
    const priceCurrency = resultCurrency || 'EUR';
    if (currency === 'TRY' && priceCurrency === 'EUR') {
      const converted = price * exchangeRate;
      return `₺${converted.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    }
    return `€${price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Veri yoksa uyarı */}
      {columns.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
          Excel tablosu yüklenmemiş. Yönetim → Excel Tablosu bölümünden yükleyebilirsiniz.
        </div>
      )}

      {/* Strok Girişi - Her zaman göster */}
      {columns.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <label className="flex items-center gap-2 text-sm font-medium text-blue-700 mb-2">
            <Ruler className="h-4 w-4" />
            Strok Uzunluğu (mm)
          </label>
          <input
            type="number"
            value={strokeMm}
            onChange={(e) => {
              setStrokeMm(Number(e.target.value));
              setPriceResult(null);
            }}
            min={0}
            step={10}
            className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-lg font-medium"
            placeholder="Strok uzunluğunu girin (mm)"
          />
          <p className="mt-2 text-xs text-blue-600">
            Boru: Strok + 120mm | Mil: Strok + 150mm
          </p>
        </div>
      )}

      {/* Dropdown Seçiciler - Sadece ölçüler görünür, fiyatlar gizli */}
      {columns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {columns.map((column) => {
            const selectedValue = selections[column.name];

            return (
              <div key={column.name} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {column.display_name}
                  {column.is_meter_based && (
                    <span className="ml-1 text-xs text-blue-500 font-normal">(metre bazlı)</span>
                  )}
                </label>
                <select
                  value={selectedValue || ''}
                  onChange={(e) => handleSelectionChange(column.name, e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm ${
                    selectedValue ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <option value="">Seçiniz...</option>
                  {column.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* Hesapla Butonu */}
      {columns.length > 0 && (
        <button
          onClick={handleCalculate}
          disabled={isCalculating || Object.keys(selections).length === 0}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
        >
          {isCalculating ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Hesaplanıyor...
            </>
          ) : (
            <>
              <Calculator className="h-5 w-5" />
              Fiyat Hesapla
            </>
          )}
        </button>
      )}

      {/* Hata */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Fiyat Sonucu */}
      {priceResult && priceResult.success && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500">
            <h3 className="text-lg font-semibold text-white">Fiyat Detayları</h3>
            {priceResult.stroke_mm && priceResult.stroke_mm > 0 && (
              <p className="text-emerald-100 text-sm">Strok: {priceResult.stroke_mm} mm</p>
            )}
          </div>
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 uppercase tracking-wider">
                  <th className="text-left pb-2">Bileşen</th>
                  <th className="text-left pb-2">Seçim</th>
                  <th className="text-right pb-2">Birim Fiyat</th>
                  <th className="text-right pb-2">Tutar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {priceResult.items.map((item, index) => (
                  <tr key={index} className="text-sm">
                    <td className="py-2.5 text-gray-600">{item.name}</td>
                    <td className="py-2.5 font-medium text-gray-900">{item.value}</td>
                    <td className="py-2.5 text-right text-gray-500">
                      {item.unit_price.toFixed(2)} {item.unit}
                      {item.length_m && (
                        <div className="text-xs text-blue-500">× {item.length_m} m</div>
                      )}
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-900">
                      {formatPrice(item.price, priceResult.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={3} className="pt-3 text-lg font-semibold text-gray-900">Toplam</td>
                  <td className="pt-3 text-right text-2xl font-bold text-emerald-600">
                    {formatPrice(priceResult.total, priceResult.currency)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {priceResult.items.some(item => item.formula) && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-2">Hesaplama Formülleri:</p>
                <div className="space-y-1">
                  {priceResult.items.filter(item => item.formula).map((item, index) => (
                    <p key={index} className="text-xs text-gray-500">
                      <span className="font-medium">{item.name}:</span> {item.formula}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
