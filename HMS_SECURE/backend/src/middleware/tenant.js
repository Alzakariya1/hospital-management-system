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

function tenantFilter(req, extra = {}) {
  const hospitalId = Number(req.hospital_id || resolveHospitalId(req));
  const base = { ...extra };

  // Backward compatibility: old records created before tenant support may not have hospital_id.
  // Keep those visible only to the default hospital so existing deployments don't lose data.
  if (hospitalId === DEFAULT_HOSPITAL_ID) {
    return {
      ...base,
      $or: [
        { hospital_id: hospitalId },
        { hospital_id: { $exists: false } },
        { hospital_id: null },
      ],
    };
  }

  return { ...base, hospital_id: hospitalId };
}

function tenantCreateData(req, data = {}) {
  return {
    ...data,
    hospital_id: Number(data.hospital_id || req.hospital_id || resolveHospitalId(req)),
  };
}

function withTenantCreate(req, _res, next) {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    req.body = tenantCreateData(req, req.body);
  }
  return next();
}

module.exports = {
  DEFAULT_HOSPITAL_ID,
  resolveHospitalId,
  attachTenant,
  tenantFilter,
  tenantCreateData,
  withTenantCreate,
};
