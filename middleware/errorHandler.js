const errorHandler = (err, req, res, next) => {
  let error = { ...err };

  // Thừa
  error.message = err.message;

  res.status(500).json({
    status: 0,
    message: err.message,
  });
};

module.exports = errorHandler;
