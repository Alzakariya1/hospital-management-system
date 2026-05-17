const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const { Hospital, TenantBackup, TenantMigration } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { auditEvent } = require('../utils/audit');
const {
  buildTenantDbName,
  ensureTenantDatabase,
  listTenantConnectionStatus,
  sanitizeDbName,
  uriForDb,
} = require('../config/tenantDb');

const router = express.Router();
router.use(verifyToken, requirePermission('hospital.manage'));

const BACKUP_DIR = process.env.TENANT_BACKUP_DIR || path.join(__dirname, '../../backups/tenants');

const MIGRATION_COLLECTIONS = [
  'departments','patients','doctors','doctor_schedules','appointments','beds','opd_records','ipd_admissions','nursing_notes',
  'lab_test_templates','lab_tests','radiology_tests','medicines','pharmacy_sales','billings','insurance_claims','prescriptions',
  'clinical_records','audit_logs','login_history','security_settings','dynamic_fields','templates','notifications','communication_logs',
  'suppliers','inventory_items','inventory_batches','purchase_orders','supplier_bills','stock_receivings','stock_returns',
  'inventory_transactions','consent_forms','incident_reports','sop_documents','compliance_checklists','backup_verifications',
  'api_keys','integration_logs','webhook_subscriptions','webhook_events','data_requests','security_incidents','pilot_deployments','pilot_tasks'
];

async function getTenantDb(hospital, createIfMissing = true) {
  const dbName = sanitizeDbName(hospital.tenant_db_name) || buildTenantDbName({ hospital_code: hospital.hospital_code, id: hospital.id, name: hospital.name });
  if (createIfMissing) await ensureTenantDatabase(dbName);
  const conn = require('../config/tenantDb').getTenantConnection(dbName);
  await conn.asPromise?.();
  return { dbName, conn };
}

async function buildMigrationPreview(hospital) {
  const { dbName, conn } = await getTenantDb(hospital, true);
  const hospitalId = Number(hospital.id);
  const collections = [];
  let total_source = 0, total_target_before = 0, total_ready_to_copy = 0, total_conflicts = 0;
  for (const name of MIGRATION_COLLECTIONS) {
    const source = mongoose.connection.db.collection(name);
    const target = conn.db.collection(name);
    const sourceRows = await source.find({ hospital_id: hospitalId }).project({ _id: 1, id: 1 }).toArray();
    const targetCount = await target.countDocuments({ hospital_id: hospitalId });
    let conflictCount = 0;
    if (sourceRows.length) {
      const ids = sourceRows.map((x) => x.id).filter((x) => x !== undefined && x !== null);
      if (ids.length) conflictCount += await target.countDocuments({ id: { $in: ids } });
    }
    const ready = Math.max(sourceRows.length - conflictCount, 0);
    total_source += sourceRows.length;
    total_target_before += targetCount;
    total_ready_to_copy += ready;
    total_conflicts += conflictCount;
    collections.push({ collection: name, source_count: sourceRows.length, target_count: targetCount, ready_to_copy: ready, conflicts: conflictCount });
  }
  return { tenant_db_name: dbName, collections, total_source, total_target_before, total_ready_to_copy, total_conflicts };
}
function ensureBackupDir() { fs.mkdirSync(BACKUP_DIR, { recursive: true }); }
function safeDate() { return new Date().toISOString().replace(/[:.]/g, '-'); }
function publicHospital(h) {
  const x = h?.toJSON ? h.toJSON() : { ...(h || {}) };
  return x;
}

router.get('/tenant-databases/overview', asyncHandler(async (_req, res) => {
  const hospitals = await Hospital.find().sort({ id: -1 }).lean();
  const backups = await TenantBackup.find().sort({ id: -1 }).limit(20).lean();
  const status = await listTenantConnectionStatus();
  const summary = {
    total_hospitals: hospitals.length,
    isolated_databases: hospitals.filter((h) => h.tenant_db_name).length,
    shared_database_hospitals: hospitals.filter((h) => !h.tenant_db_name).length,
    latest_backups: backups.length,
  };
  res.json({ summary, hospitals, backups, connection_status: status });
}));

