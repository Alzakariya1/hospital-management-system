function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);
  if (err?.code === 11000 || err?.code === 11001) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {}).join(', ') || 'unique field';
    return res.status(409).json({
      message: `Duplicate ${fields}. This record already exists in the selected hospital. Please refresh and try again.`,
      code: 'DUPLICATE_KEY',
      fields,
    });
  }
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
