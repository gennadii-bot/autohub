import { api } from "./axios";

export interface SubmitStoRequestResult {
  id: string;
  message?: string;
}

export async function submitStoRequest(formData: FormData): Promise<SubmitStoRequestResult> {
  const { data } = await api.post<SubmitStoRequestResult>("/sto-requests", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
}