router.post('/tenant-databases/:hospitalId/provision', asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ id: Number(req.params.hospitalId) });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  const requested = sanitizeDbName(req.body.tenant_db_name);
  const dbName = requested || hospital.tenant_db_name || buildTenantDbName({ hospital_code: hospital.hospital_code, id: hospital.id, name: hospital.name });
  await ensureTenantDatabase(dbName);
  hospital.tenant_db_name = dbName;
  hospital.tenant_db_status = 'active';
  hospital.tenant_db_created_at = hospital.tenant_db_created_at || new Date();
  await hospital.save();
  await auditEvent({ req, userId: req.user.id, hospital_id: hospital.id, action: `Provisioned tenant database ${dbName}`, module_name: 'tenant_database', entity_type: 'hospital', entity_id: hospital.id });
  res.json({ message: 'Tenant database provisioned', hospital: publicHospital(hospital), tenant_db_name: dbName });
}));

router.post('/tenant-databases/:hospitalId/backup', asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ id: Number(req.params.hospitalId) }).lean();
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  const dbName = sanitizeDbName(hospital.tenant_db_name);
  if (!dbName) return res.status(400).json({ message: 'This hospital is still using shared database mode. Provision a tenant DB first.' });
  ensureBackupDir();
  const fileName = `${dbName}_${safeDate()}.archive.gz`;
  const backupPath = path.join(BACKUP_DIR, fileName);
  const backup = await TenantBackup.create({
    hospital_id: hospital.id,
    hospital_code: hospital.hospital_code,
    hospital_name: hospital.name,
    tenant_db_name: dbName,
    backup_type: req.body.backup_type || 'manual',
    status: 'queued',
    storage_provider: 'local',
    backup_path: backupPath,
    file_name: fileName,
    requested_by: req.user.id,
    notes: req.body.notes || '',
  });

  const args = [`--uri=${uriForDb(dbName)}`, `--archive=${backupPath}`, '--gzip'];
  const child = spawn(process.env.MONGODUMP_BIN || 'mongodump', args, { stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => { stderr += d.toString(); });
  child.on('spawn', async () => {
    await TenantBackup.updateOne({ id: backup.id }, { $set: { status: 'running', started_at: new Date() } });
  });
  child.on('error', async (err) => {
    await TenantBackup.updateOne({ id: backup.id }, { $set: { status: 'failed', error_message: err.message, completed_at: new Date() } });
  });
  child.on('close', async (code) => {
    const ok = code === 0 && fs.existsSync(backupPath);
    const size = ok ? fs.statSync(backupPath).size : 0;
    await TenantBackup.updateOne({ id: backup.id }, { $set: { status: ok ? 'completed' : 'failed', size_bytes: size, completed_at: new Date(), error_message: ok ? '' : (stderr || `mongodump exited with ${code}`) } });
  });

  await auditEvent({ req, userId: req.user.id, hospital_id: hospital.id, action: `Queued tenant backup for ${dbName}`, module_name: 'tenant_backup', entity_type: 'tenant_backup', entity_id: backup.id });
  res.status(202).json({ message: 'Tenant backup queued', backup });
}));

router.get('/tenant-databases/backups', asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.hospital_id) q.hospital_id = Number(req.query.hospital_id);
  res.json(await TenantBackup.find(q).sort({ id: -1 }).limit(Number(req.query.limit || 100)).lean());
}));

router.post('/tenant-databases/backups/:id/verify', asyncHandler(async (req, res) => {
  const backup = await TenantBackup.findOne({ id: Number(req.params.id) });
  if (!backup) return res.status(404).json({ message: 'Backup not found' });
  const exists = backup.backup_path && fs.existsSync(backup.backup_path);
  backup.verified_at = exists ? new Date() : null;
  backup.status = exists && backup.status === 'completed' ? 'verified' : backup.status;
  backup.error_message = exists ? backup.error_message : 'Backup file is missing on server storage';
  await backup.save();
  res.json({ message: exists ? 'Backup file verified' : 'Backup file missing', backup, exists });
}));


router.get('/tenant-databases/:hospitalId/migration-preview', asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ id: Number(req.params.hospitalId) });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  const preview = await buildMigrationPreview(hospital);
  const migration = await TenantMigration.create({
    hospital_id: hospital.id,
    hospital_code: hospital.hospital_code,
    hospital_name: hospital.name,
    tenant_db_name: preview.tenant_db_name,
    status: 'preview',
    mode: 'copy_only',
    collections: preview.collections,
    total_source: preview.total_source,
    total_target_before: preview.total_target_before,
    total_ready_to_copy: preview.total_ready_to_copy,
    total_conflicts: preview.total_conflicts,
    requested_by: req.user.id,
    notes: 'Preview only. No source data was modified.',
  });
  res.json({ message: 'Migration preview generated', migration, preview });
}));

