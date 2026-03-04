import { useState } from "react";
import { Star } from "lucide-react";
import { createReview } from "../../api/reviews";
import { useToast } from "../../context/ToastContext";
import { Button } from "../ui/Button";

interface ReviewFormProps {
  bookingId: number;
  stoName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReviewForm({
  bookingId,
  stoName,
  onSuccess,
  onCancel,
}: ReviewFormProps) {
  const { addToast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReview({
        booking_id: bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      addToast("Отзыв добавлен", "success");
      onSuccess();
    } catch {
      addToast("Не удалось добавить отзыв", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#111827]/95 p-6 shadow-[0_0_50px_rgba(34,197,94,0.1)] backdrop-blur-xl">
        <h3 className="text-lg font-semibold text-white">
          Оставить отзыв
        </h3>
        <p className="mt-1 text-sm text-white/70">{stoName}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Оценка
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  className="rounded-lg p-2 transition-colors hover:bg-white/10"
                >
                  <Star
                    className={`h-8 w-8 ${
                      i <= rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-white/30"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-white/80">
              Комментарий (необязательно)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              placeholder="Расскажите о вашем опыте..."
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              className="flex-1"
            >
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-emerald-500 text-white hover:bg-emerald-600"
            >
              {submitting ? "Отправка..." : "Отправить"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
