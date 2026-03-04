import type { SelectHTMLAttributes } from "react";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  options,
  placeholder = "Выберите...",
  id,
  className = "",
  ...props
}: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`mt-1 w-full rounded-xl border border-neutral-300 px-4 py-3 text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${className}`}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
