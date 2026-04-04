'use client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PromptInput({ value, onChange }: PromptInputProps) {
  const remaining = 200 - value.length;
  const isNearLimit = remaining <= 20;

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="description"
        className="text-sm font-medium text-ceramic-700"
      >
        ¿Cómo es tu pieza?
      </label>
      <textarea
        id="description"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 200))}
        placeholder="Ej: taza rústica mate, color arcilla con toques azules"
        rows={3}
        maxLength={200}
        className="w-full resize-none rounded-xl border border-ceramic-200 bg-white px-4 py-3 text-base text-ceramic-800 placeholder-ceramic-400 transition-colors focus:border-ceramic-500 focus:outline-none focus:ring-2 focus:ring-ceramic-500/20"
      />
      <span
        className={`text-right text-xs ${
          isNearLimit ? 'font-medium text-amber-600' : 'text-ceramic-400'
        }`}
      >
        {value.length}/200
      </span>
    </div>
  );
}
