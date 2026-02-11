import { useState } from 'react';
import { Upload, Calculator, Table2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { ImageUploader } from '../components/ImageUploader';
import { DimensionForm } from '../components/DimensionForm';
import { TableSelector } from '../components/TableSelector';
import { PricingResultCard } from '../components/PricingResult';
import { uploadAndAnalyze, calculatePricing } from '../services/api';
import type {
  ImageAnalysisResult,
  PricingResult,
  CylinderDimensions,
  MaterialType,
  CylinderType,
  MountingType,
  PricingParameters,
} from '../types';

type TabType = 'upload' | 'manual' | 'table';

interface CalculatorPageProps {
  currency: string;
  exchangeRate: number;
  parameters: PricingParameters;
}

export function CalculatorPage({ currency, exchangeRate, parameters }: CalculatorPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>('table');
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
    parameters?: PricingParameters;
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
        parameters: data.parameters || parameters,
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
    <div className={`grid gap-6 ${activeTab === 'table' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2'}`}>
      {/* Sol Panel - Giriş */}
      <div className="space-y-6">
        {/* Tab Seçimi */}
        <div className="flex bg-white rounded-xl p-1.5 shadow-sm border border-gray-100">
          <button
            onClick={() => setActiveTab('upload')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg
              font-medium transition-all duration-200 text-sm
              ${activeTab === 'upload'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Teknik Resim</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg
              font-medium transition-all duration-200 text-sm
              ${activeTab === 'manual'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">Manuel Giriş</span>
          </button>
          <button
            onClick={() => setActiveTab('table')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-lg
              font-medium transition-all duration-200 text-sm
              ${activeTab === 'table'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }
            `}
          >
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tablodan Seçim</span>
          </button>
        </div>

        {/* Tab İçeriği */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              {activeTab === 'upload'
                ? 'Teknik Resim Analizi'
                : activeTab === 'manual'
                ? 'Ölçü Girişi'
                : 'Tablodan Fiyatlandırma'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'upload'
                ? 'Teknik resmi yükleyin, GPT-5.2 ölçüleri otomatik çıkarsın'
                : activeTab === 'manual'
                ? 'Silindir ölçülerini manuel olarak girin'
                : 'Excel tablosundan bileşen seçerek fiyat hesaplayın'
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
            ) : activeTab === 'manual' ? (
              <DimensionForm
                initialDimensions={analysisResult?.dimensions}
                initialMaterial={analysisResult?.detected_material}
                initialCylinderType={analysisResult?.detected_cylinder_type}
                initialMountingType={analysisResult?.detected_mounting_type}
                parameters={parameters}
                onSubmit={handleCalculatePricing}
                isLoading={isLoading}
              />
            ) : (
              <TableSelector
                currency={currency}
                exchangeRate={exchangeRate}
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

        {/* Analiz sonrası form */}
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
                parameters={parameters}
                onSubmit={handleCalculatePricing}
                isLoading={isLoading}
              />
            </CardBody>
          </Card>
        )}
      </div>

      {/* Sağ Panel - Sonuç (sadece upload ve manual tabları için) */}
      {activeTab !== 'table' && (
        <div className="space-y-6">
          {pricingResult ? (
            <PricingResultCard
              result={pricingResult}
              currency={currency}
              exchangeRate={exchangeRate}
            />
          ) : (
            <Card className="h-96 flex items-center justify-center">
              <div className="text-center">
                <div className="p-4 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full inline-block mb-4">
                  <Calculator className="h-8 w-8 text-indigo-500" />
                </div>
                <p className="text-gray-500">
                  Fiyat hesaplamak için teknik resim yükleyin veya ölçüleri girin
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
