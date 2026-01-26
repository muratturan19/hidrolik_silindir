// Malzeme Tipleri
export type MaterialType = 'steel' | 'stainless' | 'aluminum';

// Silindir Tipleri
export type CylinderType = 'single_acting' | 'double_acting' | 'telescopic';

// Bağlantı Tipleri
export type MountingType = 'flange' | 'clevis' | 'trunnion' | 'foot' | 'tie_rod';

// Silindir Ölçüleri
export interface CylinderDimensions {
  bore_diameter: number;      // Silindir iç çapı (mm)
  rod_diameter: number;       // Piston mili çapı (mm)
  stroke_length: number;      // Strok boyu (mm)
  wall_thickness?: number;    // Gövde et kalınlığı (mm)
  working_pressure?: number;  // Çalışma basıncı (bar)
}

// Maliyet Dağılımı
export interface CostBreakdown {
  tube_cost: number;           // Gövde maliyeti
  rod_cost: number;            // Piston mili maliyeti
  piston_cost: number;         // Piston maliyeti
  seal_cost: number;           // Conta maliyeti
  end_caps_cost: number;       // Kapak maliyeti
  chrome_plating_cost: number; // Krom kaplama maliyeti
  machining_cost: number;      // İşleme maliyeti
  assembly_cost: number;       // Montaj maliyeti
  mounting_cost: number;       // Bağlantı elemanı maliyeti
}

// Fiyatlandırma Sonucu
export interface PricingResult {
  dimensions: CylinderDimensions;
  material: MaterialType;
  cylinder_type: CylinderType;
  mounting_type: MountingType;
  cost_breakdown: CostBreakdown;
  subtotal: number;
  profit_margin: number;
  total_price: number;
  notes?: string;
}

// Görüntü Analiz Sonucu
export interface ImageAnalysisResult {
  success: boolean;
  dimensions?: CylinderDimensions;
  detected_material?: MaterialType;
  detected_cylinder_type?: CylinderType;
  detected_mounting_type?: MountingType;
  confidence: number;
  raw_analysis?: string;
  error_message?: string;
}

// Manuel Fiyatlandırma İsteği
export interface ManualPricingRequest {
  dimensions: CylinderDimensions;
  material: MaterialType;
  cylinder_type: CylinderType;
  mounting_type: MountingType;
  quantity: number;
  profit_margin: number;
}

// Seçenek Tipi
export interface SelectOption {
  value: string;
  label: string;
}

// Türkçe etiketler
export const materialLabels: Record<MaterialType, string> = {
  steel: 'Çelik (St52)',
  stainless: 'Paslanmaz Çelik (AISI 304/316)',
  aluminum: 'Alüminyum'
};

export const cylinderTypeLabels: Record<CylinderType, string> = {
  single_acting: 'Tek Etkili',
  double_acting: 'Çift Etkili',
  telescopic: 'Teleskopik'
};

export const mountingTypeLabels: Record<MountingType, string> = {
  flange: 'Flanşlı',
  clevis: 'Mafsallı (Clevis)',
  trunnion: 'Trunyon',
  foot: 'Ayaklı',
  tie_rod: 'Bağlantı Çubuklu'
};

export const costLabels: Record<keyof CostBreakdown, string> = {
  tube_cost: 'Gövde',
  rod_cost: 'Piston Mili',
  piston_cost: 'Piston',
  seal_cost: 'Conta/Sızdırmazlık',
  end_caps_cost: 'Kapaklar',
  chrome_plating_cost: 'Krom Kaplama',
  machining_cost: 'İşleme',
  assembly_cost: 'Montaj',
  mounting_cost: 'Bağlantı Elemanı'
};

// Fiyatlandırma Parametreleri
export interface PricingParameters {
  // Malzeme fiyatları (TL/kg)
  material_prices: {
    steel: number;
    stainless: number;
    aluminum: number;
  };

  // Krom kaplama fiyatı (TL/dm²)
  chrome_plating_price: number;

  // İşçilik ücretleri (TL/saat)
  labor_rates: {
    machining: number;
    assembly: number;
  };

  // Bağlantı elemanı fiyatları (TL)
  mounting_prices: {
    flange: number;
    clevis: number;
    trunnion: number;
    foot: number;
    tie_rod: number;
  };

  // Conta fiyatları (çap aralığına göre TL)
  seal_prices: {
    small: number;   // < 50mm
    medium: number;  // 50-100mm
    large: number;   // > 100mm
  };

  // Silindir tipi çarpanları
  cylinder_type_multipliers: {
    single_acting: number;
    double_acting: number;
    telescopic: number;
  };
}

// Varsayılan parametreler
export const defaultPricingParameters: PricingParameters = {
  material_prices: {
    steel: 45,
    stainless: 180,
    aluminum: 120,
  },
  chrome_plating_price: 35,
  labor_rates: {
    machining: 850,
    assembly: 650,
  },
  mounting_prices: {
    flange: 450,
    clevis: 380,
    trunnion: 520,
    foot: 320,
    tie_rod: 280,
  },
  seal_prices: {
    small: 280,
    medium: 420,
    large: 650,
  },
  cylinder_type_multipliers: {
    single_acting: 0.85,
    double_acting: 1.0,
    telescopic: 1.5,
  },
};
