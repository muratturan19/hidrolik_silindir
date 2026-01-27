import { useState, useEffect } from 'react';
import { Upload, Table2, Loader2, CheckCircle, AlertCircle, Trash2, Calculator } from 'lucide-react';
import {
  getExcelPricingOptions,
  getExcelPricingStatus,
  uploadExcelPricing,
  calculateExcelPrice,
  clearExcelPricing,
  type ExcelPricingColumn,
  type ExcelPriceResult,
} from '../services/api';

interface TableSelectorProps {
  currency: string;
  exchangeRate: number;
}

export function TableSelector({ currency, exchangeRate }: TableSelectorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [columns, setColumns] = useState<ExcelPricingColumn[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [priceResult, setPriceResult] = useState<ExcelPriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tableLoaded, setTableLoaded] = useState(false);

  // Sayfa yüklendiğinde mevcut tabloyu kontrol et
  useEffect(() => {
    checkTableStatus();
  }, []);

  const checkTableStatus = async () => {
    try {
      const status = await getExcelPricingStatus();
      if (status.loaded) {
        await loadOptions();
      }
    } catch (err) {
      // Tablo yüklenmemiş olabilir, sorun yok
    }
  };

  const loadOptions = async () => {
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadExcelPricing(file);
      if (result.success) {
        await loadOptions();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya yüklenirken hata oluştu');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectionChange = (columnName: string, value: string) => {
    setSelections((prev) => ({
      ...prev,
      [columnName]: value,
    }));
  };

  const handleCalculate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await calculateExcelPrice(selections);
      setPriceResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fiyat hesaplanırken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearTable = async () => {
    try {
      await clearExcelPricing();
      setColumns([]);
      setSelections({});
      setPriceResult(null);
      setTableLoaded(false);
    } catch (err) {
      setError('Tablo temizlenirken hata oluştu');
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

  // Excel yüklenmemişse yükleme ekranı göster
  if (!tableLoaded) {
    return (
      <div className="space-y-6">
        {/* Excel Yükleme Alanı */}
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-primary-400 transition-colors">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
            id="excel-upload"
            disabled={isUploading}
          />
          <label htmlFor="excel-upload" className="cursor-pointer">
            <div className="flex flex-col items-center">
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-primary-500 animate-spin mb-4" />
                  <p className="text-lg font-medium text-gray-700">Yükleniyor...</p>
                </>
              ) : (
                <>
                  <div className="p-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full mb-4">
                    <Table2 className="h-8 w-8 text-emerald-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-700 mb-2">
                    Fiyat Tablosu Yükleyin
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Excel dosyasını (.xlsx, .xls) sürükleyin veya tıklayarak seçin
                  </p>
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors">
                    <Upload className="h-4 w-4" />
                    Excel Seç
                  </span>
                </>
              )}
            </div>
          </label>
        </div>

        {/* Format Bilgisi */}
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="font-medium text-blue-900 mb-2">Desteklenen Excel Formatları:</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <p><strong>Format 1 - Dikey:</strong> Kategori | Seçenek | Fiyat</p>
            <p><strong>Format 2 - Yatay:</strong> Her sütun çifti (Değer | Fiyat)</p>
            <p><strong>Format 3 - Basit:</strong> Her sütun bir kategori, satırlar seçenekler</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>
    );
  }

  // Tablo yüklenmişse seçim ekranı göster
  return (
    <div className="space-y-6">
      {/* Yüklü Tablo Bilgisi */}
      <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">
            {columns.length} kategori yüklendi
          </span>
        </div>
        <button
          onClick={handleClearTable}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
          Temizle
        </button>
      </div>

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
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
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
        disabled={isLoading || Object.keys(selections).length === 0}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25"
      >
        {isLoading ? (
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

      {/* Yeni Excel Yükleme */}
      <div className="pt-4 border-t border-gray-200">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
          className="hidden"
          id="excel-upload-new"
          disabled={isUploading}
        />
        <label
          htmlFor="excel-upload-new"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer transition-colors"
        >
          <Upload className="h-4 w-4" />
          {isUploading ? 'Yükleniyor...' : 'Farklı Excel Yükle'}
        </label>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
