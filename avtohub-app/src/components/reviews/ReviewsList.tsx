import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getStoReviews } from "../../api/reviews";
import type { ReviewItem, ReviewsResponse } from "../../api/reviews";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= rating ? "h-4 w-4 fill-amber-400 text-amber-400" : "h-4 w-4 text-white/20"
          }
        />
      ))}
    </div>
  );
}

function formatDate(s: string): string {
  return new Date(s).toLocaleDateString("ru-KZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ReviewsList({ stoId }: { stoId: number }) {
  const [data, setData] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStoReviews(stoId)
      .then(setData)
      .catch(() => setData({ avg_rating: 0, total_reviews: 0, items: [] }))
      .finally(() => setLoading(false));
  }, [stoId]);

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-6">
        <div className="h-24 animate-pulse rounded-xl bg-white/10" />
      </div>
    );
  }

  if (!data || data.total_reviews === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white">Отзывы</h2>
        <p className="mt-2 text-white/60">Пока нет отзывов</p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-white/20 bg-white/5 p-6">
      <h2 className="text-lg font-semibold text-white">Отзывы</h2>
      <div className="mt-3 flex items-center gap-3">
        <Stars rating={Math.round(data.avg_rating)} />
        <span className="font-medium text-white">
          {data.avg_rating.toFixed(1)}
        </span>
        <span className="text-white/60">({data.total_reviews} отзывов)</span>
      </div>
      <ul className="mt-4 space-y-4">
        {data.items.map((r: ReviewItem, i: number) => (
          <li
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between">
              <Stars rating={r.rating} />
              <span className="text-sm text-white/60">
                {r.user_display} · {formatDate(r.created_at)}
              </span>
            </div>
            {r.comment && <p className="mt-2 text-white/90">{r.comment}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
