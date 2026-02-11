import { useState, useEffect } from 'react';
import {
  Upload,
  Table2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Trash2,
  Save,
  Plus,
  X,
  Edit3,
  Download,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import {
  getExcelPricingOptions,
  getExcelPricingStatus,
  uploadExcelPricing,
  clearExcelPricing,
  type ExcelPricingColumn,
} from '../services/api';
import api from '../services/api';

export function ExcelSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [columns, setColumns] = useState<ExcelPricingColumn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [tableLoaded, setTableLoaded] = useState(false);
  const [editingCell, setEditingCell] = useState<{
    colIndex: number;
    optIndex: number;
    field: 'label' | 'price';
  } | null>(null);

  // Metadata
  const [metadata, setMetadata] = useState<{
    version?: number;
    last_updated?: string;
    last_update_type?: string;
    created_at?: string;
    update_count?: number;
  } | null>(null);

  useEffect(() => {
    checkTableStatus();
  }, []);

  const checkTableStatus = async () => {
    setIsLoading(true);
    try {
      const status = await getExcelPricingStatus();
      if (status.loaded) {
        setMetadata(status.metadata || null);
        await loadOptions();
      }
    } catch {
      // Tablo yüklenmemiş olabilir
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
      }
    } catch (err) {
      setError('Tablo yüklenirken hata oluştu');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadExcelPricing(file);
      if (result.success) {
        await loadOptions();
        setSuccess(`Excel başarıyla yüklendi: ${result.categories.length} kategori, ${result.total_options} seçenek`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dosya yüklenirken hata oluştu');
    } finally {
      setIsUploading(false);
      // Input'u temizle
      event.target.value = '';
    }
  };

  const handleClearTable = async () => {
    if (!confirm('Fiyat tablosunu silmek istediğinize emin misiniz?')) return;

    try {
      await clearExcelPricing();
      setColumns([]);
      setTableLoaded(false);
      setSuccess('Fiyat tablosu temizlendi');
    } catch (err) {
      setError('Tablo temizlenirken hata oluştu');
    }
  };

  const handleCellEdit = (
    colIndex: number,
    optIndex: number,
    field: 'label' | 'price',
    value: string
  ) => {
    const newColumns = [...columns];
    if (field === 'price') {
      newColumns[colIndex].options[optIndex].price = parseFloat(value) || 0;
    } else {
      newColumns[colIndex].options[optIndex].label = value;
      newColumns[colIndex].options[optIndex].value = value;
    }
    setColumns(newColumns);
    setEditingCell(null);
  };

  const handleAddOption = (colIndex: number) => {
    const newColumns = [...columns];
    newColumns[colIndex].options.push({
      value: 'Yeni Seçenek',
      label: 'Yeni Seçenek',
      price: 0,
    });
    setColumns(newColumns);
  };

  const handleDeleteOption = (colIndex: number, optIndex: number) => {
    const newColumns = [...columns];
    newColumns[colIndex].options.splice(optIndex, 1);
    setColumns(newColumns);
  };

  const handleAddCategory = () => {
    const newColumns = [...columns];
    const newName = `kategori_${columns.length + 1}`;
    newColumns.push({
      name: newName,
      display_name: `Yeni Kategori ${columns.length + 1}`,
      options: [{ value: 'Seçenek 1', label: 'Seçenek 1', price: 0 }],
    });
    setColumns(newColumns);
  };

  const handleDeleteCategory = (colIndex: number) => {
    if (!confirm('Bu kategoriyi silmek istediğinize emin misiniz?')) return;
    const newColumns = [...columns];
    newColumns.splice(colIndex, 1);
    setColumns(newColumns);
  };

  const handleCategoryNameEdit = (colIndex: number, newName: string) => {
    const newColumns = [...columns];
    newColumns[colIndex].display_name = newName;
    setColumns(newColumns);
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Backend'e güncellenmiş veriyi gönder
      await api.post('/excel-pricing/update', { columns });
      setSuccess('Değişiklikler kaydedildi');
    } catch (err) {
      setError('Kaydetme sırasında hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Başlık */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Excel Fiyat Tablosu</h1>
        <p className="text-gray-500 mt-1">
          Bileşen ve fiyat bilgilerini içeren Excel tablosunu yükleyin ve düzenleyin
        </p>
      </div>

      {/* Mesajlar */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
          <button onClick={() => setSuccess(null)} className="ml-auto">
            <X className="h-4 w-4 text-green-400 hover:text-green-600" />
          </button>
        </div>
      )}

      {/* Excel Yükleme */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">Excel Dosyası</h2>
          <p className="text-sm text-gray-500 mt-1">
            Fiyat tablosunu içeren Excel dosyasını yükleyin
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
              disabled={isUploading}
            />
            <label
              htmlFor="excel-upload"
              className={`
                flex items-center gap-2 px-4 py-2.5 rounded-lg cursor-pointer
                transition-colors font-medium
                ${isUploading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600'
                }
              `}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Yükleniyor...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Excel Yükle
                </>
              )}
            </label>

            {tableLoaded && (
              <>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50"
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Kaydet
                </button>

                <button
                  onClick={handleClearTable}
                  className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
                >
                  <Trash2 className="h-4 w-4" />
                  Temizle
                </button>
              </>
            )}

            {tableLoaded && (
              <div className="ml-auto flex items-center gap-2 text-sm text-gray-500">
                <CheckCircle className="h-4 w-4 text-green-500" />
                {columns.length} kategori yüklü
              </div>
            )}
          </div>

          {/* Şablon İndirme */}
          <div className="mt-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-200">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Table2 className="h-5 w-5 text-indigo-600 mt-0.5" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-indigo-900 mb-1">Örnek Excel Şablonu</h4>
                <p className="text-sm text-indigo-700 mb-3">
                  Fiyat tablosunu hazırlarken kullanabileceğiniz örnek Excel şablonunu indirebilirsiniz.
                  Her kategori ayrı bir sheet'te olmalıdır.
                </p>
                <a
                  href="/fiyat_tablosu_3.xlsx"
                  download="fiyat_tablosu_ornegi.xlsx"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Şablon İndir
                </a>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Versiyon ve Metadata Bilgisi */}
      {tableLoaded && metadata && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Versiyon Bilgileri</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tablo sürüm ve güncelleme geçmişi
                </p>
              </div>
              <div className="text-sm text-gray-500">
                v{metadata.version || 1}
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {/* Özet Bilgiler */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-700 mb-1">Mevcut Versiyon</p>
                  <p className="text-2xl font-bold text-emerald-900">v{metadata.version || 1}</p>
                </div>

                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <p className="text-xs font-medium text-blue-700 mb-1">Son Güncelleme</p>
                  <p className="text-sm font-semibold text-blue-900">
                    {metadata.last_updated 
                      ? new Date(metadata.last_updated).toLocaleString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : '-'}
                  </p>
                </div>

                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                  <p className="text-xs font-medium text-purple-700 mb-1">Toplam Güncelleme</p>
                  <p className="text-2xl font-bold text-purple-900">{metadata.update_count || 0}</p>
                </div>
              </div>

              {/* Ek Bilgiler */}
              {(metadata.last_update_type || metadata.created_at) && (
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {metadata.last_update_type && (
                      <div>
                        <span className="font-medium text-gray-700">Son İşlem: </span>
                        <span className="text-gray-600">{metadata.last_update_type}</span>
                      </div>
                    )}
                    {metadata.created_at && (
                      <div>
                        <span className="font-medium text-gray-700">Oluşturulma: </span>
                        <span className="text-gray-600">
                          {new Date(metadata.created_at).toLocaleString('tr-TR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Düzenlenebilir Tablo */}
      {tableLoaded && columns.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Fiyat Tablosu</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Değerleri düzenlemek için hücreye tıklayın
                </p>
              </div>
              <button
                onClick={handleAddCategory}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Kategori Ekle
              </button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {columns.map((column, colIndex) => (
                <div key={column.name} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Kategori Başlığı */}
                  <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <input
                      type="text"
                      value={column.display_name}
                      onChange={(e) => handleCategoryNameEdit(colIndex, e.target.value)}
                      className="font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-primary-500 rounded px-2 py-1"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddOption(colIndex)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        Seçenek Ekle
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(colIndex)}
                        className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Seçenekler Tablosu */}
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left text-sm text-gray-600">
                        <th className="px-4 py-2 font-medium">Seçenek</th>
                        <th className="px-4 py-2 font-medium w-32">Fiyat (₺)</th>
                        <th className="px-4 py-2 w-16"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {column.options.map((option, optIndex) => (
                        <tr key={optIndex} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {editingCell?.colIndex === colIndex &&
                            editingCell?.optIndex === optIndex &&
                            editingCell?.field === 'label' ? (
                              <input
                                type="text"
                                defaultValue={option.label}
                                autoFocus
                                onBlur={(e) =>
                                  handleCellEdit(colIndex, optIndex, 'label', e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellEdit(
                                      colIndex,
                                      optIndex,
                                      'label',
                                      (e.target as HTMLInputElement).value
                                    );
                                  }
                                }}
                                className="w-full px-2 py-1 border border-primary-500 rounded focus:outline-none"
                              />
                            ) : (
                              <button
                                onClick={() =>
                                  setEditingCell({ colIndex, optIndex, field: 'label' })
                                }
                                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2 group"
                              >
                                {option.label}
                                <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {editingCell?.colIndex === colIndex &&
                            editingCell?.optIndex === optIndex &&
                            editingCell?.field === 'price' ? (
                              <input
                                type="number"
                                defaultValue={option.price}
                                autoFocus
                                onBlur={(e) =>
                                  handleCellEdit(colIndex, optIndex, 'price', e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellEdit(
                                      colIndex,
                                      optIndex,
                                      'price',
                                      (e.target as HTMLInputElement).value
                                    );
                                  }
                                }}
                                className="w-full px-2 py-1 border border-primary-500 rounded focus:outline-none"
                              />
                            ) : (
                              <button
                                onClick={() =>
                                  setEditingCell({ colIndex, optIndex, field: 'price' })
                                }
                                className="w-full text-left px-2 py-1 hover:bg-gray-100 rounded flex items-center gap-2 group"
                              >
                                {option.price.toLocaleString('tr-TR')}
                                <Edit3 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleDeleteOption(colIndex, optIndex)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Tablo Yüklenmemişse */}
      {!tableLoaded && (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <div className="p-4 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-full inline-block mb-4">
                <Table2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Henüz fiyat tablosu yüklenmemiş
              </h3>
              <p className="text-gray-500 mb-4">
                Excel dosyası yükleyerek bileşen ve fiyat bilgilerini tanımlayın
              </p>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
