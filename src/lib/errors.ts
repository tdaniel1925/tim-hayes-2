// Error types and factory
// Implementation in Step 1.5

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const AUTH_ERRORS = {
  SESSION_EXPIRED: "SESSION_EXPIRED",
  ACCOUNT_SUSPENDED: "ACCOUNT_SUSPENDED",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
} as const;

export function createError(code: string, message?: string): AppError {
  // TODO: Implement error factory with HTTP status code mapping
  throw new Error("Not implemented");
}
