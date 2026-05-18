class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    isOperational: boolean = false,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
