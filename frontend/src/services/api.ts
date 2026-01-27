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

// ===============================
// Excel Tabanlı Fiyatlandırma API
// ===============================

export interface ExcelPricingColumn {
  name: string;
  display_name: string;
  options: Array<{
    value: string;
    label: string;
    price: number;
  }>;
}

export interface ExcelPricingOptions {
  success: boolean;
  columns: ExcelPricingColumn[];
  metadata?: Record<string, unknown>;
}

export interface ExcelPriceResult {
  success: boolean;
  items: Array<{
    name: string;
    value: string;
    price: number;
  }>;
  total: number;
  currency: string;
}

// Excel dosyası yükle
export async function uploadExcelPricing(file: File): Promise<{
  success: boolean;
  message: string;
  format: string;
  categories: string[];
  total_options: number;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/excel-pricing/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
}

// Dropdown seçeneklerini getir
export async function getExcelPricingOptions(): Promise<ExcelPricingOptions> {
  const response = await api.get('/excel-pricing/options');
  return response.data;
}

// Fiyat hesapla
export async function calculateExcelPrice(
  selections: Record<string, string>
): Promise<ExcelPriceResult> {
  const response = await api.post('/excel-pricing/calculate', { selections });
  return response.data;
}

// Excel durumunu kontrol et
export async function getExcelPricingStatus(): Promise<{
  loaded: boolean;
  column_count?: number;
  columns?: string[];
  message?: string;
}> {
  const response = await api.get('/excel-pricing/status');
  return response.data;
}

// Excel verisini temizle
export async function clearExcelPricing(): Promise<{ success: boolean; message: string }> {
  const response = await api.delete('/excel-pricing/clear');
  return response.data;
}

export default api;
