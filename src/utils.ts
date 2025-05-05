// utils/request.ts
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

export async function retryableRequest<T = any>(
  config: AxiosRequestConfig,
  maxRetries = 3,
  retryDelay = 1000 // 毫秒
): Promise<AxiosResponse<T>> {
  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    try {
      const response = await axios.request<T>(config);
      return response;
    } catch (error) {
      lastError = error;
      attempt++;

      const status = (error as any)?.response?.status;
      const shouldRetry = !status || (status >= 500 && status < 600); // 网络错误或5xx错误时重试

      if (!shouldRetry || attempt >= maxRetries) {
        break;
      }

      await delay(retryDelay);
    }
  }

  throw lastError;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
