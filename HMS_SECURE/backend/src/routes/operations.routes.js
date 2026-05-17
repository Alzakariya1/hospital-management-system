const express = require('express');
const fs = require('fs');
const path = require('path');
const { mongoose } = require('../config/db');
const { BackupVerification } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { auditEvent } = require('../utils/audit');

const router = express.Router();

function dbState() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
}

function backupDir() {
  return path.resolve(process.cwd(), process.env.BACKUP_DIR || './backups');
}

function safeFileInfo(file) {
  const full = path.join(backupDir(), file);
  const stat = fs.statSync(full);
  return {
    file_name: file,
    size_bytes: stat.size,
    created_at: stat.birthtime,
    modified_at: stat.mtime,
  };
}

router.get('/health/live', (req, res) => {
  res.json({ status: 'live', uptime_seconds: Math.round(process.uptime()), timestamp: new Date().toISOString() });
});

router.get('/health/ready', (req, res) => {
  const ready = mongoose.connection.readyState === 1;
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not_ready', database: dbState(), timestamp: new Date().toISOString() });
});

router.use(verifyToken, attachTenant);

router.get('/operations/summary', requirePermission(['security.manage', 'audit.view']), asyncHandler(async (req, res) => {
  const dir = backupDir();
  const backupFiles = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort().reverse().slice(0, 10).map(safeFileInfo)
    : [];
  const verifications = await BackupVerification.find(tenantFilter(req)).sort({ id: -1 }).limit(10).lean();
  res.json({
    application: 'Enterprise HMS',
    phase: 'V36 DevOps Production Hardening',
    node_env: process.env.NODE_ENV || 'development',
    node_version: process.version,
    database: dbState(),
    uptime_seconds: Math.round(process.uptime()),
    memory: process.memoryUsage(),
    rate_limit_max: Number(process.env.RATE_LIMIT_MAX || 500),
    cors_origins_configured: Boolean(process.env.FRONTEND_URL),
    sentry_configured: Boolean(process.env.SENTRY_DSN),
    uptime_monitor_configured: Boolean(process.env.UPTIME_MONITOR_URL),
    backup_dir: dir,
    backup_files: backupFiles,
    backup_verifications: verifications,
    timestamp: new Date().toISOString(),
  });
}));

router.post('/operations/backup-verifications', requirePermission('security.manage'), asyncHandler(async (req, res) => {
  const row = await BackupVerification.create(tenantCreateData(req, {
    verification_number: req.body.verification_number || `BKP-${Date.now()}`,
    backup_type: req.body.backup_type || 'manual',
    backup_location: req.body.backup_location || '',
    restore_tested: Boolean(req.body.restore_tested),
    status: req.body.status || 'pending',
    verified_by: req.user?.id,
    verified_at: new Date(),
    notes: req.body.notes || '',
  }));
  await auditEvent({ req, action: 'Production backup verification recorded', module_name: 'operations', entity_type: 'backup_verification', entity_id: row.id, new_value: row.toJSON ? row.toJSON() : row });
  res.status(201).json(row);
}));

module.exports = router;
