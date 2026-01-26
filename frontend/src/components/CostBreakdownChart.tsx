import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { CostBreakdown } from '../types';
import { costLabels } from '../types';

interface CostBreakdownChartProps {
  breakdown: CostBreakdown;
}

const COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#6366f1', // indigo
  '#f43f5e', // rose
];

export function CostBreakdownChart({ breakdown }: CostBreakdownChartProps) {
  const data = Object.entries(breakdown)
    .map(([key, value]) => ({
      name: costLabels[key as keyof CostBreakdown],
      value: value,
      key,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      const percentage = ((item.value / total) * 100).toFixed(1);
      return (
        <div className="bg-white px-4 py-3 shadow-lg rounded-lg border border-gray-100">
          <p className="font-medium text-gray-900">{item.name}</p>
          <p className="text-sm text-gray-600">
            {item.value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
          <p className="text-xs text-gray-500">%{percentage}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
                stroke="white"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value: string) => (
              <span className="text-sm text-gray-700">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface CostBreakdownTableProps {
  breakdown: CostBreakdown;
}

export function CostBreakdownTable({ breakdown }: CostBreakdownTableProps) {
  const items = Object.entries(breakdown)
    .map(([key, value]) => ({
      label: costLabels[key as keyof CostBreakdown],
      value,
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-2">
      {items.map((item, index) => {
        const percentage = (item.value / total) * 100;
        return (
          <div key={index} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700">{item.label}</span>
                <span className="font-medium text-gray-900">
                  {item.value.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: COLORS[index % COLORS.length],
                  }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
