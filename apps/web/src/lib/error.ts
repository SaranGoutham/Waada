const genericError = "Something went wrong. Check the server log.";

export function routeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : genericError;
}
