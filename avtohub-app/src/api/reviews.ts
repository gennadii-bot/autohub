import { api } from "./api";

export interface ReviewItem {
  rating: number;
  comment: string | null;
  created_at: string;
  user_display: string;
}

export interface ReviewsResponse {
  avg_rating: number;
  total_reviews: number;
  items: ReviewItem[];
}

export async function getStoReviews(stoId: number): Promise<ReviewsResponse> {
  const { data } = await api.get<ReviewsResponse>(`/sto/${stoId}/reviews`);
  return data ?? { avg_rating: 0, total_reviews: 0, items: [] };
}

export interface CreateReviewPayload {
  booking_id: number;
  rating: number;
  comment?: string;
}

export async function createReview(payload: CreateReviewPayload): Promise<void> {
  await api.post("/reviews", payload);
}
