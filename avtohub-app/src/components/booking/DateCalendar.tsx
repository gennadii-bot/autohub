import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import "react-day-picker/style.css";

const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

export interface ScheduleDay {
  day_of_week: number;
  is_working: boolean;
}

interface DateCalendarProps {
  value: string | null;
  onChange: (dateStr: string) => void;
  minDate?: Date;
  /** Days when STO is closed (0=Mon..6=Sun). If not provided, Sat/Sun disabled. */
  closedDaysOfWeek?: number[];
  /** Extra dates to disable (e.g. fully booked). */
  disabledDates?: Date[];
  className?: string;
}

export function DateCalendar({
  value,
  onChange,
  minDate = new Date(),
  closedDaysOfWeek,
  disabledDates = [],
  className = "",
}: DateCalendarProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = value ? new Date(value + "T12:00:00") : undefined;

  const closedSet = useMemo(() => {
    if (closedDaysOfWeek && closedDaysOfWeek.length > 0) {
      return new Set(closedDaysOfWeek);
    }
    return new Set([5, 6]);
  }, [closedDaysOfWeek]);

  const disabledSet = useMemo(
    () => new Set(disabledDates.map((d) => d.toISOString().slice(0, 10))),
    [disabledDates]
  );

  const isDisabled = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d < minDate) return true;
    const jsDow = d.getDay();
    const backendDow = jsDow === 0 ? 6 : jsDow - 1;
    if (closedSet.has(backendDow)) return true;
    if (disabledSet.has(d.toISOString().slice(0, 10))) return true;
    return false;
  };

  const handleSelect = (date: Date | undefined) => {
    if (!date) return;
    onChange(date.toISOString().slice(0, 10));
  };

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur [&_.rdp]:text-white ${className}`}
    >
      <style>{`
        .avtohub-rdp .rdp {
          --rdp-cell-size: 40px;
          --rdp-accent-color: transparent;
        }
        .avtohub-rdp .rdp-months { justify-content: center; }
        .avtohub-rdp .rdp-weekday { color: rgba(255,255,255,0.6); font-size: 0.75rem; }
        .avtohub-rdp .rdp-day { font-size: 0.875rem; }
        .avtohub-rdp .rdp-day:not(.rdp-disabled):not(.rdp-selected) { color: white; }
        .avtohub-rdp .rdp-day:not(.rdp-disabled):not(.rdp-selected):hover {
          background: rgba(255,255,255,0.1);
        }
        .avtohub-rdp .rdp-day.rdp-disabled { color: rgba(255,255,255,0.3); }
        .avtohub-rdp .rdp-day.rdp-selected {
          background: linear-gradient(135deg, rgb(16 185 129), rgb(139 92 246)) !important;
          color: white !important;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        }
        .avtohub-rdp .rdp-day.rdp-selected:hover {
          background: linear-gradient(135deg, rgb(20 184 166), rgb(124 58 237)) !important;
        }
        .avtohub-rdp .rdp-caption { display: flex; align-items: center; justify-content: space-between; padding: 0 0.5rem 1rem; }
        .avtohub-rdp .rdp-caption_label { font-weight: 500; color: white; }
        .avtohub-rdp .rdp-nav_button {
          width: 2rem; height: 2rem; border-radius: 0.5rem;
          color: rgba(255,255,255,0.7);
        }
        .avtohub-rdp .rdp-nav_button:hover {
          background: rgba(255,255,255,0.1); color: white;
        }
      `}</style>
      <div className="avtohub-rdp">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={isDisabled}
          defaultMonth={selectedDate ?? new Date(today.getFullYear(), today.getMonth())}
          showOutsideDays
          formatters={{
            formatCaption: (date) => `${MONTHS[date.getMonth()]} ${date.getFullYear()}`,
          }}
          components={{
            Chevron: ({ orientation }) =>
              orientation === "left" ? (
                <ChevronLeft className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              ),
          }}
        />
      </div>
    </div>
  );
}
