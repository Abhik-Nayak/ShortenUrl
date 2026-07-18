/**
 * Application error hierarchy. Each error carries an HTTP status code so the
 * global error handler can translate it into a consistent JSON response.
 */
export class AppError extends Error {
  public readonly statusCode: number;

  constructor(statusCode: number, message: string, name = 'AppError') {
    super(message);
    this.statusCode = statusCode;
    this.name = name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'UnauthorizedError');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message, 'NotFoundError');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, message, 'ConflictError');
  }
}

export class GoneError extends AppError {
  constructor(message = 'Resource is no longer available') {
    super(410, message, 'GoneError');
  }
}
