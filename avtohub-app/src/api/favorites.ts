import { api } from "./api";

export interface FavoriteSto {
  id: number;
  sto_id: number;
  sto_name: string;
  sto_image_url: string | null;
  sto_address: string;
}

export async function getFavorites(): Promise<FavoriteSto[]> {
  const { data } = await api.get<FavoriteSto[]>("/favorites");
  return data ?? [];
}

export async function addFavorite(stoId: number): Promise<void> {
  await api.post(`/favorites/${stoId}`);
}

export async function removeFavorite(stoId: number): Promise<void> {
  await api.delete(`/favorites/${stoId}`);
}
