function normalizeCode(value) {
  return String(value || '').trim();
}

function padNumber(value, width = 3) {
  return String(Number(value || 0)).padStart(width, '0');
}

async function nextSequentialCode(Model, filter = {}, field, width = 3, prefix = '') {
  const rows = await Model.find({ ...filter, [field]: { $exists: true, $ne: null } })
    .select({ [field]: 1, id: 1 })
    .lean();
  let max = 0;
  for (const row of rows) {
    const raw = normalizeCode(row[field]);
    const match = raw.match(/(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}${padNumber(max + 1, width)}`;
}

async function ensureUniqueCode(Model, req, baseFilter, field, preferredValue, options = {}) {
  const width = options.width || 3;
  const prefix = options.prefix || '';
  const value = normalizeCode(preferredValue);
  if (value) {
    const exists = await Model.findOne({ ...baseFilter, [field]: value }).lean();
    if (!exists) return value;
  }
  let candidate = await nextSequentialCode(Model, baseFilter, field, width, prefix);
  let guard = 0;
  while (await Model.findOne({ ...baseFilter, [field]: candidate }).lean()) {
    guard += 1;
    candidate = `${prefix}${padNumber(Number(candidate.replace(/\D/g, '') || 0) + 1, width)}`;
    if (guard > 1000) throw Object.assign(new Error(`Unable to generate a unique ${field}`), { status: 500 });
  }
  return candidate;
}

function isDuplicateKeyError(error) {
  return error && (error.code === 11000 || error.code === 11001);
}

module.exports = { ensureUniqueCode, isDuplicateKeyError };
