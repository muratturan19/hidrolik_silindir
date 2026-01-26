import { useState, useEffect } from 'react';
import { Ruler, Circle, ArrowUpDown, Gauge, Settings2 } from 'lucide-react';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import type {
  CylinderDimensions,
  MaterialType,
  CylinderType,
  MountingType,
  PricingParameters,
} from '../types';
import { defaultPricingParameters } from '../types';

interface DimensionFormProps {
  initialDimensions?: CylinderDimensions;
  initialMaterial?: MaterialType;
  initialCylinderType?: CylinderType;
  initialMountingType?: MountingType;
  parameters?: PricingParameters;
  onSubmit: (data: {
    dimensions: CylinderDimensions;
    material: MaterialType;
    cylinderType: CylinderType;
    mountingType: MountingType;
    profitMargin: number;
  }) => void;
  isLoading?: boolean;
}

const materialOptions = [
  { value: 'steel', label: 'Çelik (St52)' },
  { value: 'stainless', label: 'Paslanmaz Çelik (AISI 304/316)' },
  { value: 'aluminum', label: 'Alüminyum' },
];

const cylinderTypeOptions = [
  { value: 'single_acting', label: 'Tek Etkili' },
  { value: 'double_acting', label: 'Çift Etkili' },
  { value: 'telescopic', label: 'Teleskopik' },
];

const mountingTypeOptions = [
  { value: 'flange', label: 'Flanşlı' },
  { value: 'clevis', label: 'Mafsallı (Clevis)' },
  { value: 'trunnion', label: 'Trunyon' },
  { value: 'foot', label: 'Ayaklı' },
  { value: 'tie_rod', label: 'Bağlantı Çubuklu' },
];

export function DimensionForm({
  initialDimensions,
  initialMaterial,
  initialCylinderType,
  initialMountingType,
  parameters = defaultPricingParameters,
  onSubmit,
  isLoading = false,
}: DimensionFormProps) {
  const limits = parameters.input_limits;

  const [boreDiameter, setBoreDiameter] = useState<string>('');
  const [rodDiameter, setRodDiameter] = useState<string>('');
  const [strokeLength, setStrokeLength] = useState<string>('');
  const [wallThickness, setWallThickness] = useState<string>('');
  const [workingPressure, setWorkingPressure] = useState<string>('160');
  const [material, setMaterial] = useState<MaterialType>('steel');
  const [cylinderType, setCylinderType] = useState<CylinderType>('double_acting');
  const [mountingType, setMountingType] = useState<MountingType>('flange');
  const [profitMargin, setProfitMargin] = useState<string>('25');

  // Initial değerleri set et
  useEffect(() => {
    if (initialDimensions) {
      setBoreDiameter(initialDimensions.bore_diameter.toString());
      setRodDiameter(initialDimensions.rod_diameter.toString());
      setStrokeLength(initialDimensions.stroke_length.toString());
      if (initialDimensions.wall_thickness) {
        setWallThickness(initialDimensions.wall_thickness.toString());
      }
      if (initialDimensions.working_pressure) {
        setWorkingPressure(initialDimensions.working_pressure.toString());
      }
    }
    if (initialMaterial) setMaterial(initialMaterial);
    if (initialCylinderType) setCylinderType(initialCylinderType);
    if (initialMountingType) setMountingType(initialMountingType);
  }, [initialDimensions, initialMaterial, initialCylinderType, initialMountingType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const dimensions: CylinderDimensions = {
      bore_diameter: parseFloat(boreDiameter),
      rod_diameter: parseFloat(rodDiameter),
      stroke_length: parseFloat(strokeLength),
      wall_thickness: wallThickness ? parseFloat(wallThickness) : undefined,
      working_pressure: workingPressure ? parseFloat(workingPressure) : 160,
    };

    onSubmit({
      dimensions,
      material,
      cylinderType,
      mountingType,
      profitMargin: parseFloat(profitMargin) / 100,
    });
  };

  const isValid =
    boreDiameter && parseFloat(boreDiameter) > 0 &&
    rodDiameter && parseFloat(rodDiameter) > 0 &&
    strokeLength && parseFloat(strokeLength) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Ölçüler */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          Temel Ölçüler
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Silindir İç Çapı"
            type="number"
            value={boreDiameter}
            onChange={(e) => setBoreDiameter(e.target.value)}
            placeholder="Ör: 80"
            suffix="mm"
            icon={<Circle className="h-4 w-4" />}
            required
            min={limits.bore_diameter.min}
            max={limits.bore_diameter.max}
          />
          <Input
            label="Piston Mili Çapı"
            type="number"
            value={rodDiameter}
            onChange={(e) => setRodDiameter(e.target.value)}
            placeholder="Ör: 50"
            suffix="mm"
            icon={<Circle className="h-4 w-4" />}
            required
            min={limits.rod_diameter.min}
            max={limits.rod_diameter.max}
          />
          <Input
            label="Strok Boyu"
            type="number"
            value={strokeLength}
            onChange={(e) => setStrokeLength(e.target.value)}
            placeholder="Ör: 400"
            suffix="mm"
            icon={<ArrowUpDown className="h-4 w-4" />}
            required
            min={limits.stroke_length.min}
            max={limits.stroke_length.max}
          />
        </div>
      </div>

      {/* İleri düzey ayarlar */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Detaylı Ayarlar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Et Kalınlığı (Opsiyonel)"
            type="number"
            value={wallThickness}
            onChange={(e) => setWallThickness(e.target.value)}
            placeholder="Otomatik hesaplanır"
            suffix="mm"
            min={limits.wall_thickness.min}
            max={limits.wall_thickness.max}
          />
          <Input
            label="Çalışma Basıncı"
            type="number"
            value={workingPressure}
            onChange={(e) => setWorkingPressure(e.target.value)}
            placeholder="160"
            suffix="bar"
            icon={<Gauge className="h-4 w-4" />}
            min={limits.working_pressure.min}
            max={limits.working_pressure.max}
          />
        </div>
      </div>

      {/* Seçenekler */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          Malzeme ve Tip Seçimi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Malzeme"
            options={materialOptions}
            value={material}
            onChange={(v) => setMaterial(v as MaterialType)}
          />
          <Select
            label="Silindir Tipi"
            options={cylinderTypeOptions}
            value={cylinderType}
            onChange={(v) => setCylinderType(v as CylinderType)}
          />
          <Select
            label="Bağlantı Tipi"
            options={mountingTypeOptions}
            value={mountingType}
            onChange={(v) => setMountingType(v as MountingType)}
          />
        </div>
      </div>

      {/* Kar Marjı */}
      <div>
        <Input
          label="Kar Marjı"
          type="number"
          value={profitMargin}
          onChange={(e) => setProfitMargin(e.target.value)}
          suffix="%"
          min={0}
          max={100}
        />
      </div>

      {/* Submit button */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        loading={isLoading}
        disabled={!isValid}
      >
        Fiyat Hesapla
      </Button>
    </form>
  );
}
