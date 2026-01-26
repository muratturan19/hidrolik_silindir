import math
from ..models import (
    CylinderDimensions,
    MaterialType,
    CylinderType,
    MountingType,
    CostBreakdown,
    PricingResult,
    PricingParameters
)


class PricingEngine:
    """Hidrolik silindir maliyet hesaplama motoru"""

    def __init__(self, params: PricingParameters | None = None):
        """
        Args:
            params: Fiyatlandırma parametreleri. None ise varsayılan değerler kullanılır.
        """
        self.params = params or PricingParameters()

    def get_material_multiplier(self, material: MaterialType) -> float:
        """Malzeme çarpanını döndür"""
        multipliers = {
            MaterialType.STEEL: self.params.material_multipliers.steel,
            MaterialType.STAINLESS: self.params.material_multipliers.stainless,
            MaterialType.ALUMINUM: self.params.material_multipliers.aluminum
        }
        return multipliers[material]

    def get_material_density(self, material: MaterialType) -> float:
        """Malzeme yoğunluğunu döndür (g/cm³)"""
        densities = {
            MaterialType.STEEL: self.params.material_densities.steel,
            MaterialType.STAINLESS: self.params.material_densities.stainless,
            MaterialType.ALUMINUM: self.params.material_densities.aluminum
        }
        return densities[material]

    def get_material_price(self, material: MaterialType) -> float:
        """Malzeme fiyatını döndür (TL/kg)"""
        prices = {
            MaterialType.STEEL: self.params.material_prices.steel,
            MaterialType.STAINLESS: self.params.material_prices.stainless,
            MaterialType.ALUMINUM: self.params.material_prices.aluminum
        }
        return prices[material]

    def get_cylinder_type_multiplier(self, cylinder_type: CylinderType) -> float:
        """Silindir tipi çarpanını döndür"""
        multipliers = {
            CylinderType.SINGLE_ACTING: self.params.cylinder_type_multipliers.single_acting,
            CylinderType.DOUBLE_ACTING: self.params.cylinder_type_multipliers.double_acting,
            CylinderType.TELESCOPIC: self.params.cylinder_type_multipliers.telescopic
        }
        return multipliers[cylinder_type]

    def get_mounting_cost(self, mounting_type: MountingType) -> float:
        """Bağlantı elemanı maliyetini döndür (TL)"""
        costs = {
            MountingType.FLANGE: self.params.mounting_prices.flange,
            MountingType.CLEVIS: self.params.mounting_prices.clevis,
            MountingType.TRUNNION: self.params.mounting_prices.trunnion,
            MountingType.FOOT: self.params.mounting_prices.foot,
            MountingType.TIE_ROD: self.params.mounting_prices.tie_rod
        }
        return costs[mounting_type]

    def calculate_tube_weight(
        self,
        bore_diameter: float,
        stroke_length: float,
        wall_thickness: float,
        material: MaterialType
    ) -> float:
        """Gövde ağırlığını hesapla (kg)"""
        geo = self.params.geometry_coefficients

        # Ölçüleri cm'ye çevir
        inner_radius = bore_diameter / 20  # mm -> cm
        outer_radius = (bore_diameter + 2 * wall_thickness) / 20
        length = (stroke_length + geo.tube_extra_length) / 10  # Strok + kapak payı, cm

        # Hacim hesabı (cm³)
        volume = math.pi * (outer_radius**2 - inner_radius**2) * length

        # Ağırlık (kg)
        density = self.get_material_density(material)
        return (volume * density) / 1000

    def calculate_rod_weight(
        self,
        rod_diameter: float,
        stroke_length: float,
        material: MaterialType
    ) -> float:
        """Piston mili ağırlığını hesapla (kg)"""
        geo = self.params.geometry_coefficients

        radius = rod_diameter / 20  # mm -> cm
        length = (stroke_length + geo.rod_extra_length) / 10  # Strok + bağlantı payı, cm

        volume = math.pi * radius**2 * length
        density = self.get_material_density(material)
        return (volume * density) / 1000

    def calculate_piston_weight(
        self,
        bore_diameter: float,
        rod_diameter: float,
        material: MaterialType
    ) -> float:
        """Piston ağırlığını hesapla (kg)"""
        geo = self.params.geometry_coefficients

        outer_radius = (bore_diameter - geo.piston_seal_clearance) / 20  # Conta payı, cm
        inner_radius = rod_diameter / 20
        thickness = bore_diameter * geo.piston_thickness_ratio / 10  # Piston kalınlığı, cm

        volume = math.pi * (outer_radius**2 - inner_radius**2) * thickness
        density = self.get_material_density(material)
        return (volume * density) / 1000

    def calculate_end_caps_weight(
        self,
        bore_diameter: float,
        wall_thickness: float,
        material: MaterialType
    ) -> float:
        """Kapakların ağırlığını hesapla (kg)"""
        geo = self.params.geometry_coefficients

        outer_radius = (bore_diameter + 2 * wall_thickness) / 20
        thickness = wall_thickness * geo.end_cap_thickness_ratio / 10  # Kapak kalınlığı, cm

        # 2 adet kapak
        volume = 2 * math.pi * outer_radius**2 * thickness
        density = self.get_material_density(material)
        return (volume * density) / 1000

    def calculate_chrome_plating_area(
        self,
        rod_diameter: float,
        stroke_length: float
    ) -> float:
        """Krom kaplama alanını hesapla (cm²)"""
        geo = self.params.geometry_coefficients

        circumference = math.pi * rod_diameter / 10  # cm
        length = (stroke_length + geo.chrome_extra_length) / 10  # cm
        return circumference * length

    def calculate_machining_hours(
        self,
        dimensions: CylinderDimensions,
        cylinder_type: CylinderType
    ) -> float:
        """Tahmini işleme süresini hesapla (saat)"""
        mc = self.params.machining_coefficients

        # Temel işleme süresi
        base_hours = mc.base_hours

        # Boyuta göre ek süre
        size_factor = (
            dimensions.bore_diameter / mc.bore_diameter_divisor +
            dimensions.stroke_length / mc.stroke_length_divisor +
            dimensions.rod_diameter / mc.rod_diameter_divisor
        )

        # Silindir tipine göre ek süre
        type_multiplier = self.get_cylinder_type_multiplier(cylinder_type)

        return base_hours * size_factor * type_multiplier

    def calculate_seal_cost(
        self,
        bore_diameter: float,
        rod_diameter: float,
        cylinder_type: CylinderType
    ) -> float:
        """Conta takımı maliyetini hesapla (TL)"""
        sc = self.params.seal_coefficients

        # Çapa göre baz fiyat belirleme
        if bore_diameter < 50:
            base_cost = self.params.seal_prices.small
        elif bore_diameter < 100:
            base_cost = self.params.seal_prices.medium
        else:
            base_cost = self.params.seal_prices.large

        # Çapa göre artış
        size_factor = 1 + (bore_diameter - sc.base_diameter) / sc.diameter_divisor

        # Çift etkili için ekstra contalar
        type_factor = 1.0 if cylinder_type == CylinderType.SINGLE_ACTING else sc.double_acting_multiplier

        return base_cost * size_factor * type_factor

    def calculate_wall_thickness(
        self,
        bore_diameter: float,
        working_pressure: float
    ) -> float:
        """Basınca göre gerekli et kalınlığını hesapla (mm)"""
        wt = self.params.wall_thickness_coefficients

        # Basınç MPa'ya çevir
        pressure_mpa = working_pressure / 10

        # t = P * D / (2 * S) + güvenlik payı
        min_thickness = (pressure_mpa * bore_diameter) / (2 * wt.stress_limit) + wt.safety_margin

        return max(min_thickness, wt.minimum_thickness)

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
            wall_thickness = self.calculate_wall_thickness(
                dimensions.bore_diameter,
                dimensions.working_pressure or 160
            )
        else:
            wall_thickness = dimensions.wall_thickness

        # Malzeme çarpanı ve fiyatı
        mat_mult = self.get_material_multiplier(material)
        mat_price = self.get_material_price(material)

        # Gövde maliyeti
        tube_weight = self.calculate_tube_weight(
            dimensions.bore_diameter,
            dimensions.stroke_length,
            wall_thickness,
            material
        )
        tube_cost = tube_weight * mat_price * mat_mult

        # Piston mili maliyeti
        rod_weight = self.calculate_rod_weight(
            dimensions.rod_diameter,
            dimensions.stroke_length,
            material
        )
        rod_cost = rod_weight * mat_price * mat_mult

        # Piston maliyeti
        piston_weight = self.calculate_piston_weight(
            dimensions.bore_diameter,
            dimensions.rod_diameter,
            material
        )
        piston_cost = piston_weight * mat_price * mat_mult

        # Kapak maliyeti
        caps_weight = self.calculate_end_caps_weight(
            dimensions.bore_diameter,
            wall_thickness,
            material
        )
        end_caps_cost = caps_weight * mat_price * mat_mult

        # Krom kaplama maliyeti
        chrome_area = self.calculate_chrome_plating_area(
            dimensions.rod_diameter,
            dimensions.stroke_length
        )
        chrome_plating_cost = chrome_area * self.params.chrome_plating_price

        # Conta maliyeti
        seal_cost = self.calculate_seal_cost(
            dimensions.bore_diameter,
            dimensions.rod_diameter,
            cylinder_type
        )

        # İşleme maliyeti
        machining_hours = self.calculate_machining_hours(dimensions, cylinder_type)
        machining_cost = machining_hours * self.params.labor_rates.machining

        # Montaj maliyeti
        assembly_cost = self.params.assembly_hours * self.params.labor_rates.assembly

        # Bağlantı elemanı maliyeti
        mounting_cost = self.get_mounting_cost(mounting_type)

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
