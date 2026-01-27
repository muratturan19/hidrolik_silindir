import { useState, useEffect } from 'react';
import { Table2, Loader2, AlertCircle, Calculator, Info } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  const [priceResult, setPriceResult] = useState<ExcelPriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableLoaded, setTableLoaded] = useState(false);

  useEffect(() => {
    checkTableStatus();
  }, []);

  const checkTableStatus = async () => {
    setIsLoading(true);
    try {
      const status = await getExcelPricingStatus();
      if (status.loaded) {
        await loadOptions();
      } else {
        setTableLoaded(false);
      }
    } catch {
      setTableLoaded(false);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const result = await getExcelPricingOptions();
      if (result.success) {
        setColumns(result.columns);
        setTableLoaded(true);
        // Varsayılan seçimleri ayarla (ilk değerler)
        const defaultSelections: Record<string, string> = {};
        result.columns.forEach((col) => {
          if (col.options.length > 0) {
            defaultSelections[col.name] = col.options[0].value;
          }
        });
        setSelections(defaultSelections);
      }
    } catch (err) {
      setError('Seçenekler yüklenirken hata oluştu');
    }
  };

  const handleSelectionChange = (columnName: string, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [columnName]: value,
    }));
    // Seçim değişince sonucu temizle
    setPriceResult(null);
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const result = await calculateExcelPrice(selections);
      setPriceResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fiyat hesaplanırken hata oluştu');
    } finally {
      setIsCalculating(false);
    }
  };

  const formatPrice = (price: number) => {
    if (currency === 'TRY') {
      return `₺${price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    } else {
      const converted = price / exchangeRate;
      return `€${converted.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    }
  };

  // Yükleniyor
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  // Excel yüklenmemişse bilgi göster
  if (!tableLoaded) {
    return (
      <div className="text-center py-12">
        <div className="p-4 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full inline-block mb-4">
          <Info className="h-8 w-8 text-amber-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Fiyat Tablosu Yüklenmemiş
        </h3>
        <p className="text-gray-500 mb-4">
          Bu özelliği kullanmak için önce Excel fiyat tablosu yüklemeniz gerekiyor
        </p>
        <Link
          to="/excel-settings"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors font-medium"
        >
          <Table2 className="h-4 w-4" />
          Excel Tablosu Yükle
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dropdown Seçiciler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {columns.map((column) => (
          <div key={column.name}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {column.display_name}
            </label>
            <select
              value={selections[column.name] || ''}
              onChange={(e) => handleSelectionChange(column.name, e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
            >
              {column.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} {option.price > 0 && `(${formatPrice(option.price)})`}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Hesapla Butonu */}
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

      {/* Hata */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Fiyat Sonucu */}
      {priceResult && priceResult.success && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-500">
            <h3 className="text-lg font-semibold text-white">Fiyat Detayları</h3>
          </div>
          <div className="p-4 space-y-3">
            {priceResult.items.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <span className="text-sm text-gray-500">{item.name}</span>
                  <p className="font-medium text-gray-900">{item.value}</p>
                </div>
                <span className="font-semibold text-gray-900">
                  {formatPrice(item.price)}
                </span>
              </div>
            ))}
            <div className="pt-3 mt-3 border-t-2 border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-900">Toplam</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {formatPrice(priceResult.total)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tablo Düzenleme Linki */}
      <div className="pt-4 border-t border-gray-200">
        <Link
          to="/excel-settings"
          className="text-sm text-gray-500 hover:text-emerald-600 flex items-center gap-1"
        >
          <Table2 className="h-4 w-4" />
          Fiyat tablosunu düzenle
        </Link>
      </div>
    </div>
  );
}
