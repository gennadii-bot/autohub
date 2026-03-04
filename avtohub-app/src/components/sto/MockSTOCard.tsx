import { motion } from "framer-motion";
import { Star, MapPin } from "lucide-react";
import type { StoListItem } from "../../data/mockStos";

interface MockSTOCardProps {
  sto: StoListItem;
  index?: number;
}

export function MockSTOCard({ sto, index = 0 }: MockSTOCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="overflow-hidden rounded-2xl bg-white/5 shadow-xl backdrop-blur"
    >
      <div className="flex h-48 w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-700 text-gray-400">
        Фото отсутствует
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-white">{sto.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-amber-400">
          <Star className="h-4 w-4 fill-current" />
          {sto.rating}
        </p>
        <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
          <MapPin className="h-4 w-4 shrink-0" />
          {sto.address}
        </p>
        <span className="mt-4 inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white/50">
          Записаться (пример)
        </span>
      </div>
    </motion.div>
  );
}
