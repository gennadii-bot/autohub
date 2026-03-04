import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import type { ToastType } from "../../context/ToastContext";

const typeStyles: Record<ToastType, string> = {
  success: "border-emerald-500/50 bg-emerald-500/20 text-emerald-200",
  error: "border-red-500/50 bg-red-500/20 text-red-200",
  info: "border-white/20 bg-white/10 text-white",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 sm:left-auto sm:right-4 sm:max-w-sm">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.2 }}
            className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm backdrop-blur-md ${typeStyles[t.type]}`}
          >
            <span>{t.message}</span>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="shrink-0 rounded p-1 hover:bg-white/20"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
