/**
 * Executes a Promise-returning function with exponential backoff.
 * @param operation The async function to execute.
 * @param maxRetries Maximum number of retry attempts.
 * @param baseDelayMs Base delay in milliseconds (multiplied exponentially).
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let attempt = 0;

  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      
      // Determine if the error is transient (e.g., 429 Rate Limit, 500, 502, 503, 504)
      const errMessageStr = typeof error?.message === 'string' ? error.message : JSON.stringify(error);
      const isTransient = 
        error?.status === 429 || 
        (error?.status >= 500 && error?.status < 600) ||
        error?.code === 503 ||
        error?.code === 429 ||
        errMessageStr.includes('503') ||
        errMessageStr.includes('429') ||
        errMessageStr.includes('fetch failed') ||
        errMessageStr.includes('ECONNRESET') ||
        errMessageStr.includes('UNAVAILABLE') ||
        errMessageStr.includes('high demand');

      if (!isTransient || attempt >= maxRetries) {
        console.error(`[Retry Strategy] Operation failed permanently after ${attempt} attempts:`, error?.message);
        throw error;
      }

      // Calculate exponential backoff delay (e.g., 1s, 2s, 4s) with slight jitter to prevent thundering herd
      const jitter = Math.random() * 200;
      const delay = (baseDelayMs * Math.pow(2, attempt - 1)) + jitter;
      
      console.warn(`[Retry Strategy] Transient error encountered (${error?.message}). Retrying in ${Math.round(delay)}ms... (Attempt ${attempt} of ${maxRetries})`);
      
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
