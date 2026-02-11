import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { CostBreakdown } from '../types';
import { costLabels } from '../types';

interface CostBreakdownChartProps {
  breakdown: CostBreakdown;
  currency?: string;
  exchangeRate?: number;
}

const COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
];

export function CostBreakdownChart({ breakdown, currency = 'EUR', exchangeRate = 1 }: CostBreakdownChartProps) {
  const data = Object.entries(breakdown)
    .map(([key, value]) => ({
      name: costLabels[key as keyof CostBreakdown],
      value: value / exchangeRate,
      originalValue: value,
      key,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    if (currency === 'TRY') {
      return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white/95 backdrop-blur-sm px-4 py-3 shadow-xl rounded-xl border border-gray-200">
          <p className="font-semibold text-gray-900 mb-1">{item.name}</p>
          <p className="text-lg font-bold text-indigo-600">
            {formatCurrency(item.value)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Toplam içinde %{percentage}</p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // %5'ten küçükleri gösterme

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-semibold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="space-y-4">
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              {COLORS.map((color, index) => (
                <linearGradient key={index} id={`gradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={1} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              labelLine={false}
              label={renderCustomLabel}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#gradient-${index % COLORS.length})`}
                  stroke="white"
                  strokeWidth={3}
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-2">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.key} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-gray-600 truncate">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CostBreakdownTableProps {
  breakdown: CostBreakdown;
  currency?: string;
  exchangeRate?: number;
}

export function CostBreakdownTable({ breakdown, currency = 'TRY', exchangeRate = 1 }: CostBreakdownTableProps) {
  const items = Object.entries(breakdown)
    .map(([key, value]) => ({
      label: costLabels[key as keyof CostBreakdown],
      value: value / exchangeRate,
      key,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = items.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    if (currency === 'TRY') {
      return value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' });
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  };

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const percentage = (item.value / total) * 100;
        return (
          <div key={item.key} className="group">
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">
                  {item.label}
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${COLORS[index % COLORS.length]}, ${COLORS[index % COLORS.length]}dd)`,
                }}
              />
            </div>
          </div>
        );
      })}

      {/* Total */}
      <div className="pt-3 mt-3 border-t border-gray-200">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-gray-900">Toplam Maliyet</span>
          <span className="text-lg font-bold text-indigo-600">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
