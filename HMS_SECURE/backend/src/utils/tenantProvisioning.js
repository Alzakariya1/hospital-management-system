const { Hospital } = require('../models');
const { buildTenantDbName, ensureTenantDatabase, sanitizeDbName, getTenantConnection } = require('../config/tenantDb');

function publicTenantFields(hospital) {
  const raw = hospital?.toObject ? hospital.toObject() : (hospital?.toJSON ? hospital.toJSON() : { ...(hospital || {}) });
  return {
    tenant_db_name: raw.tenant_db_name || null,
    tenant_db_status: raw.tenant_db_status || 'shared',
    tenant_provisioned_at: raw.tenant_provisioned_at || raw.tenant_db_created_at || null,
    tenant_db_created_at: raw.tenant_db_created_at || raw.tenant_provisioned_at || null,
  };
}

function expectedTenantDbName(hospital) {
  return sanitizeDbName(hospital?.tenant_db_name) || buildTenantDbName({
    hospital_code: hospital?.hospital_code,
    id: hospital?.id,
    name: hospital?.name,
  });
}

async function provisionHospitalTenant(hospitalOrId, options = {}) {
  const hospital = typeof hospitalOrId === 'object'
    ? hospitalOrId
    : await Hospital.findOne({ id: Number(hospitalOrId) });
  if (!hospital) {
    const err = new Error('Hospital not found');
    err.status = 404;
    throw err;
  }
  const requested = sanitizeDbName(options.tenant_db_name || options.dbName);
  const dbName = requested || expectedTenantDbName(hospital);
  const meta = await ensureTenantDatabase(dbName, {
    hospital_id: hospital.id,
    hospital_code: hospital.hospital_code,
    hospital_name: hospital.name,
    source: options.source || 'hospital_onboarding',
  });
  const now = new Date();
  hospital.tenant_db_name = dbName;
  hospital.tenant_db_status = 'provisioned';
  hospital.tenant_provisioned_at = hospital.tenant_provisioned_at || now;
  hospital.tenant_db_created_at = hospital.tenant_db_created_at || hospital.tenant_provisioned_at || now;
  await hospital.save();
  return { hospital, tenant_db_name: dbName, meta };
}

async function verifyHospitalTenant(hospitalOrId) {
  const hospital = typeof hospitalOrId === 'object'
    ? hospitalOrId
    : await Hospital.findOne({ id: Number(hospitalOrId) });
  if (!hospital) {
    const err = new Error('Hospital not found');
    err.status = 404;
    throw err;
  }
  const dbName = expectedTenantDbName(hospital);
  const meta = await ensureTenantDatabase(dbName, {
    hospital_id: hospital.id,
    hospital_code: hospital.hospital_code,
    hospital_name: hospital.name,
    source: 'verify_tenant_provision',
  });
  const conn = getTenantConnection(dbName);
  await conn.asPromise?.();
  const collections = await conn.db.listCollections().toArray();
  if (hospital.tenant_db_name !== dbName || hospital.tenant_db_status !== 'provisioned') {
    hospital.tenant_db_name = dbName;
    hospital.tenant_db_status = 'provisioned';
    hospital.tenant_provisioned_at = hospital.tenant_provisioned_at || new Date();
    hospital.tenant_db_created_at = hospital.tenant_db_created_at || hospital.tenant_provisioned_at;
    await hospital.save();
  }
  return { hospital, tenant_db_name: dbName, meta, collections: collections.map((c) => c.name).sort() };
}

module.exports = { publicTenantFields, expectedTenantDbName, provisionHospitalTenant, verifyHospitalTenant };
