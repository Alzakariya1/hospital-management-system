require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { Hospital } = require('../src/models');
const { verifyHospitalTenant } = require('../src/utils/tenantProvisioning');

(async () => {
  const key = process.argv[2];
  await connectDB();
  const query = key
    ? (Number(key) ? { id: Number(key) } : { hospital_code: String(key).trim().toUpperCase() })
    : {};
  const hospitals = key ? [await Hospital.findOne(query)] : await Hospital.find(query).sort({ id: 1 });
  let failed = 0;
  for (const hospital of hospitals.filter(Boolean)) {
    try {
      const out = await verifyHospitalTenant(hospital);
      const ok = out.collections.includes('_tenant_meta');
      if (!ok) failed += 1;
      console.log(`${ok ? 'OK' : 'FAIL'} ${hospital.name || hospital.hospital_code} -> ${out.tenant_db_name} collections=${out.collections.join(',')}`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL ${hospital?.name || key}: ${err.message}`);
    }
  }
  if (!hospitals.filter(Boolean).length) throw new Error('Hospital not found');
  await mongoose.disconnect();
  if (failed) process.exit(1);
  process.exit(0);
})().catch((err) => { console.error('Tenant provision verification failed:', err.message); process.exit(1); });
