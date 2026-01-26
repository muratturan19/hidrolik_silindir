import json
import re
from openai import AsyncOpenAI
from ..models import (
    CylinderDimensions,
    MaterialType,
    CylinderType,
    MountingType,
    ImageAnalysisResult
)
from ..config import get_settings


class ImageAnalyzer:
    """GPT-5.2 ile teknik resim analizi"""

    def __init__(self):
        self.settings = get_settings()
        self.client = AsyncOpenAI(api_key=self.settings.openai_api_key)
        self.model = self.settings.openai_model

    async def analyze_technical_drawing(
        self,
        image_base64: str,
        file_name: str | None = None
    ) -> ImageAnalysisResult:
        """Teknik resimden hidrolik silindir ölçülerini çıkar"""

        system_prompt = """Sen bir hidrolik silindir teknik resim analiz uzmanısın.
Verilen teknik resimden hidrolik silindir ölçülerini çıkarman gerekiyor.

Çıkarman gereken bilgiler:
1. bore_diameter: Silindir iç çapı (mm)
2. rod_diameter: Piston mili çapı (mm)
3. stroke_length: Strok boyu (mm)
4. wall_thickness: Gövde et kalınlığı (mm) - eğer görünüyorsa
5. working_pressure: Çalışma basıncı (bar) - eğer belirtilmişse

Ayrıca tespit edebilirsen:
- material: Malzeme tipi (steel, stainless, aluminum)
- cylinder_type: Silindir tipi (single_acting, double_acting, telescopic)
- mounting_type: Bağlantı tipi (flange, clevis, trunnion, foot, tie_rod)

Yanıtını SADECE aşağıdaki JSON formatında ver, başka açıklama ekleme:
{
    "success": true/false,
    "dimensions": {
        "bore_diameter": sayı,
        "rod_diameter": sayı,
        "stroke_length": sayı,
        "wall_thickness": sayı veya null,
        "working_pressure": sayı veya null
    },
    "material": "steel" | "stainless" | "aluminum" | null,
    "cylinder_type": "single_acting" | "double_acting" | "telescopic" | null,
    "mounting_type": "flange" | "clevis" | "trunnion" | "foot" | "tie_rod" | null,
    "confidence": 0-1 arası güven skoru,
    "notes": "Ek notlar veya tespit edilemeyen bilgiler"
}

Eğer görüntü bir teknik resim değilse veya ölçüler okunamıyorsa:
{
    "success": false,
    "error": "Hata açıklaması",
    "confidence": 0
}
"""

        user_prompt = "Bu teknik resimden hidrolik silindir ölçülerini çıkar."
        if file_name:
            user_prompt += f" Dosya adı: {file_name}"

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": user_prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{image_base64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.1
            )

            result_text = response.choices[0].message.content

            # JSON parse
            json_match = re.search(r'\{[\s\S]*\}', result_text)
            if not json_match:
                return ImageAnalysisResult(
                    success=False,
                    error_message="AI yanıtı JSON formatında değil",
                    raw_analysis=result_text
                )

            result_data = json.loads(json_match.group())

            if not result_data.get("success", False):
                return ImageAnalysisResult(
                    success=False,
                    error_message=result_data.get("error", "Analiz başarısız"),
                    confidence=result_data.get("confidence", 0),
                    raw_analysis=result_text
                )

            # Boyutları çıkar
            dims_data = result_data.get("dimensions", {})
            dimensions = CylinderDimensions(
                bore_diameter=dims_data.get("bore_diameter"),
                rod_diameter=dims_data.get("rod_diameter"),
                stroke_length=dims_data.get("stroke_length"),
                wall_thickness=dims_data.get("wall_thickness"),
                working_pressure=dims_data.get("working_pressure", 160)
            )

            # Enum değerlerini çevir
            material = None
            if result_data.get("material"):
                try:
                    material = MaterialType(result_data["material"])
                except ValueError:
                    pass

            cylinder_type = None
            if result_data.get("cylinder_type"):
                try:
                    cylinder_type = CylinderType(result_data["cylinder_type"])
                except ValueError:
                    pass

            mounting_type = None
            if result_data.get("mounting_type"):
                try:
                    mounting_type = MountingType(result_data["mounting_type"])
                except ValueError:
                    pass

            return ImageAnalysisResult(
                success=True,
                dimensions=dimensions,
                detected_material=material,
                detected_cylinder_type=cylinder_type,
                detected_mounting_type=mounting_type,
                confidence=result_data.get("confidence", 0.8),
                raw_analysis=result_data.get("notes")
            )

        except json.JSONDecodeError as e:
            return ImageAnalysisResult(
                success=False,
                error_message=f"JSON parse hatası: {str(e)}",
                raw_analysis=result_text if 'result_text' in locals() else None
            )
        except Exception as e:
            return ImageAnalysisResult(
                success=False,
                error_message=f"Analiz hatası: {str(e)}"
            )
