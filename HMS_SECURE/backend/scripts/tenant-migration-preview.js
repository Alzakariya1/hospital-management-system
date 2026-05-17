require('dotenv').config();
const { connectDB, mongoose } = require('../src/config/db');
const { Hospital, TenantMigration } = require('../src/models');
const { buildTenantDbName, ensureTenantDatabase, getTenantConnection } = require('../src/config/tenantDb');

const COLLECTIONS = [
  'departments','patients','doctors','doctor_schedules','appointments','beds','opd_records','ipd_admissions','nursing_notes',
  'lab_test_templates','lab_tests','radiology_tests','medicines','pharmacy_sales','billings','insurance_claims','prescriptions',
  'clinical_records','audit_logs','login_history','security_settings','dynamic_fields','templates','notifications','communication_logs',
  'suppliers','inventory_items','inventory_batches','purchase_orders','supplier_bills','stock_receivings','stock_returns',
  'inventory_transactions','consent_forms','incident_reports','sop_documents','compliance_checklists','backup_verifications',
  'api_keys','integration_logs','webhook_subscriptions','webhook_events','data_requests','security_incidents','pilot_deployments','pilot_tasks'
];

async function main() {
  const hospitalArg = process.argv[2];
  if (!hospitalArg) throw new Error('Usage: node scripts/tenant-migration-preview.js <hospital_code_or_id>');
  await connectDB();
  const query = Number(hospitalArg) ? { id: Number(hospitalArg) } : { hospital_code: String(hospitalArg).toUpperCase() };
  const hospital = await Hospital.findOne(query);
  if (!hospital) throw new Error('Hospital not found');
  const dbName = hospital.tenant_db_name || buildTenantDbName({ hospital_code: hospital.hospital_code, id: hospital.id, name: hospital.name });
  await ensureTenantDatabase(dbName);
  const tenantConn = getTenantConnection(dbName);
  await tenantConn.asPromise?.();
  const hospitalId = Number(hospital.id);
  const report = [];
  let totalSource = 0, totalTarget = 0, totalReady = 0, totalConflicts = 0;
  for (const name of COLLECTIONS) {
    const source = mongoose.connection.db.collection(name);
    const target = tenantConn.db.collection(name);
    const sourceRows = await source.find({ hospital_id: hospitalId }).project({ _id: 1, id: 1 }).toArray();
    const targetCount = await target.countDocuments({ hospital_id: hospitalId });
    const ids = sourceRows.map((x) => x.id).filter((x) => x !== undefined && x !== null);
    const conflicts = ids.length ? await target.countDocuments({ id: { $in: ids } }) : 0;
    const ready = Math.max(sourceRows.length - conflicts, 0);
    totalSource += sourceRows.length; totalTarget += targetCount; totalReady += ready; totalConflicts += conflicts;
    report.push({ collection: name, source_count: sourceRows.length, target_count: targetCount, ready_to_copy: ready, conflicts });
  }
  await TenantMigration.create({
    hospital_id: hospital.id,
    hospital_code: hospital.hospital_code,
    hospital_name: hospital.name,
    tenant_db_name: dbName,
    status: 'preview',
    mode: 'copy_only',
    collections: report,
    total_source: totalSource,
    total_target_before: totalTarget,
    total_ready_to_copy: totalReady,
    total_conflicts: totalConflicts,
    notes: 'CLI migration preview. No source data was modified.',
  });
  console.log(`Migration preview for ${hospital.name} -> ${dbName}`);
  console.table(report.filter((x) => x.source_count || x.target_count || x.conflicts));
  console.log({ totalSource, totalTarget, totalReady, totalConflicts });
}
main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
