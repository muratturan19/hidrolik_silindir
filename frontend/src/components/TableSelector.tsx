import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Calculator, Ruler, Settings2 } from 'lucide-react';
import {
  getExcelPricingOptions,
  getExcelPricingStatus,
  calculateExcelPrice,
  addPricingOption,
  type ExcelPricingColumn,
  type ExcelPriceResult,
} from '../services/api';
import { PriceInputModal } from './ui/PriceInputModal';
import { STANDARD_DIMENSIONS, COLUMN_MAPPING_FOR_STANDARDS } from './StandardDimensions';

interface TableSelectorProps {
  currency: string;
  exchangeRate: number;
}

export function TableSelector({ currency, exchangeRate }: TableSelectorProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isCalculating, setIsCalculating] = useState(false);
  const [columns, setColumns] = useState<ExcelPricingColumn[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});
  const [strokeMm, setStrokeMm] = useState<number>(500);
  const [additionalStroke, setAdditionalStroke] = useState<number | string>(0);
  const [useStandardDimensions, setUseStandardDimensions] = useState(false);
  const [priceResult, setPriceResult] = useState<ExcelPriceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Modal state
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{ columnName: string; value: string } | null>(null);
  const [modalItemInfo, setModalItemInfo] = useState<{ name: string; value: string }>({ name: '', value: '' });


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

  const applyStandardDimensions = (boreValue: string, currentSelections: Record<string, string>) => {
    // Seçilen değerden Boru Çapını ayıkla (örn: "Ø80/95" -> "Ø80")
    let boreKey = boreValue;
    if (boreValue.includes('/')) {
      boreKey = boreValue.split('/')[0].trim();
    }
    
    // Tam eşleşme yoksa, belki "Ø" eksiktir veya fazladır
    if (!STANDARD_DIMENSIONS[boreKey]) {
        // Eğer "80" geldiyse "Ø80" dene
        if (!boreKey.startsWith('Ø') && STANDARD_DIMENSIONS[`Ø${boreKey}`]) {
            boreKey = `Ø${boreKey}`;
        }
        // Eğer "Ø80" geldiyse ama key "80" ise (bu örnekte keyler Ø'li ama yine de)
        else if (boreKey.startsWith('Ø') && STANDARD_DIMENSIONS[boreKey.substring(1)]) {
            boreKey = boreKey.substring(1);
        }
    }

    if (!STANDARD_DIMENSIONS[boreKey]) return currentSelections;

    const standards = STANDARD_DIMENSIONS[boreKey];
    let newSelections = { ...currentSelections };

    // Diğer kolonları bul ve güncelle
    columns.forEach(col => {
      // Kolon adı mapping'de var mı?
      const stdKey = Object.keys(COLUMN_MAPPING_FOR_STANDARDS).find(key => 
        col.name.toLowerCase().includes(key) || key.includes(col.name.toLowerCase())
      );
      
      if (stdKey) {
        const mappedProp = COLUMN_MAPPING_FOR_STANDARDS[stdKey];
        const stdValue = standards[mappedProp];
        
        // Bu standart değer option'larda birebir var mı?
        const exactMatch = col.options.find(opt => opt.value === stdValue);
        
        if (exactMatch) {
          newSelections[col.name] = stdValue;
        } else {
            // Tam eşleşme yoksa, belki "/" içeren bir format vardır (örn: std="Ø30" ama option="Ø30/45")
            // Veya tam tersi (std="Ø30/45" ama option="Ø30")
            const partialMatch = col.options.find(opt => {
                const optVal = opt.value.split('/')[0].trim();
                const stdVal = stdValue.split('/')[0].trim();
                return optVal === stdVal;
            });

            if (partialMatch) {
                newSelections[col.name] = partialMatch.value;
            }
        }
      }
    });
    
    return newSelections;
  };

  const handleSelectionChange = (columnName: string, value: string) => {
    // YOK seçiliyorsa direkt kabul et
    if (value === 'YOK' || value === '') {
      setSelections((prev) => ({
        ...prev,
        [columnName]: value,
      }));
      setPriceResult(null);
      return;
    }

    // Seçilen option'ı bul
    const column = columns.find((col) => col.name === columnName);
    if (!column) return;

    const selectedOption = column.options.find((opt) => opt.value === value);
    
    // Fiyat 0 ise modal aç
    if (selectedOption && selectedOption.price === 0) {
      setPendingSelection({ columnName, value });
      setModalItemInfo({ name: column.display_name, value: selectedOption.label });
      setShowPriceModal(true);
      return;
    }

    // Normal seçim
    let newSelections = { ...selections, [columnName]: value };

    // Eğer standart ölçüler aktifse ve Boru Çapı seçildiyse diğerlerini otomatik seç
    const isBoreColumn = columnName.toLowerCase().includes('boru') || columnName.toLowerCase().includes('silindir');
    
    if (useStandardDimensions && isBoreColumn) {
       newSelections = applyStandardDimensions(value, newSelections);
    }

    setSelections(newSelections);
    setPriceResult(null);
  };
  
  const handleStandardDimensionsToggle = (checked: boolean) => {
    setUseStandardDimensions(checked);
    
    if (checked) {
       // Aktif edildiğinde mevcut Boru seçimine göre uygula
       const boreColumn = columns.find(c => c.name.toLowerCase().includes('boru') || c.name.toLowerCase().includes('silindir'));
       if (boreColumn) {
         const currentBoreValue = selections[boreColumn.name];
         if (currentBoreValue) {
           const newSelections = applyStandardDimensions(currentBoreValue, selections);
           setSelections(newSelections);
           setPriceResult(null);
         }
       }
    }
  };

  const handleManualPriceSubmit = (price: number, discount: number, saveToDb: boolean) => {
    if (!pendingSelection) return;

    // Manuel fiyatı kaydet
    const key = `${pendingSelection.columnName}:${pendingSelection.value}`;
    setManualPrices((prev) => ({
      ...prev,
      [key]: price,
    }));

    // Seçimi kaydet
    setSelections((prev) => ({
      ...prev,
      [pendingSelection.columnName]: pendingSelection.value,
    }));

    // Eğer DB'ye kaydedilecekse backend'e gönder
    if (saveToDb) {
      // TODO: Backend'e kaydetme işlemi
      const column = columns.find((col) => col.name === pendingSelection.columnName);
      if (column) {
        savePriceToDatabase(column.name, pendingSelection.value, price, discount);
      }
    }

    setPriceResult(null);
    setPendingSelection(null);
  };

  const savePriceToDatabase = async (columnName: string, value: string, price: number, discount: number) => {
    try {
      const column = columns.find((col) => col.name === columnName);
      if (!column) return;

      // Metre bazlı kategoriler için offset değerini bul (varsa)
      let offset = 0;
      if (column.is_meter_based && pendingSelection) {
        const selectedOption = column.options.find((opt) => opt.value === value);
        offset = selectedOption?.offset || 0;
      }

      const result = await addPricingOption(columnName, value, price, discount, offset);
      
      if (result.success) {
        // Başarılı - dropdown'ları yeniden yükle
        await loadOptions();
        console.log('DB\'ye başarıyla kaydedildi:', result);
      }
    } catch (error) {
      console.error('DB\'ye kaydetme hatası:', error);
      setError('Veritabanına kaydetme başarısız oldu');
    }
  };

  const handleModalClose = () => {
    setShowPriceModal(false);
    setPendingSelection(null);
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      const result = await calculateExcelPrice(selections, strokeMm, Number(additionalStroke), manualPrices);
      setPriceResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fiyat hesaplanırken hata oluştu');
    } finally {
      setIsCalculating(false);
    }
  };

  const formatPrice = (price: number, resultCurrency?: string) => {
    const priceCurrency = resultCurrency || 'EUR';

    // If target is TRY and source is EUR, convert only if valid exchange rate (> 1)
    if (currency === 'TRY' && priceCurrency === 'EUR') {
      if (exchangeRate > 1) {
        const converted = price * exchangeRate;
        return `₺${converted.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
      }
      // Fallback to displaying Euro if exchange rate is not set (e.g. 1)
      return `€${price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
    }

    // Default to displaying based on source currency
    if (priceCurrency === 'TRY') {
       return `₺${price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}`;
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

      {/* Strok Girişi */}
      {columns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              Boru Boyu = Strok + 120mm
            </p>
          </div>

          <div className="p-4 bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl border border-purple-100">
            <label className="flex items-center gap-2 text-sm font-medium text-purple-700 mb-2">
              <Settings2 className="h-4 w-4" />
              Mil Uzatma Payı (mm)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={additionalStroke === 0 ? '' : additionalStroke}
                onChange={(e) => {
                  const val = e.target.value;
                  setAdditionalStroke(val === '' ? 0 : val);
                  setPriceResult(null);
                }}
                min={0}
                step={1}
                className="w-full px-3 py-2.5 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-lg font-medium"
                placeholder="0"
              />
            </div>
            <p className="mt-2 text-xs text-purple-600">
              Mil Boyu = Strok + 150mm + Uzatma Payı
            </p>
          </div>
        </div>
      )}

      {/* Standart Ölçü Seçimi - Ayrı Bölüm */}
      {columns.length > 0 && (
        <div className="flex items-center gap-2 py-2 px-1">
            <input
            type="checkbox"
            id="std-dims"
            checked={useStandardDimensions}
            onChange={(e) => handleStandardDimensionsToggle(e.target.checked)}
            className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500 border-gray-300" 
          />
          <label htmlFor="std-dims" className="text-sm font-medium text-emerald-800 cursor-pointer select-none">
            Standart Ölçüleri Otomatik Seç (Boru Çapına Göre)
          </label>
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
                  {column.display_name} <span className="text-red-500">*</span>
                  {column.is_meter_based && (
                    <span className="ml-1 text-xs text-blue-500 font-normal">(metre bazlı)</span>
                  )}
                </label>
                <select
                  value={selectedValue || ''}
                  onChange={(e) => handleSelectionChange(column.name, e.target.value)}
                  className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white text-sm ${
                    selectedValue === 'YOK' ? 'border-gray-300 bg-gray-50 text-gray-500' :
                    selectedValue ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200'
                  }`}
                >
                  <option value="">Seçiniz...</option>
                  {/* Metre bazlı olmayan bileşenler için YOK seçeneği */}
                  {!column.is_meter_based && (
                    <option value="YOK" className="text-gray-500">YOK (Bu bileşen kullanılmayacak)</option>
                  )}
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
          disabled={isCalculating || !columns.every(col => selections[col.name] && selections[col.name] !== '')}
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
              Maliyet Hesapla
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
                  <td colSpan={3} className="pt-3 text-lg font-semibold text-gray-900">Toplam Maliyet</td>
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

      {/* Manuel Fiyat Giriş Modal */}
      <PriceInputModal
        isOpen={showPriceModal}
        onClose={handleModalClose}
        onSubmit={handleManualPriceSubmit}
        itemName={modalItemInfo.name}
        itemValue={modalItemInfo.value}
      />
    </div>
  );
}
