import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { CalculatorPage, ParametersPage } from './pages';
import type { PricingParameters } from './types';
import { defaultPricingParameters } from './types';

// LocalStorage keys
const STORAGE_KEYS = {
  CURRENCY: 'hidrolik_currency',
  EXCHANGE_RATE: 'hidrolik_exchange_rate',
  PARAMETERS: 'hidrolik_parameters',
};

function App() {
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.CURRENCY) || 'TRY';
  });

  const [exchangeRate, setExchangeRate] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATE);
    return saved ? parseFloat(saved) : 1;
  });

  const [parameters, setParameters] = useState<PricingParameters>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARAMETERS);
    return saved ? JSON.parse(saved) : defaultPricingParameters;
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
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Layout
              currency={currency}
              exchangeRate={exchangeRate}
              onCurrencyChange={handleCurrencyChange}
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
              <ParametersPage
                parameters={parameters}
                onSave={handleParametersSave}
              />
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
