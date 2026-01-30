const errorMiddleware = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.isOperational
    ? err.message
    : "Something went wrong. Please try again later.";

  res.status(statusCode).json({
    success: false,
    message
  });
};

export default errorMiddleware;
