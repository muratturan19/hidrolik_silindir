import { useState } from 'react';
import { Cylinder, Cog, Upload, Calculator } from 'lucide-react';
import { Card, CardHeader, CardBody } from './components/ui/Card';
import { ImageUploader } from './components/ImageUploader';
import { DimensionForm } from './components/DimensionForm';
import { PricingResultCard } from './components/PricingResult';
import { uploadAndAnalyze, calculatePricing } from './services/api';
import type {
  ImageAnalysisResult,
  PricingResult,
  CylinderDimensions,
  MaterialType,
  CylinderType,
  MountingType,
} from './types';

type TabType = 'upload' | 'manual';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async (file: File): Promise<ImageAnalysisResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await uploadAndAnalyze(file);
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analiz başarısız oldu';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnalysisComplete = (result: ImageAnalysisResult) => {
    setAnalysisResult(result);
    if (result.success && result.dimensions) {
      // Otomatik olarak fiyat hesapla
      handleCalculatePricing({
        dimensions: result.dimensions,
        material: result.detected_material || 'steel',
        cylinderType: result.detected_cylinder_type || 'double_acting',
        mountingType: result.detected_mounting_type || 'flange',
        profitMargin: 0.25,
      });
    }
  };

  const handleCalculatePricing = async (data: {
    dimensions: CylinderDimensions;
    material: MaterialType;
    cylinderType: CylinderType;
    mountingType: MountingType;
    profitMargin: number;
  }) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await calculatePricing({
        dimensions: data.dimensions,
        material: data.material,
        cylinder_type: data.cylinderType,
        mounting_type: data.mountingType,
        quantity: 1,
        profit_margin: data.profitMargin,
      });
      setPricingResult(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fiyat hesaplama başarısız oldu';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 rounded-lg">
                <Cylinder className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Hidrolik Silindir</h1>
                <p className="text-xs text-gray-500">Fiyatlandırma Sistemi</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Cog className="h-4 w-4" />
              <span>GPT-5.2 Destekli</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Sol Panel - Giriş */}
          <div className="space-y-6">
            {/* Tab Seçimi */}
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
              <button
                onClick={() => setActiveTab('upload')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                  font-medium transition-all duration-200
                  ${activeTab === 'upload'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Upload className="h-4 w-4" />
                Teknik Resim Yükle
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
                  font-medium transition-all duration-200
                  ${activeTab === 'manual'
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }
                `}
              >
                <Calculator className="h-4 w-4" />
                Manuel Giriş
              </button>
            </div>

            {/* Tab İçeriği */}
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold text-gray-900">
                  {activeTab === 'upload' ? 'Teknik Resim Analizi' : 'Ölçü Girişi'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {activeTab === 'upload'
                    ? 'Teknik resmi yükleyin, GPT-5.2 ölçüleri otomatik çıkarsın'
                    : 'Silindir ölçülerini manuel olarak girin'
                  }
                </p>
              </CardHeader>
              <CardBody>
                {activeTab === 'upload' ? (
                  <ImageUploader
                    onAnalyze={handleAnalyze}
                    onAnalysisComplete={handleAnalysisComplete}
                    isLoading={isLoading}
                  />
                ) : (
                  <DimensionForm
                    initialDimensions={analysisResult?.dimensions}
                    initialMaterial={analysisResult?.detected_material}
                    initialCylinderType={analysisResult?.detected_cylinder_type}
                    initialMountingType={analysisResult?.detected_mounting_type}
                    onSubmit={handleCalculatePricing}
                    isLoading={isLoading}
                  />
                )}
              </CardBody>
            </Card>

            {/* Hata Mesajı */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Analiz sonrası form (resim yükleme modunda) */}
            {activeTab === 'upload' && analysisResult?.success && analysisResult.dimensions && (
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">Tespit Edilen Değerleri Düzenle</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    AI tarafından tespit edilen değerleri kontrol edip düzenleyebilirsiniz
                  </p>
                </CardHeader>
                <CardBody>
                  <DimensionForm
                    initialDimensions={analysisResult.dimensions}
                    initialMaterial={analysisResult.detected_material}
                    initialCylinderType={analysisResult.detected_cylinder_type}
                    initialMountingType={analysisResult.detected_mounting_type}
                    onSubmit={handleCalculatePricing}
                    isLoading={isLoading}
                  />
                </CardBody>
              </Card>
            )}
          </div>

          {/* Sağ Panel - Sonuç */}
          <div className="space-y-6">
            {pricingResult ? (
              <PricingResultCard result={pricingResult} />
            ) : (
              <Card className="h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="p-4 bg-gray-100 rounded-full inline-block mb-4">
                    <Calculator className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">
                    Fiyat hesaplamak için teknik resim yükleyin veya ölçüleri girin
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Hidrolik Silindir Fiyatlandırma Sistemi v1.0</p>
            <p>GPT-5.2 ile teknik resim analizi</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
