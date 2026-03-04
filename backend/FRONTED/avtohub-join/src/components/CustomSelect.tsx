import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  label?: string;
  options: CustomSelectOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CustomSelect({
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Выберите...",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayText = selectedOption?.label ?? placeholder;

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-white/80">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-left text-white transition hover:border-white/30 focus:border-emerald-500/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={!selectedOption ? "text-white/60" : ""}>{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-y-auto rounded-xl border border-white/20 bg-black/90 py-1 backdrop-blur-xl">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/15 ${
                opt.value === value ? "bg-white/15 text-emerald-300" : "text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
