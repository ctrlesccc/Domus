export class HttpError extends Error {
  statusCode: number;
  expose: boolean;

  constructor(statusCode: number, message: string, options?: { expose?: boolean }) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.expose = options?.expose ?? statusCode < 500;
  }
}

export function badRequest(message: string) {
  return new HttpError(400, message);
}

export function notFound(message: string) {
  return new HttpError(404, message);
}

export function forbidden(message: string) {
  return new HttpError(403, message);
}
