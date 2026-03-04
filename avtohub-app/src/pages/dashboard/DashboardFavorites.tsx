import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { getFavorites, removeFavorite, type FavoriteSto } from "../../api/favorites";
import { getStoImageUrl } from "../../utils/media";
import { useToast } from "../../context/ToastContext";

export function DashboardFavorites() {
  const { addToast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteSto[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await getFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const status = err && typeof err === "object" && "response" in err
        ? (err as { response?: { status?: number } }).response?.status
        : null;
      if (status !== 401) addToast("Не удалось загрузить избранное", "error");
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const handleRemove = async (stoId: number) => {
    setRemovingId(stoId);
    try {
      await removeFavorite(stoId);
      setFavorites((prev) => prev.filter((f) => f.sto_id !== stoId));
      addToast("Удалено из избранного", "success");
    } catch {
      addToast("Не удалось удалить", "error");
    } finally {
      setRemovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h1 className="text-2xl font-semibold text-white sm:text-3xl">Избранное</h1>

      {favorites.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-white/[0.04] p-12 text-center backdrop-blur-xl">
          <Heart className="mx-auto h-12 w-12 text-white/30" />
          <p className="mt-4 text-white/70">Нет избранных СТО</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <motion.div
              key={f.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative overflow-hidden rounded-2xl border border-white/5 bg-white/[0.04] backdrop-blur-xl transition-all hover:border-emerald-500/30"
            >
              <Link to={`/sto/${f.sto_id}`} className="block">
                <div className="aspect-video overflow-hidden">
                  <img
                    src={getStoImageUrl(f.sto_image_url)}
                    alt={f.sto_name}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-white group-hover:text-emerald-400">
                    {f.sto_name}
                  </h3>
                  <p className="mt-1 text-sm text-white/60">{f.sto_address}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(f.sto_id)}
                disabled={removingId === f.sto_id}
                className="absolute right-3 top-3 rounded-full bg-red-500/80 p-2 text-white transition hover:bg-red-500 disabled:opacity-50"
                title="Удалить из избранного"
              >
                <Heart className="h-4 w-4 fill-current" />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
