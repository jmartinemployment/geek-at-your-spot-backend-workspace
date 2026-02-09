/**
 * Safely extract an error message from an unknown caught value.
 * Handles Error instances, strings, and arbitrary objects without
 * falling back to Object's default '[object Object]' stringification.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return JSON.stringify(error);
}
