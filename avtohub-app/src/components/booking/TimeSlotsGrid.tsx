import { motion } from "framer-motion";
import type { SlotItem } from "../../api/sto";

interface TimeSlotsGridProps {
  slots: SlotItem[];
  value: string | null;
  onChange: (time: string) => void;
  loading?: boolean;
}

function formatSlot(s: string): string {
  if (s.length >= 5) return s.slice(0, 5);
  return s;
}

export function TimeSlotsGrid({
  slots,
  value,
  onChange,
  loading = false,
}: TimeSlotsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl bg-white/10"
          />
        ))}
      </div>
    );
  }

  const hasAnySlot = slots.length > 0;
  const hasAvailableSlot = slots.some((s) => s.available);

  if (!hasAnySlot || !hasAvailableSlot) {
    return (
      <p className="rounded-xl bg-white/5 py-4 text-center text-sm text-white/60">
        На выбранную дату нет свободного времени
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((slot) => {
        const slotStr = formatSlot(slot.time);
        const isSelected = value === slot.time;
        const isAvailable = slot.available;
        return (
          <motion.button
            key={slot.time}
            type="button"
            disabled={!isAvailable}
            onClick={() => isAvailable && onChange(slot.time)}
            whileHover={isAvailable ? { scale: 1.02 } : undefined}
            whileTap={isAvailable ? { scale: 0.98 } : undefined}
            className={`
              rounded-xl px-4 py-3 text-sm font-medium transition-all
              ${!isAvailable
                ? "cursor-not-allowed opacity-40 bg-white/5 text-white/50"
                : isSelected
                  ? "bg-gradient-to-r from-emerald-500 to-violet-500 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-white/10 text-white hover:bg-white/20"
              }
            `}
          >
            {slotStr}
          </motion.button>
        );
      })}
    </div>
  );
}
