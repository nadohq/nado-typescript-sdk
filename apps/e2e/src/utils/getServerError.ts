/**
 * Extracts the server error payload from an HTTP error response.
 * Falls back to the original error if no response data is present.
 *
 * @param error - The caught error, typically from an HTTP client.
 * @returns The server response data or the original error.
 */
export function getServerError(error: unknown): unknown {
  const response = (error as Record<string, unknown>)?.response as
    | Record<string, unknown>
    | undefined;

  return response?.data ?? error;
}
