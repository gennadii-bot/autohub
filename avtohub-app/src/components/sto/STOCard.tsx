import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Star, MapPin, Heart } from "lucide-react";
import { getStoImageUrl } from "../../utils/media";

interface STOCardProps {
  isFavorite?: boolean;
  onFavoriteClick?: (stoId: number) => void;
  favoriteLoading?: boolean;
  sto: {
    id: number;
    city_id: number;
    name: string;
    address: string;
    description?: string | null;
    image_url?: string | null;
    rating: number;
    status?: string;
    slug?: string | null;
    city?: { name: string } | null;
  };
  index?: number;
}

export function STOCard({ sto, index = 0, isFavorite, onFavoriteClick, favoriteLoading }: STOCardProps) {
  const cityName = sto.city?.name ?? "";
  const hasImage = !!sto.image_url;
  const imageUrl = getStoImageUrl(sto.image_url);
  const isOpen = sto.status !== "rejected" && sto.status !== "blocked";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group"
    >
      <div className="overflow-hidden rounded-2xl bg-white/5 shadow-xl backdrop-blur transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(34,197,94,0.15)]">
        <Link to={`/sto/${sto.id}`} className="block">
          <div className="relative h-48 w-full overflow-hidden">
            {hasImage ? (
              <img
                src={imageUrl}
                alt={sto.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-800 to-gray-700 text-gray-400">
                Фото отсутствует
              </div>
            )}
            <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-t from-black/60 to-transparent" />
            {onFavoriteClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onFavoriteClick(sto.id);
                }}
                disabled={favoriteLoading}
                className={`absolute left-4 top-4 rounded-full p-2 backdrop-blur transition ${
                  isFavorite ? "bg-red-500/80 text-white" : "bg-black/60 text-white/80 hover:bg-red-500/50"
                }`}
                title={isFavorite ? "Удалить из избранного" : "Добавить в избранное"}
              >
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
            <div
              className={`absolute right-4 top-4 rounded-full px-3 py-1 text-sm font-medium backdrop-blur ${
                isOpen
                  ? "bg-emerald-500/80 text-white"
                  : "bg-red-500/80 text-white"
              }`}
            >
              {isOpen ? "Открыто" : "Закрыто"}
            </div>
            <div className="absolute right-4 top-12 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 text-sm font-medium backdrop-blur">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="text-amber-300">{sto.rating.toFixed(1)}</span>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-semibold text-white transition-colors group-hover:text-emerald-400">
              {sto.name}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-white/70">
              <MapPin className="h-4 w-4 shrink-0" />
              {sto.address}
              {cityName && `, ${cityName}`}
            </p>
            {sto.description && (
              <p className="mt-2 line-clamp-2 text-sm text-white/60">
                {sto.description}
              </p>
            )}
          </div>
        </Link>
        <div className="flex gap-2 p-4 pt-0">
          <Link
            to={`/book/${sto.slug || `sto-${sto.id}`}`}
            className="inline-flex flex-1 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-500 to-violet-500 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-500/20 transition-all duration-200 hover:opacity-90"
          >
            Записаться
          </Link>
          <Link
            to={`/sto/${sto.id}`}
            className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Подробнее
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
