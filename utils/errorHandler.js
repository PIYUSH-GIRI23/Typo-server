import AppError from "./AppError.js";

const errorHandler = (err) => {
  // Cast Error - Invalid ObjectId or incorrect data type
  if (err.name === "CastError") {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
  }

  // Validation Error - Schema validation failed
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors)
      .map((error) => error.message)
      .join(", ");
    return new AppError(messages, 400);
  }

  // Duplicate Key Error (11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    return new AppError(message, 409);
  }

  // JWT Invalid Token Error
  if (err.name === "JsonWebTokenError") {
    return new AppError("Invalid token", 401);
  }

  // JWT Token Expired Error
  if (err.name === "TokenExpiredError") {
    return new AppError("Token expired", 401);
  }

  // MongoDB Server Error
  if (err.name === "MongoServerError") {
    if (err.message.includes("connection")) {
      return new AppError("Database connection error", 503);
    }
    if (err.code === 13) {
      return new AppError("Permission denied on database operation", 403);
    }
    return new AppError("Database error occurred", 500);
  }

  // Mongoose Connection Error
  if (err.name === "MongooseError") {
    return new AppError("Database connection error", 503);
  }

  // SyntaxError - JSON parsing error
  if (err instanceof SyntaxError) {
    return new AppError("Invalid JSON format", 400);
  }

  // ReferenceError
  if (err.name === "ReferenceError") {
    return new AppError("Internal server error", 500);
  }

  // TypeError
  if (err.name === "TypeError") {
    return new AppError("Type error in request processing", 400);
  }

  // Generic duplicate error fallback
  if (err.message && err.message.includes("duplicate")) {
    return new AppError("Duplicate entry found", 409);
  }

  // Return generic error if no specific handler matches
  if (err instanceof AppError) {
    return err;
  }

  return new AppError(err.message || "An error occurred", err.statusCode || 500);
};

export default errorHandler;
