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
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm font-medium text-ceramic-700">
        Elegí un estilo de tendencia
      </legend>
      <div className="flex flex-wrap gap-2">
        {trends.map((trend) => {
          const isSelected = selected?.title === trend.title;
          return (
            <button
              key={trend.title}
              type="button"
              onClick={() => onSelect(trend)}
              aria-pressed={isSelected}
              className={`
                flex items-center gap-2.5 rounded-full px-4 py-2.5 text-sm
                transition-all duration-150 select-none
                ${
                  isSelected
                    ? 'bg-ceramic-700 text-white shadow-md ring-2 ring-ceramic-400 ring-offset-2'
                    : 'bg-white text-ceramic-700 shadow-sm ring-1 ring-ceramic-200 hover:bg-ceramic-50 hover:ring-ceramic-300 active:bg-ceramic-100'
                }
              `}
            >
              <span className="flex gap-1" aria-hidden="true">
                {trend.colors.map((color) => (
                  <span
                    key={color}
                    className={`inline-block h-3.5 w-3.5 rounded-full ${
                      isSelected ? 'ring-1 ring-white/40' : 'ring-1 ring-ceramic-200'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </span>
              <span>{trend.title}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