router.post('/tenant-databases/:hospitalId/migrate', asyncHandler(async (req, res) => {
  const hospital = await Hospital.findOne({ id: Number(req.params.hospitalId) });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  const deleteSource = req.body.delete_source === true;
  const preview = await buildMigrationPreview(hospital);
  const migration = await TenantMigration.create({
    hospital_id: hospital.id,
    hospital_code: hospital.hospital_code,
    hospital_name: hospital.name,
    tenant_db_name: preview.tenant_db_name,
    status: 'running',
    mode: deleteSource ? 'copy_then_delete_source' : 'copy_only',
    collections: preview.collections,
    total_source: preview.total_source,
    total_target_before: preview.total_target_before,
    total_ready_to_copy: preview.total_ready_to_copy,
    total_conflicts: preview.total_conflicts,
    requested_by: req.user.id,
    started_at: new Date(),
    notes: req.body.notes || 'Safe migration started from SaaS Control Center.',
  });
  try {
    const { dbName, conn } = await getTenantDb(hospital, true);
    const hospitalId = Number(hospital.id);
    const results = [];
    let totalCopied = 0, totalSkipped = 0, totalDeleted = 0;
    for (const name of MIGRATION_COLLECTIONS) {
      const source = mongoose.connection.db.collection(name);
      const target = conn.db.collection(name);
      const rows = await source.find({ hospital_id: hospitalId }).toArray();
      let copied = 0, skipped = 0;
      for (const row of rows) {
        const filter = row.id !== undefined && row.id !== null ? { id: row.id } : { _id: row._id };
        const existing = await target.findOne(filter, { projection: { _id: 1 } });
        if (existing && !req.body.overwrite_existing) { skipped += 1; continue; }
        await target.updateOne(filter, { $set: row }, { upsert: true });
        copied += 1;
      }
      let deleted = 0;
      if (deleteSource && copied === rows.length && rows.length) {
        const del = await source.deleteMany({ hospital_id: hospitalId });
        deleted = del.deletedCount || 0;
      }
      totalCopied += copied; totalSkipped += skipped; totalDeleted += deleted;
      results.push({ collection: name, source_count: rows.length, copied, skipped, source_deleted: deleted });
    }
    hospital.tenant_db_name = dbName;
    hospital.tenant_db_status = 'active';
    hospital.tenant_db_created_at = hospital.tenant_db_created_at || new Date();
    await hospital.save();
    migration.status = 'completed';
    migration.total_copied = totalCopied;
    migration.total_skipped = totalSkipped;
    migration.source_deleted = totalDeleted;
    migration.collections = results;
    migration.completed_at = new Date();
    await migration.save();
    await auditEvent({ req, userId: req.user.id, hospital_id: hospital.id, action: `Completed tenant migration to ${dbName}`, module_name: 'tenant_migration', entity_type: 'tenant_migration', entity_id: migration.id });
    res.json({ message: 'Tenant migration completed', migration, results });
  } catch (err) {
    migration.status = 'failed';
    migration.error_message = err.message;
    migration.completed_at = new Date();
    await migration.save();
    throw err;
  }
}));

router.get('/tenant-databases/migrations', asyncHandler(async (req, res) => {
  const q = {};
  if (req.query.hospital_id) q.hospital_id = Number(req.query.hospital_id);
  res.json(await TenantMigration.find(q).sort({ id: -1 }).limit(Number(req.query.limit || 100)).lean());
}));

router.post('/tenant-databases/backups/:id/restore-dry-run', asyncHandler(async (req, res) => {
  const backup = await TenantBackup.findOne({ id: Number(req.params.id) });
  if (!backup) return res.status(404).json({ message: 'Backup not found' });
  const exists = backup.backup_path && fs.existsSync(backup.backup_path);
  const checks = [
    { key: 'backup_record', label: 'Backup record exists', status: 'passed' },
    { key: 'backup_file', label: 'Backup file exists on configured storage', status: exists ? 'passed' : 'failed' },
    { key: 'target_database', label: 'Target tenant database is known', status: backup.tenant_db_name ? 'passed' : 'failed' },
    { key: 'safe_restore', label: 'Dry-run only; no production data overwritten', status: 'passed' },
  ];
  backup.restore_tested_at = exists ? new Date() : backup.restore_tested_at;
  if (!exists) backup.error_message = 'Restore dry-run failed because backup file is missing';
  await backup.save();
  res.json({ message: exists ? 'Restore dry-run passed' : 'Restore dry-run failed', exists, backup, checks });
}));

module.exports = router;
