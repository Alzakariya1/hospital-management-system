require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { Hospital } = require('../src/models');
const { provisionHospitalTenant } = require('../src/utils/tenantProvisioning');

async function main() {
  const key = process.argv[2];
  await connectDB();
  const query = key
    ? (Number(key) ? { id: Number(key) } : { hospital_code: String(key).trim().toUpperCase() })
    : { $or: [{ tenant_db_name: { $exists: false } }, { tenant_db_name: null }, { tenant_db_name: '' }, { tenant_db_status: { $ne: 'provisioned' } }] };
  const hospitals = key ? [await Hospital.findOne(query)] : await Hospital.find(query).sort({ id: 1 });
  const rows = [];
  for (const hospital of hospitals.filter(Boolean)) {
    const out = await provisionHospitalTenant(hospital, { source: key ? 'script_single' : 'script_existing_shared' });
    rows.push({ id: out.hospital.id, code: out.hospital.hospital_code, name: out.hospital.name, tenant_db_name: out.tenant_db_name, status: out.hospital.tenant_db_status });
    console.log(`Provisioned ${out.hospital.name} (${out.hospital.id}) -> ${out.tenant_db_name}`);
  }
  if (!rows.length) console.log('No matching hospitals found to provision.');
  await mongoose.disconnect();
}
main().then(()=>process.exit(0)).catch((err)=>{ console.error('Tenant provisioning failed:', err.message); process.exit(1); });
