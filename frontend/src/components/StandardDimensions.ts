// Silindir Standart Ölçüleri
// Boru Çapı (Ø) -> Standart Diğer Ölçüler bu dosyada tanımlanır.

// Tip tanımları
export interface CylinderStandard {
  boreDiameter: string;     // Boru Çapı (örn: "Ø50")
  rodDiameter: string;      // Mil Çapı
  pistonHead: string;       // Piston Başı
  rodHead: string;          // Mil Başı
  frontCover: string;       // Ön Kapak
  rearCover: string;        // Arka Kapak
  nut: string;             // Somun
}

// Standart Ölçü Tablosu
// Not: Bu değerler örnek olarak girilmiştir. Gerçek standartlara göre güncellenmelidir.
export const STANDARD_DIMENSIONS: Record<string, Omit<CylinderStandard, 'boreDiameter'>> = {
  // Ø32 Serisi
  "Ø32": {
    rodDiameter: "Ø20",
    pistonHead: "Ø32",
    rodHead: "Ø20",
    frontCover: "Ø32",
    rearCover: "Ø32",
    nut: "M16x1.5"
  },
  // Ø40 Serisi
  "Ø40": {
    rodDiameter: "Ø25",
    pistonHead: "Ø40",
    rodHead: "Ø25",
    frontCover: "Ø40",
    rearCover: "Ø40",
    nut: "M20x1.5"
  },
  // Ø50 Serisi
  "Ø50": {
    rodDiameter: "Ø30",
    pistonHead: "Ø50",
    rodHead: "Ø30",
    frontCover: "Ø50",
    rearCover: "Ø50",
    nut: "M24x1.5"
  },
  // Ø63 Serisi
  "Ø63": {
    rodDiameter: "Ø35", // Veya Ø40
    pistonHead: "Ø63",
    rodHead: "Ø35",
    frontCover: "Ø63",
    rearCover: "Ø63",
    nut: "M30x1.5"
  },
  // Ø80 Serisi
  "Ø80": {
    rodDiameter: "Ø45", // Veya Ø50
    pistonHead: "Ø80",
    rodHead: "Ø45",
    frontCover: "Ø80",
    rearCover: "Ø80",
    nut: "M36x2"
  },
  // Ø100 Serisi
  "Ø100": {
    rodDiameter: "Ø55", // Veya Ø60
    pistonHead: "Ø100",
    rodHead: "Ø55",
    frontCover: "Ø100",
    rearCover: "Ø100",
    nut: "M42x2"
  },
  // Ø125 Serisi
  "Ø125": {
    rodDiameter: "Ø70",
    pistonHead: "Ø125",
    rodHead: "Ø70",
    frontCover: "Ø125",
    rearCover: "Ø125",
    nut: "M56x2"
  },
   // Ø140 Serisi
   "Ø140": {
    rodDiameter: "Ø80",
    pistonHead: "Ø140",
    rodHead: "Ø80",
    frontCover: "Ø140",
    rearCover: "Ø140",
    nut: "M64x2"
  },
  // Ø160 Serisi
  "Ø160": {
    rodDiameter: "Ø90",
    pistonHead: "Ø160",
    rodHead: "Ø90",
    frontCover: "Ø160",
    rearCover: "Ø160",
    nut: "M72x2"
  },
  // Ø180 Serisi
  "Ø180": {
    rodDiameter: "Ø100",
    pistonHead: "Ø180",
    rodHead: "Ø100",
    frontCover: "Ø180",
    rearCover: "Ø180",
    nut: "M80x2"
  },
  // Ø200 Serisi
  "Ø200": {
    rodDiameter: "Ø110",
    pistonHead: "Ø200",
    rodHead: "Ø110",
    frontCover: "Ø200",
    rearCover: "Ø200",
    nut: "M90x2"
  },
  // Ø220 Serisi
  "Ø220": {
    rodDiameter: "Ø125",
    pistonHead: "Ø220",
    rodHead: "Ø125",
    frontCover: "Ø220",
    rearCover: "Ø220",
    nut: "M100x2"
  },
  // Ø250 Serisi
  "Ø250": {
    rodDiameter: "Ø140",
    pistonHead: "Ø250",
    rodHead: "Ø140",
    frontCover: "Ø250",
    rearCover: "Ø250",
    nut: "M110x2"
  }
};

// Bu nesneyi UI'da kullanmak için fonksiyonlar
export function getStandardDimensionsForBore(bore: string) {
  return STANDARD_DIMENSIONS[bore];
}

// Ana kategoriden diğer kategorilere mapping (column name -> property name)
export const COLUMN_MAPPING_FOR_STANDARDS: Record<string, keyof Omit<CylinderStandard, 'boreDiameter'>> = {
  "mil_capi": "rodDiameter",
  "piston_basi": "pistonHead",
  "mil_basi": "rodHead",
  "on_kapak": "frontCover",
  "arka_kapak": "rearCover",
  "somun": "nut",
  "kep_tasi": "rodHead", // Bazı isimlendirme farkları olabilir
};
