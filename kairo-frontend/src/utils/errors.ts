import axios from 'axios';

interface ApiErrorPayload {
  detail?: string;
}

export function getApiErrorDetail(error: unknown, fallback: string): string {
  if (!axios.isAxiosError<ApiErrorPayload>(error)) {
    return fallback;
  }

  return error.response?.data?.detail ?? fallback;
}
