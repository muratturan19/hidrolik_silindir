import math
from ..models import (
    CylinderDimensions,
    MaterialType,
    CylinderType,
    MountingType,
    CostBreakdown,
    PricingResult
)
from ..config import get_settings


class PricingEngine:
    """Hidrolik silindir maliyet hesaplama motoru"""

    def __init__(self):
        self.settings = get_settings()

        # Malzeme çarpanları
        self.material_multipliers = {
            MaterialType.STEEL: 1.0,
            MaterialType.STAINLESS: 2.8,
            MaterialType.ALUMINUM: 1.5
        }

        # Malzeme yoğunlukları (g/cm³)
        self.material_densities = {
            MaterialType.STEEL: self.settings.steel_density,
            MaterialType.STAINLESS: self.settings.stainless_density,
            MaterialType.ALUMINUM: self.settings.aluminum_density
        }

        # Silindir tipi çarpanları
        self.cylinder_type_multipliers = {
            CylinderType.SINGLE_ACTING: 0.85,
            CylinderType.DOUBLE_ACTING: 1.0,
            CylinderType.TELESCOPIC: 2.5
        }

        # Bağlantı tipi maliyetleri (TL)
        self.mounting_costs = {
            MountingType.FLANGE: 450,
            MountingType.CLEVIS: 380,
            MountingType.TRUNNION: 520,
            MountingType.FOOT: 350,
            MountingType.TIE_ROD: 280
        }

    def calculate_tube_weight(
        self,
        bore_diameter: float,
        stroke_length: float,
        wall_thickness: float,
        material: MaterialType
    ) -> float:
        """Gövde ağırlığını hesapla (kg)"""
        # Ölçüleri cm'ye çevir
        inner_radius = bore_diameter / 20  # mm -> cm
        outer_radius = (bore_diameter + 2 * wall_thickness) / 20
        length = (stroke_length + 100) / 10  # Strok + kapak payı, cm

        # Hacim hesabı (cm³)
        volume = math.pi * (outer_radius**2 - inner_radius**2) * length

        # Ağırlık (kg)
        density = self.material_densities[material]
        return (volume * density) / 1000

    def calculate_rod_weight(
        self,
        rod_diameter: float,
        stroke_length: float,
        material: MaterialType
    ) -> float:
        """Piston mili ağırlığını hesapla (kg)"""
        radius = rod_diameter / 20  # mm -> cm
        length = (stroke_length + 150) / 10  # Strok + bağlantı payı, cm

        volume = math.pi * radius**2 * length
        density = self.material_densities[material]
        return (volume * density) / 1000

    def calculate_piston_weight(
        self,
        bore_diameter: float,
        rod_diameter: float,
        material: MaterialType
    ) -> float:
        """Piston ağırlığını hesapla (kg)"""
        outer_radius = (bore_diameter - 2) / 20  # Conta payı, cm
        inner_radius = rod_diameter / 20
        thickness = bore_diameter / 20  # Piston kalınlığı ~ çap/2, cm

        volume = math.pi * (outer_radius**2 - inner_radius**2) * thickness
        density = self.material_densities[material]
        return (volume * density) / 1000

    def calculate_end_caps_weight(
        self,
        bore_diameter: float,
        wall_thickness: float,
        material: MaterialType
    ) -> float:
        """Kapakların ağırlığını hesapla (kg)"""
        outer_radius = (bore_diameter + 2 * wall_thickness) / 20
        thickness = wall_thickness * 1.5 / 10  # Kapak kalınlığı, cm

        # 2 adet kapak
        volume = 2 * math.pi * outer_radius**2 * thickness
        density = self.material_densities[material]
        return (volume * density) / 1000

    def calculate_chrome_plating_area(
        self,
        rod_diameter: float,
        stroke_length: float
    ) -> float:
        """Krom kaplama alanını hesapla (cm²)"""
        circumference = math.pi * rod_diameter / 10  # cm
        length = (stroke_length + 50) / 10  # cm
        return circumference * length

    def calculate_machining_hours(
        self,
        dimensions: CylinderDimensions,
        cylinder_type: CylinderType
    ) -> float:
        """Tahmini işleme süresini hesapla (saat)"""
        # Temel işleme süresi
        base_hours = 2.0

        # Boyuta göre ek süre
        size_factor = (
            dimensions.bore_diameter / 50 +
            dimensions.stroke_length / 300 +
            dimensions.rod_diameter / 30
        )

        # Silindir tipine göre ek süre
        type_multiplier = self.cylinder_type_multipliers[cylinder_type]

        return base_hours * size_factor * type_multiplier

    def calculate_seal_cost(
        self,
        bore_diameter: float,
        rod_diameter: float,
        cylinder_type: CylinderType
    ) -> float:
        """Conta takımı maliyetini hesapla (TL)"""
        base_cost = self.settings.seal_kit_base_price

        # Çapa göre artış
        size_factor = 1 + (bore_diameter - 40) / 100

        # Çift etkili için ekstra contalar
        type_factor = 1.0 if cylinder_type == CylinderType.SINGLE_ACTING else 1.3

        return base_cost * size_factor * type_factor

    def calculate_pricing(
        self,
        dimensions: CylinderDimensions,
        material: MaterialType,
        cylinder_type: CylinderType,
        mounting_type: MountingType,
        profit_margin: float = 0.25
    ) -> PricingResult:
        """Tam fiyatlandırma hesapla"""

        # Et kalınlığı yoksa hesapla (basınca göre)
        if dimensions.wall_thickness is None:
            # Basit formül: t = P * D / (2 * S) + güvenlik payı
            # S = 250 MPa (çelik için izin verilen gerilme)
            pressure_mpa = (dimensions.working_pressure or 160) / 10
            min_thickness = (pressure_mpa * dimensions.bore_diameter) / (2 * 250) + 3
            wall_thickness = max(min_thickness, 6)  # Minimum 6mm
        else:
            wall_thickness = dimensions.wall_thickness

        # Malzeme çarpanı
        mat_mult = self.material_multipliers[material]
        steel_price = self.settings.steel_price_per_kg

        # Gövde maliyeti
        tube_weight = self.calculate_tube_weight(
            dimensions.bore_diameter,
            dimensions.stroke_length,
            wall_thickness,
            material
        )
        tube_cost = tube_weight * steel_price * mat_mult

        # Piston mili maliyeti
        rod_weight = self.calculate_rod_weight(
            dimensions.rod_diameter,
            dimensions.stroke_length,
            material
        )
        rod_cost = rod_weight * steel_price * mat_mult

        # Piston maliyeti
        piston_weight = self.calculate_piston_weight(
            dimensions.bore_diameter,
            dimensions.rod_diameter,
            material
        )
        piston_cost = piston_weight * steel_price * mat_mult

        # Kapak maliyeti
        caps_weight = self.calculate_end_caps_weight(
            dimensions.bore_diameter,
            wall_thickness,
            material
        )
        end_caps_cost = caps_weight * steel_price * mat_mult

        # Krom kaplama maliyeti
        chrome_area = self.calculate_chrome_plating_area(
            dimensions.rod_diameter,
            dimensions.stroke_length
        )
        chrome_plating_cost = chrome_area * self.settings.chrome_plating_per_cm2

        # Conta maliyeti
        seal_cost = self.calculate_seal_cost(
            dimensions.bore_diameter,
            dimensions.rod_diameter,
            cylinder_type
        )

        # İşleme maliyeti
        machining_hours = self.calculate_machining_hours(dimensions, cylinder_type)
        machining_cost = machining_hours * self.settings.labor_cost_per_hour

        # Montaj maliyeti (sabit 1.5 saat)
        assembly_cost = 1.5 * self.settings.labor_cost_per_hour

        # Bağlantı elemanı maliyeti
        mounting_cost = self.mounting_costs[mounting_type]

        # Maliyet dağılımı
        cost_breakdown = CostBreakdown(
            tube_cost=round(tube_cost, 2),
            rod_cost=round(rod_cost, 2),
            piston_cost=round(piston_cost, 2),
            seal_cost=round(seal_cost, 2),
            end_caps_cost=round(end_caps_cost, 2),
            chrome_plating_cost=round(chrome_plating_cost, 2),
            machining_cost=round(machining_cost, 2),
            assembly_cost=round(assembly_cost, 2),
            mounting_cost=round(mounting_cost, 2)
        )

        # Toplam hesaplama
        subtotal = (
            tube_cost + rod_cost + piston_cost + seal_cost +
            end_caps_cost + chrome_plating_cost + machining_cost +
            assembly_cost + mounting_cost
        )

        total_price = subtotal * (1 + profit_margin)

        return PricingResult(
            dimensions=dimensions,
            material=material,
            cylinder_type=cylinder_type,
            mounting_type=mounting_type,
            cost_breakdown=cost_breakdown,
            subtotal=round(subtotal, 2),
            profit_margin=profit_margin,
            total_price=round(total_price, 2)
        )
