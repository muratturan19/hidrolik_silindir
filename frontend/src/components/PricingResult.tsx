import { Card, CardHeader, CardBody } from './ui/Card';
import { CostBreakdownChart, CostBreakdownTable } from './CostBreakdownChart';
import { Calculator, Package, Wrench, TrendingUp, Download, Printer } from 'lucide-react';
import { Button } from './ui/Button';
import type { PricingResult as PricingResultType } from '../types';
import { materialLabels, cylinderTypeLabels, mountingTypeLabels } from '../types';

interface PricingResultProps {
  result: PricingResultType;
}

export function PricingResultCard({ result }: PricingResultProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const data = {
      ...result,
      generated_at: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `silindir-fiyat-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Toplam Fiyat */}
        <Card className="bg-gradient-to-br from-primary-500 to-primary-600 text-white border-0">
          <CardBody className="py-6">
            <div className="flex items-center gap-3 mb-2">
              <Calculator className="h-5 w-5 opacity-80" />
              <span className="text-sm font-medium opacity-80">Toplam Fiyat</span>
            </div>
            <p className="text-3xl font-bold">
              {result.total_price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            <p className="text-sm opacity-70 mt-1">
              %{(result.profit_margin * 100).toFixed(0)} kar marjı dahil
            </p>
          </CardBody>
        </Card>

        {/* Ara Toplam */}
        <Card>
          <CardBody className="py-6">
            <div className="flex items-center gap-3 mb-2">
              <Package className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-600">Maliyet</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {result.subtotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
            </p>
            <p className="text-sm text-gray-500 mt-1">Malzeme + işçilik</p>
          </CardBody>
        </Card>

        {/* Kar */}
        <Card>
          <CardBody className="py-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-gray-600">Kar</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {(result.total_price - result.subtotal).toLocaleString('tr-TR', {
                style: 'currency',
                currency: 'TRY',
              })}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              %{(result.profit_margin * 100).toFixed(0)} marj
            </p>
          </CardBody>
        </Card>
      </div>

      {/* Silindir Detayları */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Silindir Özellikleri
          </h3>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">İç Çap</p>
              <p className="font-semibold">{result.dimensions.bore_diameter} mm</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mil Çapı</p>
              <p className="font-semibold">{result.dimensions.rod_diameter} mm</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Strok</p>
              <p className="font-semibold">{result.dimensions.stroke_length} mm</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Basınç</p>
              <p className="font-semibold">{result.dimensions.working_pressure || 160} bar</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Malzeme</p>
              <p className="font-semibold">{materialLabels[result.material]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Tip</p>
              <p className="font-semibold">{cylinderTypeLabels[result.cylinder_type]}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Bağlantı</p>
              <p className="font-semibold">{mountingTypeLabels[result.mounting_type]}</p>
            </div>
            {result.dimensions.wall_thickness && (
              <div>
                <p className="text-sm text-gray-500">Et Kalınlığı</p>
                <p className="font-semibold">{result.dimensions.wall_thickness} mm</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Maliyet Dağılımı */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Maliyet Dağılımı (Grafik)</h3>
          </CardHeader>
          <CardBody>
            <CostBreakdownChart breakdown={result.cost_breakdown} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold text-gray-900">Maliyet Detayları</h3>
          </CardHeader>
          <CardBody>
            <CostBreakdownTable breakdown={result.cost_breakdown} />
          </CardBody>
        </Card>
      </div>

      {/* Aksiyon Butonları */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" icon={<Printer className="h-4 w-4" />} onClick={handlePrint}>
              Yazdır
            </Button>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={handleDownload}
            >
              JSON İndir
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
