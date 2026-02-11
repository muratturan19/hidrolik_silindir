import axios from 'axios';
import type {
  ManualPricingRequest,
  PricingResult,
  ImageAnalysisResult,
  UserInfo
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/hidrolik-api';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Check Authentication
export async function checkAuth(): Promise<UserInfo> {
  try {
    const response = await api.get<UserInfo>('/auth/me');
    return response.data;
  } catch (error) {
    return {
      username: '',
      role: 'guest',
      is_admin: false,
      isAuthenticated: false
    };
  }
}

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
  is_meter_based?: boolean;  // Metre bazlı mı?
  formula_add_mm?: number;   // Strok'a eklenecek mm
}

export interface ExcelPricingOptions {
  success: boolean;
  columns: ExcelPricingColumn[];
  metadata?: Record<string, unknown>;
}

export interface ExcelPriceItem {
  name: string;
  value: string;
  unit_price: number;
  unit: string;       // "€/m" veya "€/adet"
  price: number;
  // Metre bazlı hesaplamalar için
  length_mm?: number;
  length_m?: number;
  formula?: string;
  // Sabit fiyatlar için
  quantity?: number;
}

export interface ExcelPriceResult {
  success: boolean;
  items: ExcelPriceItem[];
  total: number;
  stroke_mm?: number;
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
  selections: Record<string, string>,
  stroke_mm: number = 0,
  manual_prices?: Record<string, number>
): Promise<ExcelPriceResult> {
  const response = await api.post('/excel-pricing/calculate', { 
    selections, 
    stroke_mm,
    manual_prices: manual_prices || {}
  });
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

// Yeni option ekle
export async function addPricingOption(
  columnName: string,
  value: string,
  price: number,
  discount: number = 0,
  offset: number = 0
): Promise<{ success: boolean; message: string }> {
  const response = await api.post('/excel-pricing/add-option', {
    column_name: columnName,
    value,
    price,
    discount,
    offset
  });
  return response.data;
}

// ===============================
// Formül Ayarları API
// ===============================
// User Management APIs
// ===============================
export default api;
