import { useState, useEffect } from 'react';
import { Save, RotateCcw, Package, Wrench, Link2, Shield, Settings2, Ruler, Calculator, Cog, Box, Clock } from 'lucide-react';
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

  const updateMaterialMultiplier = (material: keyof PricingParameters['material_multipliers'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      material_multipliers: { ...prev.material_multipliers, [material]: value },
    }));
  };

  const updateMaterialDensity = (material: keyof PricingParameters['material_densities'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      material_densities: { ...prev.material_densities, [material]: value },
    }));
  };

  const updateGeometryCoefficient = (field: keyof PricingParameters['geometry_coefficients'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      geometry_coefficients: { ...prev.geometry_coefficients, [field]: value },
    }));
  };

  const updateMachiningCoefficient = (field: keyof PricingParameters['machining_coefficients'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      machining_coefficients: { ...prev.machining_coefficients, [field]: value },
    }));
  };

  const updateSealCoefficient = (field: keyof PricingParameters['seal_coefficients'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      seal_coefficients: { ...prev.seal_coefficients, [field]: value },
    }));
  };

  const updateWallThicknessCoefficient = (field: keyof PricingParameters['wall_thickness_coefficients'], value: number) => {
    setLocalParams((prev) => ({
      ...prev,
      wall_thickness_coefficients: { ...prev.wall_thickness_coefficients, [field]: value },
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
                suffix="TL/cm²"
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

        {/* Malzeme Çarpanları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Malzeme Çarpanları</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Malzeme türüne göre fiyat çarpanı (Çelik = 1.0 baz)</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="Çelik"
                value={localParams.material_multipliers.steel}
                onChange={(v) => updateMaterialMultiplier('steel', v)}
                suffix="×"
              />
              <InputField
                label="Paslanmaz Çelik"
                value={localParams.material_multipliers.stainless}
                onChange={(v) => updateMaterialMultiplier('stainless', v)}
                suffix="×"
              />
              <InputField
                label="Alüminyum"
                value={localParams.material_multipliers.aluminum}
                onChange={(v) => updateMaterialMultiplier('aluminum', v)}
                suffix="×"
              />
            </div>
          </CardBody>
        </Card>

        {/* Malzeme Yoğunlukları */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Box className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Malzeme Yoğunlukları</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">Ağırlık hesabı için yoğunluk değerleri</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="Çelik"
                value={localParams.material_densities.steel}
                onChange={(v) => updateMaterialDensity('steel', v)}
                suffix="g/cm³"
              />
              <InputField
                label="Paslanmaz Çelik"
                value={localParams.material_densities.stainless}
                onChange={(v) => updateMaterialDensity('stainless', v)}
                suffix="g/cm³"
              />
              <InputField
                label="Alüminyum"
                value={localParams.material_densities.aluminum}
                onChange={(v) => updateMaterialDensity('aluminum', v)}
                suffix="g/cm³"
              />
            </div>
          </CardBody>
        </Card>

        {/* Geometri Katsayıları */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Geometri Formülleri</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Parça boyutlarını hesaplamada kullanılan katsayılar
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <InputField
                label="Gövde Ek Uzunluk (strok +)"
                value={localParams.geometry_coefficients.tube_extra_length}
                onChange={(v) => updateGeometryCoefficient('tube_extra_length', v)}
                suffix="mm"
              />
              <InputField
                label="Mil Ek Uzunluk (strok +)"
                value={localParams.geometry_coefficients.rod_extra_length}
                onChange={(v) => updateGeometryCoefficient('rod_extra_length', v)}
                suffix="mm"
              />
              <InputField
                label="Krom Kaplama Ek (strok +)"
                value={localParams.geometry_coefficients.chrome_extra_length}
                onChange={(v) => updateGeometryCoefficient('chrome_extra_length', v)}
                suffix="mm"
              />
              <InputField
                label="Piston Conta Payı"
                value={localParams.geometry_coefficients.piston_seal_clearance}
                onChange={(v) => updateGeometryCoefficient('piston_seal_clearance', v)}
                suffix="mm"
              />
              <InputField
                label="Piston Kalınlık Oranı (çap ×)"
                value={localParams.geometry_coefficients.piston_thickness_ratio}
                onChange={(v) => updateGeometryCoefficient('piston_thickness_ratio', v)}
                suffix="×"
              />
              <InputField
                label="Kapak Kalınlık Oranı (et ×)"
                value={localParams.geometry_coefficients.end_cap_thickness_ratio}
                onChange={(v) => updateGeometryCoefficient('end_cap_thickness_ratio', v)}
                suffix="×"
              />
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p><strong>Formüller:</strong></p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Gövde Uzunluğu = Strok + {localParams.geometry_coefficients.tube_extra_length}mm</li>
                <li>Mil Uzunluğu = Strok + {localParams.geometry_coefficients.rod_extra_length}mm</li>
                <li>Krom Kaplama Alanı: Çevre × (Strok + {localParams.geometry_coefficients.chrome_extra_length}mm)</li>
              </ul>
            </div>
          </CardBody>
        </Card>

        {/* İşleme Süresi Formülü */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">İşleme Süresi Formülü</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Talaşlı imalat süresini hesaplamada kullanılan katsayılar
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputField
                label="Temel Süre"
                value={localParams.machining_coefficients.base_hours}
                onChange={(v) => updateMachiningCoefficient('base_hours', v)}
                suffix="saat"
              />
              <InputField
                label="Çap Böleni"
                value={localParams.machining_coefficients.bore_diameter_divisor}
                onChange={(v) => updateMachiningCoefficient('bore_diameter_divisor', v)}
              />
              <InputField
                label="Strok Böleni"
                value={localParams.machining_coefficients.stroke_length_divisor}
                onChange={(v) => updateMachiningCoefficient('stroke_length_divisor', v)}
              />
              <InputField
                label="Mil Çapı Böleni"
                value={localParams.machining_coefficients.rod_diameter_divisor}
                onChange={(v) => updateMachiningCoefficient('rod_diameter_divisor', v)}
              />
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p><strong>Formül:</strong></p>
              <p className="mt-1 font-mono">
                İşleme Süresi = {localParams.machining_coefficients.base_hours} × (Çap/{localParams.machining_coefficients.bore_diameter_divisor} + Strok/{localParams.machining_coefficients.stroke_length_divisor} + Mil/{localParams.machining_coefficients.rod_diameter_divisor}) × Silindir Tipi Çarpanı
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Conta Maliyet Formülü */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Conta Maliyet Formülü</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Çapa göre conta maliyeti katsayıları
            </p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="Referans Çap"
                value={localParams.seal_coefficients.base_diameter}
                onChange={(v) => updateSealCoefficient('base_diameter', v)}
                suffix="mm"
              />
              <InputField
                label="Çap Farkı Böleni"
                value={localParams.seal_coefficients.diameter_divisor}
                onChange={(v) => updateSealCoefficient('diameter_divisor', v)}
              />
              <InputField
                label="Çift Etkili Çarpanı"
                value={localParams.seal_coefficients.double_acting_multiplier}
                onChange={(v) => updateSealCoefficient('double_acting_multiplier', v)}
                suffix="×"
              />
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p><strong>Formül:</strong></p>
              <p className="mt-1 font-mono text-xs">
                Çarpan = 1 + (Çap - {localParams.seal_coefficients.base_diameter}) / {localParams.seal_coefficients.diameter_divisor}
              </p>
              <p className="mt-1 font-mono text-xs">
                Çift etkili için × {localParams.seal_coefficients.double_acting_multiplier}
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Et Kalınlığı Formülü */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cog className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Et Kalınlığı Hesabı</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Basınca göre otomatik et kalınlığı katsayıları
            </p>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              <InputField
                label="İzin Verilen Gerilme"
                value={localParams.wall_thickness_coefficients.stress_limit}
                onChange={(v) => updateWallThicknessCoefficient('stress_limit', v)}
                suffix="MPa"
              />
              <InputField
                label="Güvenlik Payı"
                value={localParams.wall_thickness_coefficients.safety_margin}
                onChange={(v) => updateWallThicknessCoefficient('safety_margin', v)}
                suffix="mm"
              />
              <InputField
                label="Minimum Et Kalınlığı"
                value={localParams.wall_thickness_coefficients.minimum_thickness}
                onChange={(v) => updateWallThicknessCoefficient('minimum_thickness', v)}
                suffix="mm"
              />
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p><strong>Formül:</strong> (Basınç girilmezse otomatik hesap)</p>
              <p className="mt-1 font-mono text-xs">
                t = (P × D) / (2 × {localParams.wall_thickness_coefficients.stress_limit}) + {localParams.wall_thickness_coefficients.safety_margin}
              </p>
              <p className="mt-1 text-xs">
                Minimum: {localParams.wall_thickness_coefficients.minimum_thickness}mm
              </p>
            </div>
          </CardBody>
        </Card>

        {/* Montaj Süresi */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-indigo-500" />
              <h3 className="font-semibold text-gray-900">Montaj Süresi</h3>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Silindir montaj işçiliği
            </p>
          </CardHeader>
          <CardBody>
            <InputField
              label="Montaj Süresi"
              value={localParams.assembly_hours}
              onChange={(v) => setLocalParams((prev) => ({ ...prev, assembly_hours: v }))}
              suffix="saat"
            />
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p><strong>Maliyet:</strong></p>
              <p className="mt-1">
                {localParams.assembly_hours} saat × {localParams.labor_rates.assembly} TL/saat = {(localParams.assembly_hours * localParams.labor_rates.assembly).toFixed(0)} TL
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
