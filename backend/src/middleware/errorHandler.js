const { ZodError } = require("zod");

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof ZodError) {
    return res.status(422).json({
      message: "Validation failed",
      errors: error.errors
    });
  }

  const statusCode = error.statusCode || 500;
  const payload = {
    message: statusCode === 500 ? "Internal server error" : error.message
  };

  if (error.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== "production" && statusCode === 500) {
    payload.error = error.message;
  }

  return res.status(statusCode).json(payload);
}

module.exports = errorHandler;
