import { useState, useEffect } from 'react';
import { Save, RotateCcw, Package, Wrench, Link2, Shield, Settings2, Ruler } from 'lucide-react';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import type { PricingParameters } from '../types';
import { defaultPricingParameters } from '../types';

interface ParametersPageProps {
  parameters: PricingParameters;
  onSave: (params: PricingParameters) => void;
}

export function ParametersPage({ parameters, onSave }: ParametersPageProps) {
  const [localParams, setLocalParams] = useState<PricingParameters>(parameters);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalParams(parameters);
  }, [parameters]);

  useEffect(() => {
    setHasChanges(JSON.stringify(localParams) !== JSON.stringify(parameters));
  }, [localParams, parameters]);

  const handleSave = () => {
    onSave(localParams);
    setHasChanges(false);
  };

  const handleReset = () => {
    setLocalParams(defaultPricingParameters);
  };

  const updateMaterialPrice = (material: keyof PricingParameters['material_prices'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      material_prices: { ...prev.material_prices, [material]: value },
    }));
  };

  const updateLaborRate = (type: keyof PricingParameters['labor_rates'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      labor_rates: { ...prev.labor_rates, [type]: value },
    }));
  };

  const updateMountingPrice = (type: keyof PricingParameters['mounting_prices'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      mounting_prices: { ...prev.mounting_prices, [type]: value },
    }));
  };

  const updateSealPrice = (size: keyof PricingParameters['seal_prices'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      seal_prices: { ...prev.seal_prices, [size]: value },
    }));
  };

  const updateMultiplier = (type: keyof PricingParameters['cylinder_type_multipliers'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      cylinder_type_multipliers: { ...prev.cylinder_type_multipliers, [type]: value },
    }));
  };

  const updateInputLimit = (
    field: keyof PricingParameters['input_limits'],
    bound: 'min' | 'max',
    value: number
  ) => {
    setLocalParams((prev) => ({
      ...prev,
      input_limits: {
        ...prev.input_limits,
        [field]: { ...prev.input_limits[field], [bound]: value },
      },
    }));
  };

  const InputField = ({
    label,
    value,
    onChange,
    suffix,
  }: {
    label: string;
    value: number;
    onChange: (val: number) => void;
    suffix?: string;
  }) => (
    <div>
      <label className="block text-sm text-gray-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step="0.01"
          className="
            w-full px-4 py-2.5 rounded-lg border border-gray-200
            focus:ring-2 focus:ring-indigo-500 focus:border-transparent
            text-gray-900 font-medium
          "
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parametreler</h1>
          <p className="text-gray-500 mt-1">Fiyatlandırma hesaplamalarında kullanılan değerleri düzenleyin</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" icon={<RotateCcw className="h-4 w-4" />} onClick={handleReset}>
            Varsayılana Dön
          </Button>
          <Button
            variant="primary"
            icon={<Save className="h-4 w-4" />}
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Kaydet
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
          Kaydedilmemiş değişiklikler var. Kaydetmek için "Kaydet" butonuna tıklayın.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Malzeme Fiyatları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Malzeme Fiyatları</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Kilogram başına TL</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="Çelik (St52)"
                value={localParams.material_prices.steel}
                onChange={(v) => updateMaterialPrice('steel', v)}
                suffix="TL/kg"
              />
              <InputField
                label="Paslanmaz Çelik (AISI 304/316)"
                value={localParams.material_prices.stainless}
                onChange={(v) => updateMaterialPrice('stainless', v)}
                suffix="TL/kg"
              />
              <InputField
                label="Alüminyum"
                value={localParams.material_prices.aluminum}
                onChange={(v) => updateMaterialPrice('aluminum', v)}
                suffix="TL/kg"
              />
            </div>
          </CardBody>
        </Card>

        {/* İşçilik Ücretleri */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">İşçilik Ücretleri</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Saat başına TL</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="Talaşlı İmalat (CNC/Torna)"
                value={localParams.labor_rates.machining}
                onChange={(v) => updateLaborRate('machining', v)}
                suffix="TL/saat"
              />
              <InputField
                label="Montaj"
                value={localParams.labor_rates.assembly}
                onChange={(v) => updateLaborRate('assembly', v)}
                suffix="TL/saat"
              />
              <InputField
                label="Krom Kaplama"
                value={localParams.chrome_plating_price}
                onChange={(v) => setLocalParams((prev) => ({ ...prev, chrome_plating_price: v }))}
                suffix="TL/dm²"
              />
            </div>
          </CardBody>
        </Card>

        {/* Bağlantı Elemanı Fiyatları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Bağlantı Elemanları</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Adet başına TL</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="Flanşlı"
                value={localParams.mounting_prices.flange}
                onChange={(v) => updateMountingPrice('flange', v)}
                suffix="TL"
              />
              <InputField
                label="Mafsallı (Clevis)"
                value={localParams.mounting_prices.clevis}
                onChange={(v) => updateMountingPrice('clevis', v)}
                suffix="TL"
              />
              <InputField
                label="Trunyon"
                value={localParams.mounting_prices.trunnion}
                onChange={(v) => updateMountingPrice('trunnion', v)}
                suffix="TL"
              />
              <InputField
                label="Ayaklı"
                value={localParams.mounting_prices.foot}
                onChange={(v) => updateMountingPrice('foot', v)}
                suffix="TL"
              />
              <InputField
                label="Bağlantı Çubuklu"
                value={localParams.mounting_prices.tie_rod}
                onChange={(v) => updateMountingPrice('tie_rod', v)}
                suffix="TL"
              />
            </div>
          </CardBody>
        </Card>

        {/* Conta Fiyatları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Conta/Sızdırmazlık</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Çap aralığına göre TL</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="Küçük (< 50mm)"
                value={localParams.seal_prices.small}
                onChange={(v) => updateSealPrice('small', v)}
                suffix="TL"
              />
              <InputField
                label="Orta (50-100mm)"
                value={localParams.seal_prices.medium}
                onChange={(v) => updateSealPrice('medium', v)}
                suffix="TL"
              />
              <InputField
                label="Büyük (> 100mm)"
                value={localParams.seal_prices.large}
                onChange={(v) => updateSealPrice('large', v)}
                suffix="TL"
              />
            </div>
          </CardBody>
        </Card>

        {/* Silindir Tipi Çarpanları */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Silindir Tipi Çarpanları</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Toplam maliyete uygulanacak çarpan (1.0 = değişiklik yok)
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField
                label="Tek Etkili"
                value={localParams.cylinder_type_multipliers.single_acting}
                onChange={(v) => updateMultiplier('single_acting', v)}
                suffix="×"
              />
              <InputField
                label="Çift Etkili"
                value={localParams.cylinder_type_multipliers.double_acting}
                onChange={(v) => updateMultiplier('double_acting', v)}
                suffix="×"
              />
              <InputField
                label="Teleskopik"
                value={localParams.cylinder_type_multipliers.telescopic}
                onChange={(v) => updateMultiplier('telescopic', v)}
                suffix="×"
              />
            </div>
          </CardBody>
        </Card>

        {/* Giriş Limitleri */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Giriş Limitleri</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Ölçü girişinde izin verilen minimum ve maksimum değerler
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Silindir İç Çapı */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Silindir İç Çapı (mm)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.bore_diameter.min}
                      onChange={(e) => updateInputLimit('bore_diameter', 'min', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Min"
                    />
                    <span className="text-xs text-gray-400">Min</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.bore_diameter.max}
                      onChange={(e) => updateInputLimit('bore_diameter', 'max', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Max"
                    />
                    <span className="text-xs text-gray-400">Max</span>
                  </div>
                </div>
              </div>

              {/* Mil Çapı */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Piston Mili Çapı (mm)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.rod_diameter.min}
                      onChange={(e) => updateInputLimit('rod_diameter', 'min', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Min"
                    />
                    <span className="text-xs text-gray-400">Min</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.rod_diameter.max}
                      onChange={(e) => updateInputLimit('rod_diameter', 'max', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Max"
                    />
                    <span className="text-xs text-gray-400">Max</span>
                  </div>
                </div>
              </div>

              {/* Strok Boyu */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Strok Boyu (mm)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.stroke_length.min}
                      onChange={(e) => updateInputLimit('stroke_length', 'min', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Min"
                    />
                    <span className="text-xs text-gray-400">Min</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.stroke_length.max}
                      onChange={(e) => updateInputLimit('stroke_length', 'max', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Max"
                    />
                    <span className="text-xs text-gray-400">Max</span>
                  </div>
                </div>
              </div>

              {/* Et Kalınlığı */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Et Kalınlığı (mm)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.wall_thickness.min}
                      onChange={(e) => updateInputLimit('wall_thickness', 'min', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Min"
                    />
                    <span className="text-xs text-gray-400">Min</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.wall_thickness.max}
                      onChange={(e) => updateInputLimit('wall_thickness', 'max', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Max"
                    />
                    <span className="text-xs text-gray-400">Max</span>
                  </div>
                </div>
              </div>

              {/* Çalışma Basıncı */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Çalışma Basıncı (bar)</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.working_pressure.min}
                      onChange={(e) => updateInputLimit('working_pressure', 'min', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Min"
                    />
                    <span className="text-xs text-gray-400">Min</span>
                  </div>
                  <div className="flex-1">
                    <input
                      type="number"
                      value={localParams.input_limits.working_pressure.max}
                      onChange={(e) => updateInputLimit('working_pressure', 'max', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm"
                      placeholder="Max"
                    />
                    <span className="text-xs text-gray-400">Max</span>
                  </div>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
