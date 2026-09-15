export class NotFoundError extends Error {}
export class InternalServerError extends Error {}

export class ConflictError extends Error {
  constructor(
    message: string,
    readonly code = "CONFLICT",
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
