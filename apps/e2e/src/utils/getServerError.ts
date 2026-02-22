/**
 * Extracts the server error payload from an HTTP error response.
 * Falls back to the original error if no response data is present.
 *
 * @param error - The caught error, typically from an HTTP client.
 * @returns The server response data or the original error.
 */
export function getServerError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as Record<string, unknown>).response === 'object'
  ) {
    const response = (error as { response: Record<string, unknown> }).response;
    return response.data ?? error;
  }
  return error;
}
