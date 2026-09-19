export class NotFoundError extends Error {
  constructor(
    message: string,
    readonly code = "NOT_FOUND",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
export class InternalServerError extends Error {
  constructor(
    message: string,
    readonly code = "INTERNAL_SERVER_ERROR",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class BadGatewayError extends Error {
  constructor(
    message: string,
    readonly code = "BAD_GATEWAY",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class ConflictError extends Error {
  constructor(
    message: string,
    readonly code = "CONFLICT",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
