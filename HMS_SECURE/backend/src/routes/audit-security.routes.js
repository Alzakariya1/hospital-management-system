const express = require('express');
const { AuditLog, SecuritySetting, User } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');

const router = express.Router();
router.use(verifyToken, attachTenant);

router.get('/audit-logs', requirePermission('audit.view'), asyncHandler(async (req, res) => {
  const rows = await AuditLog.find(tenantFilter(req)).sort({ id: -1 }).limit(200).lean();
  const users = await User.find(tenantFilter(req, { id: { $in: [...new Set(rows.map(x => x.user_id).filter(Boolean))] } })).lean();
  const um = Object.fromEntries(users.map(u => [u.id, u.full_name]));
  res.json(rows.map(r => ({ ...r, user_name: um[r.user_id] })));
}));

router.post('/audit-logs', asyncHandler(async (req, res) => {
  const r = await AuditLog.create(tenantCreateData(req, { user_id: req.user.id, action: req.body.action, module_name: req.body.module_name || null }));
  res.status(201).json({ message: 'Audit log created', id: r.id });
}));

router.get('/security-settings', requirePermission('security.manage'), asyncHandler(async (req, res) => {
  res.json(await SecuritySetting.find(tenantFilter(req)).sort({ setting_key: 1 }));
}));

router.put('/security-settings/:key', requirePermission('security.manage'), asyncHandler(async (req, res) => {
  await SecuritySetting.findOneAndUpdate(
    tenantFilter(req, { setting_key: req.params.key }),
    { $set: tenantCreateData(req, { setting_value: req.body.value }) },
    { upsert: true, new: true }
  );
  res.json({ message: 'Security setting saved' });
}));

module.exports = router;
