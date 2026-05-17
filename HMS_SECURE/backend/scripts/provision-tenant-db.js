require('dotenv').config();
const { connectDB } = require('../src/config/db');
const { Hospital } = require('../src/models');
const { buildTenantDbName, ensureTenantDatabase } = require('../src/config/tenantDb');

async function main() {
  const hospitalCode = process.argv[2];
  if (!hospitalCode) throw new Error('Usage: node scripts/provision-tenant-db.js <hospital_code_or_id>');
  await connectDB();
  const query = Number(hospitalCode) ? { id: Number(hospitalCode) } : { hospital_code: String(hospitalCode).toUpperCase() };
  const hospital = await Hospital.findOne(query);
  if (!hospital) throw new Error('Hospital not found');
  const dbName = hospital.tenant_db_name || buildTenantDbName({ hospital_code: hospital.hospital_code, id: hospital.id, name: hospital.name });
  await ensureTenantDatabase(dbName);
  hospital.tenant_db_name = dbName;
  hospital.tenant_db_status = 'active';
  hospital.tenant_db_created_at = hospital.tenant_db_created_at || new Date();
  await hospital.save();
  console.log(`Tenant DB ready for ${hospital.name}: ${dbName}`);
}
main().then(()=>process.exit(0)).catch((err)=>{ console.error(err); process.exit(1); });
