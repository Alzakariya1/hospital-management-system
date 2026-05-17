const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { LegalPolicy, DataRequest, SecurityIncident, PolicyAcknowledgement, AuditLog } = require('../models');

const router = express.Router();
router.use(verifyToken, attachTenant);
const canManage = [requirePermission(['security.manage', 'compliance.manage', 'hospital.manage'])];
const canView = [requirePermission(['audit.view', 'security.manage', 'compliance.view', 'hospital.manage'])];

const POLICY_TEMPLATES = [
  {
    policy_key: 'privacy-policy', title: 'Privacy Policy', category: 'legal', version: '1.0', status: 'approved',
    content: 'Explain what personal and patient data is collected, why it is processed, retention rules, access controls, user rights, contact details and complaint escalation process.',
  },
  {
    policy_key: 'terms-of-use', title: 'Terms of Use', category: 'legal', version: '1.0', status: 'approved',
    content: 'Define authorised use, user responsibility, subscription scope, service limits, account suspension, acceptable use, liability limits and support boundaries.',
  },
  {
    policy_key: 'data-protection-notice', title: 'Data Protection Notice', category: 'data_protection', version: '1.0', status: 'approved',
    content: 'Document lawful basis, sensitive health data handling, role-based access, audit logs, breach notification, backup retention and data-subject request workflow.',
  },
  {
    policy_key: 'backup-retention-policy', title: 'Backup & Retention Policy', category: 'operations', version: '1.0', status: 'approved',
    content: 'Define backup frequency, restore testing, retention period, storage protection, restore ownership and verification evidence requirements.',
  },
  {
    policy_key: 'incident-response-policy', title: 'Security Incident Response Policy', category: 'security', version: '1.0', status: 'approved',
    content: 'Define detection, triage, containment, eradication, recovery, communication, legal review, customer notification and post-incident corrective action workflow.',
  },
];

async function audit(user, action, module_name = 'legal_security') {
  try { await AuditLog.create({ user_id: user?.id || null, action, module_name }); } catch (_) {}
}

router.get('/legal-security/overview', ...canView, asyncHandler(async (req, res) => {
  const hospitalId = req.user.role === 'super_admin' ? null : Number(req.user.hospital_id || 1);
  const hospitalFilter = hospitalId ? { hospital_id: hospitalId } : {};
  const [policies, dataRequests, incidents, openDataRequests, openIncidents, criticalIncidents] = await Promise.all([
    LegalPolicy.countDocuments(),
    DataRequest.countDocuments(hospitalFilter),
    SecurityIncident.countDocuments(hospitalFilter),
    DataRequest.countDocuments({ ...hospitalFilter, status: { $in: ['open', 'in_progress'] } }),
    SecurityIncident.countDocuments({ ...hospitalFilter, status: { $in: ['open', 'investigating', 'contained'] } }),
    SecurityIncident.countDocuments({ ...hospitalFilter, severity: { $in: ['high', 'critical'] }, status: { $ne: 'closed' } }),
  ]);
  res.json({ policies, dataRequests, incidents, openDataRequests, openIncidents, criticalIncidents, releaseGate: criticalIncidents === 0 && openIncidents < 5 });
}));

router.post('/legal-security/bootstrap-policies', ...canManage, asyncHandler(async (req, res) => {
  const created = [];
  for (const p of POLICY_TEMPLATES) {
    const existing = await LegalPolicy.findOne({ policy_key: p.policy_key, version: p.version });
    if (!existing) {
      const row = await LegalPolicy.create({ ...p, effective_date: new Date(), approved_by: req.user.id, approved_at: new Date(), next_review_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) });
      created.push(row.policy_key);
    }
  }
  await audit(req.user, `Bootstrapped ${created.length} legal/security policies`);
  res.json({ message: 'Policy templates ready', created });
}));

router.get('/legal-security/policies', ...canView, asyncHandler(async (_req, res) => {
  res.json(await LegalPolicy.find().sort({ category: 1, policy_key: 1, version: -1 }).lean());
}));

router.post('/legal-security/policies', ...canManage, asyncHandler(async (req, res) => {
  const policy_key = String(req.body.policy_key || '').trim().toLowerCase().replace(/\s+/g, '-');
  const title = String(req.body.title || '').trim();
  if (!policy_key || !title) return res.status(400).json({ message: 'policy_key and title are required' });
  const row = await LegalPolicy.create({
    policy_key, title, version: req.body.version || '1.0', category: req.body.category || 'legal', content: req.body.content || '',
    owner: req.body.owner || '', status: req.body.status || 'draft', effective_date: req.body.effective_date || null,
    next_review_date: req.body.next_review_date || null,
  });
  await audit(req.user, `Created policy ${policy_key}`);
  res.status(201).json({ message: 'Policy created', id: row.id });
}));

