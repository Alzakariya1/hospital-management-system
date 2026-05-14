function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, next) {
  console.error(err);

  if (err?.code === 11000) {
    const fields = Object.keys(err.keyPattern || err.keyValue || {});
    const field = fields[0] || 'record';
    const value = err.keyValue?.[field];
    const label = field.replace(/_/g, ' ');
    return res.status(409).json({
      message: `${label} already exists${value ? `: ${value}` : ''}`,
      field,
      value,
    });
  }

  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal server error' });
}

module.exports = { notFound, errorHandler };
