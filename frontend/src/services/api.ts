import axios from 'axios';
import type {
  ManualPricingRequest,
  PricingResult,
  ImageAnalysisResult
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Manuel fiyatlandırma hesapla
export async function calculatePricing(
  request: ManualPricingRequest
): Promise<PricingResult> {
  const response = await api.post<PricingResult>('/api/pricing/calculate', request);
  return response.data;
}

// Teknik resim analiz et (base64)
export async function analyzeImage(
  imageBase64: string,
  fileName?: string
): Promise<ImageAnalysisResult> {
  const response = await api.post<ImageAnalysisResult>('/api/analysis/analyze', {
    image_base64: imageBase64,
    file_name: fileName,
  });
  return response.data;
}

// Dosya yükleyerek analiz et
export async function uploadAndAnalyze(file: File): Promise<ImageAnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<ImageAnalysisResult>('/api/analysis/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// Teknik resim analiz et ve direkt fiyatlandır
export async function analyzeAndPrice(
  file: File,
  profitMargin: number = 0.25
): Promise<PricingResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<PricingResult>(
    `/api/analysis/analyze-and-price?profit_margin=${profitMargin}`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

// Malzeme listesi
export async function getMaterials() {
  const response = await api.get('/api/pricing/materials');
  return response.data;
}

// Silindir tipleri
export async function getCylinderTypes() {
  const response = await api.get('/api/pricing/cylinder-types');
  return response.data;
}

// Bağlantı tipleri
export async function getMountingTypes() {
  const response = await api.get('/api/pricing/mounting-types');
  return response.data;
}

export default api;
