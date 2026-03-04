import type { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, id, name, className = "", ...props }: InputProps) {
  const inputId = id ?? name ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700">
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        className={`mt-1 w-full rounded-xl border px-4 py-3 text-neutral-900 outline-none transition focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 ${
          error ? "border-red-500" : "border-neutral-300 focus:border-blue-500"
        } ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