router.patch('/legal-security/policies/:id/approve', ...canManage, asyncHandler(async (req, res) => {
  await LegalPolicy.updateOne({ id: Number(req.params.id) }, { $set: { status: 'approved', approved_by: req.user.id, approved_at: new Date(), effective_date: req.body.effective_date || new Date() } });
  await audit(req.user, `Approved policy ${req.params.id}`);
  res.json({ message: 'Policy approved' });
}));

router.post('/legal-security/policies/:id/acknowledge', verifyToken, asyncHandler(async (req, res) => {
  const policyId = Number(req.params.id);
  const exists = await LegalPolicy.findOne({ id: policyId });
  if (!exists) return res.status(404).json({ message: 'Policy not found' });
  await PolicyAcknowledgement.updateOne(tenantFilter(req, { policy_id: policyId, user_id: req.user.id }), { $setOnInsert: { ...tenantCreateData(req, {}), ip_address: req.ip, user_agent: req.get('user-agent') || '', acknowledged_at: new Date() } }, { upsert: true });
  res.json({ message: 'Policy acknowledged' });
}));

router.get('/legal-security/data-requests', ...canView, asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  res.json(await DataRequest.find(filter).sort({ id: -1 }).limit(300).lean());
}));

router.post('/legal-security/data-requests', ...canManage, asyncHandler(async (req, res) => {
  const requester_name = String(req.body.requester_name || '').trim();
  const requester_email = String(req.body.requester_email || '').trim().toLowerCase();
  if (!requester_name || !requester_email) return res.status(400).json({ message: 'requester_name and requester_email are required' });
  const row = await DataRequest.create({
    ...tenantCreateData(req, {}), requester_name, requester_email,
    requester_phone: req.body.requester_phone || '', request_type: req.body.request_type || 'access', patient_id: req.body.patient_id || null,
    user_id: req.body.user_id || null, description: req.body.description || '', due_date: req.body.due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), status: req.body.status || 'open', assigned_to: req.body.assigned_to || null,
  });
  await audit(req.user, `Created data request ${row.id}`);
  res.status(201).json({ message: 'Data request created', id: row.id });
}));

router.patch('/legal-security/data-requests/:id', ...canManage, asyncHandler(async (req, res) => {
  const allowed = ['status', 'assigned_to', 'resolution_notes', 'due_date'];
  const update = {};
  for (const k of allowed) if (k in req.body) update[k] = req.body[k];
  if (['resolved', 'closed'].includes(update.status)) update.resolved_at = new Date();
  await DataRequest.updateOne({ id: Number(req.params.id) }, { $set: update });
  await audit(req.user, `Updated data request ${req.params.id}`);
  res.json({ message: 'Data request updated' });
}));

router.get('/legal-security/incidents', ...canView, asyncHandler(async (req, res) => {
  const filter = tenantFilter(req);
  res.json(await SecurityIncident.find(filter).sort({ id: -1 }).limit(300).lean());
}));

router.post('/legal-security/incidents', ...canManage, asyncHandler(async (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ message: 'Incident title is required' });
  const row = await SecurityIncident.create({
    ...tenantCreateData(req, {}), title, severity: req.body.severity || 'medium', category: req.body.category || 'security',
    reported_by: req.user.id, affected_systems: Array.isArray(req.body.affected_systems) ? req.body.affected_systems : String(req.body.affected_systems || '').split(',').map(x => x.trim()).filter(Boolean),
    patient_data_involved: Boolean(req.body.patient_data_involved), description: req.body.description || '', containment_actions: req.body.containment_actions || '', status: req.body.status || 'open',
  });
  await audit(req.user, `Created security incident ${row.id}`);
  res.status(201).json({ message: 'Security incident created', id: row.id });
}));

router.patch('/legal-security/incidents/:id', ...canManage, asyncHandler(async (req, res) => {
  const allowed = ['severity', 'category', 'affected_systems', 'patient_data_involved', 'description', 'containment_actions', 'root_cause', 'corrective_actions', 'status'];
  const update = {};
  for (const k of allowed) if (k in req.body) update[k] = req.body[k];
  if (update.status === 'closed') update.closed_at = new Date();
  await SecurityIncident.updateOne({ id: Number(req.params.id) }, { $set: update });
  await audit(req.user, `Updated security incident ${req.params.id}`);
  res.json({ message: 'Security incident updated' });
}));

router.get('/legal-security/export/audit-pack', ...canView, asyncHandler(async (req, res) => {
  const hospitalFilter = tenantFilter(req);
  const [policies, dataRequests, incidents, acknowledgements] = await Promise.all([
    LegalPolicy.find().sort({ policy_key: 1 }).lean(),
    DataRequest.find(hospitalFilter).sort({ id: -1 }).limit(1000).lean(),
    SecurityIncident.find(hospitalFilter).sort({ id: -1 }).limit(1000).lean(),
    PolicyAcknowledgement.find(hospitalFilter).sort({ id: -1 }).limit(1000).lean(),
  ]);
  res.json({ exported_at: new Date().toISOString(), policies, dataRequests, incidents, acknowledgements });
}));

module.exports = router;
