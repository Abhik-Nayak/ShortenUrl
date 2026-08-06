export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = code;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BadRequest', message, details);
export const unauthorized = (message = 'Authentication required') =>
  new AppError(401, 'Unauthorized', message);
export const notFound = (message = 'Resource not found') => new AppError(404, 'NotFound', message);
export const conflict = (message: string) => new AppError(409, 'Conflict', message);
