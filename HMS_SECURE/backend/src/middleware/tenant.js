const DEFAULT_HOSPITAL_ID = Number(process.env.DEFAULT_HOSPITAL_ID || 1);

function resolveHospitalId(req) {
  const headerHospitalId = Number(req.headers['x-hospital-id']);
  const userHospitalId = Number(req.user?.hospital_id || req.user?.hospitalId);
  if (Number.isFinite(headerHospitalId) && headerHospitalId > 0) return headerHospitalId;
  if (Number.isFinite(userHospitalId) && userHospitalId > 0) return userHospitalId;
  return DEFAULT_HOSPITAL_ID;
}

function attachTenant(req, _res, next) {
  req.hospital_id = resolveHospitalId(req);
  req.tenant = { hospital_id: req.hospital_id };
  return next();
}

function withTenantCreate(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body.hospital_id = Number(req.body.hospital_id || req.hospital_id || DEFAULT_HOSPITAL_ID);
  }
  return next();
}

module.exports = { DEFAULT_HOSPITAL_ID, resolveHospitalId, attachTenant, withTenantCreate };
