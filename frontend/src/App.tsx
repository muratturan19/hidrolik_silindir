import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CalculatorPage, ParametersPage, ExcelSettingsPage, UserManagementPage } from './pages';
import type { PricingParameters, UserInfo } from './types';
import { defaultPricingParameters } from './types';
import { checkAuth } from './services/api';
import { APP_CONFIG } from './config';

// LocalStorage keys
const STORAGE_KEYS = {
  CURRENCY: 'hidrolik_currency',
  EXCHANGE_RATE: 'hidrolik_exchange_rate',
  PARAMETERS: 'hidrolik_parameters',
};

// Deep merge function to combine saved parameters with defaults
function deepMerge<T extends object>(defaults: T, saved: Partial<T> | null): T {
  if (!saved) return defaults;

  const result = { ...defaults };

  for (const key in saved) {
    if (Object.prototype.hasOwnProperty.call(saved, key)) {
      const savedValue = saved[key];
      const defaultValue = defaults[key];

      if (
        savedValue !== null &&
        typeof savedValue === 'object' &&
        !Array.isArray(savedValue) &&
        defaultValue !== null &&
        typeof defaultValue === 'object' &&
        !Array.isArray(defaultValue)
      ) {
        // Recursively merge nested objects
        (result as Record<string, unknown>)[key] = deepMerge(
          defaultValue as object,
          savedValue as object
        );
      } else if (savedValue !== undefined) {
        (result as Record<string, unknown>)[key] = savedValue;
      }
    }
  }

  return result;
}

function App() {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'EUR';
  });

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Standalone modda her zaman admin olarak çalış
    if (!APP_CONFIG.IS_PORTAL) {
      setUserInfo({
        username: 'admin',
        is_admin: true,
        role: 'admin',
        isAuthenticated: true
      });
      return;
    }
    checkAuth().then(setUserInfo);
  }, []);

  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE);
    return saved ? parseFloat(saved) : 1;
  });

  const [parameters, setParameters] = useState<PricingParameters>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARAMETERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure new fields are present
        return deepMerge(defaultPricingParameters, parsed);
      } catch {
        return defaultPricingParameters;
      }
    }
    return defaultPricingParameters;
  });

  // Save to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CURRENCY, currency);
  }, [currency]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATE, exchangeRate.toString());
  }, [exchangeRate]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARAMETERS, JSON.stringify(parameters));
  }, [parameters]);

  const handleCurrencyChange = (newCurrency: string, rate: number) => {
    setCurrency(newCurrency);
    setExchangeRate(rate);
  };

  const handleParametersSave = (newParams: PricingParameters) => {
    setParameters(newParams);
  };

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              currency={currency}
              exchangeRate={exchangeRate}
              onCurrencyChange={handleCurrencyChange}
              userInfo={userInfo}
            />
          }
        >
          <Route
            index
            element={
              <CalculatorPage
                currency={currency}
                exchangeRate={exchangeRate}
                parameters={parameters}
              />
            }
          />
          <Route
            path="parameters"
            element={
              <ProtectedRoute>
                <ParametersPage
                  parameters={parameters}
                  onSave={handleParametersSave}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="excel-settings"
            element={
              <ProtectedRoute>
                <ExcelSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="users"
            element={
              <ProtectedRoute>
                <UserManagementPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="history"
            element={
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-gray-500 text-lg">Geçmiş hesaplamalar</p>
                  <p className="text-gray-400 text-sm mt-2">Yakında eklenecek...</p>
                </div>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
