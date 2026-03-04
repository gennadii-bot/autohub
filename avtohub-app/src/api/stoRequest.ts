import { api } from "./api";

export interface STORequestPayload {
  name: string;
  city_id: number;
  address: string;
  phone: string;
  whatsapp: string | null;
  description: string;
}

export interface STORequestResponse {
  success: boolean;
  message: string;
}

export async function submitStoRequest(
  payload: STORequestPayload
): Promise<STORequestResponse> {
  const { data } = await api.post<STORequestResponse>("/sto/request", payload);
  return data;
}
