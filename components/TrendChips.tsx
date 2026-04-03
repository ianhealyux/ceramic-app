'use client';

import type { Trend } from '@/types';

interface TrendChipsProps {
  trends: Trend[];
  selected: Trend | null;
  onSelect: (trend: Trend) => void;
}

export default function TrendChips({
  trends,
  selected,
  onSelect,
}: TrendChipsProps) {
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium text-ceramic-700">
        Elegí un estilo de tendencia
      </label>
      <div className="flex flex-wrap gap-2">
        {trends.map((trend) => {
          const isSelected = selected?.title === trend.title;
          return (
            <button
              key={trend.title}
              onClick={() => onSelect(trend)}
              className={`
                flex items-center gap-2 rounded-full px-4 py-2 text-sm
                transition-all duration-200
                ${
                  isSelected
                    ? 'bg-ceramic-600 text-white shadow-md'
                    : 'bg-white text-ceramic-700 shadow-sm hover:bg-ceramic-100 hover:shadow'
                }
                border border-ceramic-200
              `}
            >
              <div className="flex gap-1">
                {trend.colors.map((color) => (
                  <span
                    key={color}
                    className="inline-block h-3 w-3 rounded-full border border-white/50"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span>{trend.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
