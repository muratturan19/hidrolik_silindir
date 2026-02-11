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
  message?: string;
  image_url?: string;
}

export interface UserInfo {
  username: string;
  role: string;
  is_admin: boolean;
  isAuthenticated: boolean;
}

// Manuel Fiyatlandırma İsteği
export interface ManualPricingRequest {
  dimensions: CylinderDimensions;
  material: MaterialType;
  cylinder_type: CylinderType;
  mounting_type: MountingType;
  quantity: number;
  profit_margin: number;
  parameters?: PricingParameters;
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

  // Malzeme çarpanları (çelik = 1.0 baz)
  material_multipliers: {
    steel: number;
    stainless: number;
    aluminum: number;
  };

  // Malzeme yoğunlukları (g/cm³)
  material_densities: {
    steel: number;
    stainless: number;
    aluminum: number;
  };

  // Krom kaplama fiyatı (TL/cm²)
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

  // Giriş limitleri
  input_limits: {
    bore_diameter: { min: number; max: number };
    rod_diameter: { min: number; max: number };
    stroke_length: { min: number; max: number };
    wall_thickness: { min: number; max: number };
    working_pressure: { min: number; max: number };
  };

  // Formül katsayıları - Geometri
  geometry_coefficients: {
    tube_extra_length: number;      // Gövde için strok + bu değer (mm)
    rod_extra_length: number;       // Mil için strok + bu değer (mm)
    chrome_extra_length: number;    // Krom kaplama için strok + bu değer (mm)
    piston_seal_clearance: number;  // Piston conta payı (mm)
    piston_thickness_ratio: number; // Piston kalınlığı = çap × bu oran
    end_cap_thickness_ratio: number; // Kapak kalınlığı = et kalınlığı × bu oran
  };

  // Formül katsayıları - İşleme süresi
  machining_coefficients: {
    base_hours: number;              // Temel işleme süresi (saat)
    bore_diameter_divisor: number;   // Çap / bu değer
    stroke_length_divisor: number;   // Strok / bu değer
    rod_diameter_divisor: number;    // Mil çapı / bu değer
  };

  // Formül katsayıları - Conta maliyeti
  seal_coefficients: {
    base_diameter: number;           // Baz çap (mm) - bu değerden fark alınır
    diameter_divisor: number;        // Çap farkı / bu değer
    double_acting_multiplier: number; // Çift etkili için çarpan
  };

  // Formül katsayıları - Et kalınlığı hesabı
  wall_thickness_coefficients: {
    stress_limit: number;            // İzin verilen gerilme (MPa)
    safety_margin: number;           // Güvenlik payı (mm)
    minimum_thickness: number;       // Minimum et kalınlığı (mm)
  };

  // Montaj süresi (saat)
  assembly_hours: number;
}

// Varsayılan parametreler
export const defaultPricingParameters: PricingParameters = {
  material_prices: {
    steel: 45,
    stainless: 180,
    aluminum: 120,
  },
  material_multipliers: {
    steel: 1.0,
    stainless: 2.8,
    aluminum: 1.5,
  },
  material_densities: {
    steel: 7.85,
    stainless: 8.0,
    aluminum: 2.7,
  },
  chrome_plating_price: 0.35,  // TL/cm²
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
    telescopic: 2.5,
  },
  input_limits: {
    bore_diameter: { min: 10, max: 500 },
    rod_diameter: { min: 8, max: 300 },
    stroke_length: { min: 50, max: 6000 },
    wall_thickness: { min: 3, max: 50 },
    working_pressure: { min: 50, max: 500 },
  },
  geometry_coefficients: {
    tube_extra_length: 100,       // Gövde için strok + 100mm
    rod_extra_length: 150,        // Mil için strok + 150mm
    chrome_extra_length: 50,      // Krom kaplama için strok + 50mm
    piston_seal_clearance: 2,     // Piston conta payı 2mm
    piston_thickness_ratio: 0.5,  // Piston kalınlığı = çap × 0.5
    end_cap_thickness_ratio: 1.5, // Kapak kalınlığı = et kalınlığı × 1.5
  },
  machining_coefficients: {
    base_hours: 2.0,              // Temel 2 saat işleme
    bore_diameter_divisor: 50,    // Çap / 50
    stroke_length_divisor: 300,   // Strok / 300
    rod_diameter_divisor: 30,     // Mil çapı / 30
  },
  seal_coefficients: {
    base_diameter: 40,            // 40mm baz çap
    diameter_divisor: 100,        // Çap farkı / 100
    double_acting_multiplier: 1.3, // Çift etkili %30 ekstra
  },
  wall_thickness_coefficients: {
    stress_limit: 250,            // 250 MPa izin verilen gerilme
    safety_margin: 3,             // 3mm güvenlik payı
    minimum_thickness: 6,         // Minimum 6mm
  },
  assembly_hours: 1.5,            // 1.5 saat montaj
};
