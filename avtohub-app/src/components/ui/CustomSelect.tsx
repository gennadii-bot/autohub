import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  id?: string;
  /** Hero variant: rounded-2xl, bg-white/5, backdrop-blur-md */
  variant?: "default" | "hero";
}

const dropdownVariants = {
  closed: {
    opacity: 0,
    y: -8,
    scale: 0.96,
    transition: { duration: 0.15, ease: [0.4, 0, 0.2, 1] as const },
  },
  open: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] as const },
  },
};

export function CustomSelect({
  label,
  options,
  value,
  onChange,
  disabled = false,
  placeholder = "Выберите...",
  id,
  variant = "default",
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

  const handleSelect = (opt: CustomSelectOption) => {
    onChange(opt.value);
    setIsOpen(false);
  };

  const selectId = id ?? label?.toLowerCase().replace(/\s/g, "-");

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-sm font-medium text-white/80"
        >
          {label}
        </label>
      )}
      <button
        id={selectId}
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={label ?? "Выбор"}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`
          flex w-full items-center justify-between gap-2 border border-white/20
          px-4 py-3 text-left text-white placeholder-white/50
          transition-all duration-200
          hover:border-white/30
          focus:border-emerald-500/70 focus:outline-none focus:ring-2 focus:ring-emerald-500/30
          disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-white/20
          ${variant === "hero" ? "rounded-2xl bg-white/5 backdrop-blur-md hover:bg-white/10" : "rounded-xl bg-white/10 backdrop-blur-sm hover:bg-white/15"}
          ${!selectedOption ? "text-white/60" : ""}
        `}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-white/60 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="closed"
            animate="open"
            exit="closed"
            role="listbox"
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-56 overflow-hidden rounded-xl border border-white/20 bg-white/10 shadow-xl backdrop-blur-xl"
          >
            <div className="custom-select-scroll max-h-56 overflow-y-auto py-1">
              {options.length === 0 ? (
                <div className="px-4 py-3 text-center text-sm text-white/50">
                  Нет вариантов
                </div>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    onClick={() => handleSelect(opt)}
                    className={`
                      w-full px-4 py-2.5 text-left text-sm transition-colors
                      hover:bg-white/15
                      ${opt.value === value ? "bg-white/15 text-emerald-300" : "text-white"}
                    `}
                  >
                    {opt.label}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
