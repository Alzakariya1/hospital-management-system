require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { Hospital } = require('../src/models');
const { buildTenantDbName, ensureTenantDatabase, getTenantConnection } = require('../src/config/tenantDb');

const COLLECTIONS = [
  'departments','patients','doctors','doctor_schedules','appointments','beds','opd_records','ipd_admissions','nursing_notes',
  'lab_test_templates','lab_tests','radiology_tests','medicines','pharmacy_sales','billings','insurance_claims','prescriptions',
  'clinical_records','audit_logs','login_history','security_settings','dynamic_fields','templates','notifications','communication_logs',
  'suppliers','inventory_items','inventory_batches','purchase_orders','supplier_bills','stock_receivings','stock_returns',
  'inventory_transactions','consent_forms','incident_reports','sop_documents','compliance_checklists','backup_verifications',
  'api_keys','integration_logs','webhook_subscriptions','webhook_events'
];

async function main() {
  const hospitalCode = process.argv[2];
  if (!hospitalCode) throw new Error('Usage: node scripts/migrate-shared-to-tenant.js <hospital_code_or_id> [--delete-source=false]');
  const deleteSource = process.argv.includes('--delete-source=true');
  await connectDB();
  const query = Number(hospitalCode) ? { id: Number(hospitalCode) } : { hospital_code: String(hospitalCode).toUpperCase() };
  const hospital = await Hospital.findOne(query);
  if (!hospital) throw new Error('Hospital not found');
  const dbName = hospital.tenant_db_name || buildTenantDbName({ hospital_code: hospital.hospital_code, id: hospital.id, name: hospital.name });
  await ensureTenantDatabase(dbName);
  const tenantConn = getTenantConnection(dbName);
  await tenantConn.asPromise?.();
  const hospitalId = Number(hospital.id);
  const report = [];
  for (const name of COLLECTIONS) {
    const source = mongoose.connection.db.collection(name);
    const target = tenantConn.db.collection(name);
    const rows = await source.find({ hospital_id: hospitalId }).toArray();
    let upserted = 0;
    for (const row of rows) {
      const filter = row.id ? { id: row.id } : { _id: row._id };
      await target.updateOne(filter, { $set: row }, { upsert: true });
      upserted += 1;
    }
    if (deleteSource && rows.length) await source.deleteMany({ hospital_id: hospitalId });
    report.push({ collection: name, copied: upserted, source_deleted: deleteSource ? rows.length : 0 });
  }
  hospital.tenant_db_name = dbName;
  hospital.tenant_db_status = 'provisioned';
  hospital.tenant_provisioned_at = hospital.tenant_provisioned_at || new Date();
  hospital.tenant_db_created_at = hospital.tenant_db_created_at || new Date();
  await hospital.save();
  console.table(report.filter((x) => x.copied || x.source_deleted));
  console.log(`Migration completed safely for ${hospital.name}. Source deletion: ${deleteSource}. Tenant DB: ${dbName}`);
}
main().then(()=>process.exit(0)).catch((err)=>{ console.error(err); process.exit(1); });
