'use client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function PromptInput({ value, onChange }: PromptInputProps) {
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
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ej: rústica y mate, color arcilla con toques azules"
        rows={3}
        maxLength={200}
        className="w-full resize-none rounded-lg border border-ceramic-200 bg-white px-4 py-3 text-ceramic-800 placeholder-ceramic-400 focus:border-ceramic-500 focus:outline-none focus:ring-2 focus:ring-ceramic-500/20"
      />
      <span className="text-right text-xs text-ceramic-400">
        {value.length}/200
      </span>
    </div>
  );
}
