const express = require('express');
const { InsuranceClaim, Patient, Billing } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { auditLog } = require('../utils/audit');
const { createNotification } = require('../utils/notifications');

const router = express.Router();
router.use(verifyToken, attachTenant);

const CLAIM_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'partially_approved', 'rejected', 'settled', 'cancelled'];

function normalizeClaimPayload(req) {
  const b = req.body || {};
  const claimAmount = Number(b.claim_amount || 0);
  const approvedAmount = Number(b.approved_amount || 0);
  const paidAmount = Number(b.paid_amount || 0);
  const balanceAmount = Math.max(approvedAmount - paidAmount, 0);
  return tenantCreateData(req, {
    patient_id: b.patient_id || '',
    billing_id: b.billing_id ? Number(b.billing_id) : undefined,
    invoice_number: b.invoice_number || '',
    insurance_provider: b.insurance_provider || '',
    tpa_name: b.tpa_name || '',
    policy_number: b.policy_number || '',
    claim_number: b.claim_number || `CLM-${Date.now()}`,
    claim_type: b.claim_type || 'cashless',
    claim_amount: claimAmount,
    approved_amount: approvedAmount,
    paid_amount: paidAmount,
    balance_amount: balanceAmount,
    status: CLAIM_STATUSES.includes(b.status) ? b.status : 'draft',
    priority: b.priority || 'normal',
    admission_date: b.admission_date || '',
    discharge_date: b.discharge_date || '',
    submitted_at: b.submitted_at || '',
    approved_at: b.approved_at || '',
    settled_at: b.settled_at || '',
    rejection_reason: b.rejection_reason || '',
    notes: b.notes || '',
    documents: Array.isArray(b.documents) ? b.documents : [],
    created_by: req.user?.id,
  });
}

async function hydrateClaims(req, rows) {
  const plain = rows.map((r) => (r.toJSON ? r.toJSON() : r));
  const patientIds = [...new Set(plain.map((x) => x.patient_id).filter(Boolean))];
  const patients = await Patient.find(tenantFilter(req, {
    $or: [
      { id: { $in: patientIds.map(Number).filter((n) => !Number.isNaN(n)) } },
      { patient_id: { $in: patientIds } },
    ],
  })).lean();
  const pm = Object.fromEntries([
    ...patients.map((p) => [String(p.id), p]),
    ...patients.map((p) => [String(p.patient_id), p]),
  ]);
  return plain.map((x) => ({ ...x, patient_name: pm[String(x.patient_id)]?.full_name, phone: pm[String(x.patient_id)]?.phone }));
}

router.get('/insurance/claims', requirePermission('insurance.view'), asyncHandler(async (req, res) => {
  const status = req.query.status && req.query.status !== 'all' ? { status: req.query.status } : {};
  const rows = await InsuranceClaim.find(tenantFilter(req, status)).sort({ id: -1 });
  res.json(await hydrateClaims(req, rows));
}));

router.get('/insurance/summary', requirePermission('insurance.view'), asyncHandler(async (req, res) => {
  const claims = await InsuranceClaim.find(tenantFilter(req)).lean();
  const totalClaimed = claims.reduce((s, c) => s + Number(c.claim_amount || 0), 0);
  const totalApproved = claims.reduce((s, c) => s + Number(c.approved_amount || 0), 0);
  const totalPaid = claims.reduce((s, c) => s + Number(c.paid_amount || 0), 0);
  const byStatus = claims.reduce((acc, c) => {
    acc[c.status || 'draft'] = (acc[c.status || 'draft'] || 0) + 1;
    return acc;
  }, {});
  res.json({ claims: claims.length, totalClaimed, totalApproved, totalPaid, outstanding: Math.max(totalApproved - totalPaid, 0), byStatus });
}));

router.post('/insurance/claims', requirePermission('insurance.manage'), asyncHandler(async (req, res) => {
  const claim = await InsuranceClaim.create(normalizeClaimPayload(req));
  await auditLog(req, { action: 'insurance_claim_created', module_name: 'insurance', entity_type: 'insurance_claim', entity_id: String(claim.id), new_value: claim.toJSON ? claim.toJSON() : claim });
  await createNotification(req, { title: 'Insurance claim created', message: `${claim.claim_number} created`, type: 'insurance', module: 'insurance', entity_type: 'insurance_claim', entity_id: String(claim.id) });
  res.status(201).json({ message: 'Insurance claim created', claim });
}));

router.put('/insurance/claims/:id', requirePermission('insurance.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const oldClaim = await InsuranceClaim.findOne(tenantFilter(req, { id })).lean();
  if (!oldClaim) return res.status(404).json({ message: 'Insurance claim not found' });
  const payload = normalizeClaimPayload(req);
  const updated = await InsuranceClaim.findOneAndUpdate(tenantFilter(req, { id }), { $set: payload }, { new: true });
  await auditLog(req, { action: 'insurance_claim_updated', module_name: 'insurance', entity_type: 'insurance_claim', entity_id: String(id), old_value: oldClaim, new_value: updated?.toJSON ? updated.toJSON() : updated });
  res.json({ message: 'Insurance claim updated', claim: updated });
}));

router.patch('/insurance/claims/:id/status', requirePermission('insurance.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const status = CLAIM_STATUSES.includes(req.body.status) ? req.body.status : null;
  if (!status) return res.status(400).json({ message: 'Invalid claim status' });
  const update = { status };
  if (status === 'submitted') update.submitted_at = new Date();
  if (['approved', 'partially_approved'].includes(status)) update.approved_at = new Date();
  if (status === 'settled') update.settled_at = new Date();
  if (req.body.approved_amount !== undefined) update.approved_amount = Number(req.body.approved_amount || 0);
  if (req.body.paid_amount !== undefined) update.paid_amount = Number(req.body.paid_amount || 0);
  if (req.body.rejection_reason !== undefined) update.rejection_reason = req.body.rejection_reason;
  const claim = await InsuranceClaim.findOneAndUpdate(tenantFilter(req, { id }), { $set: update }, { new: true });
  if (!claim) return res.status(404).json({ message: 'Insurance claim not found' });
  claim.balance_amount = Math.max(Number(claim.approved_amount || 0) - Number(claim.paid_amount || 0), 0);
  await claim.save();
  await auditLog(req, { action: 'insurance_claim_status_updated', module_name: 'insurance', entity_type: 'insurance_claim', entity_id: String(id), new_value: { status, approved_amount: claim.approved_amount, paid_amount: claim.paid_amount } });
  await createNotification(req, { title: 'Insurance claim updated', message: `${claim.claim_number} is now ${status}`, type: 'insurance', module: 'insurance', entity_type: 'insurance_claim', entity_id: String(id) });
  res.json({ message: 'Claim status updated', claim });
}));

router.post('/insurance/claims/from-bill/:billingId', requirePermission('insurance.manage'), asyncHandler(async (req, res) => {
  const bill = await Billing.findOne(tenantFilter(req, { id: Number(req.params.billingId) })).lean();
  if (!bill) return res.status(404).json({ message: 'Bill not found' });
  const claim = await InsuranceClaim.create(tenantCreateData(req, {
    patient_id: bill.patient_id,
    billing_id: bill.id,
    invoice_number: bill.invoice_number,
    insurance_provider: req.body.insurance_provider || bill.insurance_provider || '',
    tpa_name: req.body.tpa_name || '',
    policy_number: req.body.policy_number || bill.insurance_policy_number || '',
    claim_number: req.body.claim_number || `CLM-${Date.now()}`,
    claim_type: req.body.claim_type || 'cashless',
    claim_amount: Number(req.body.claim_amount || bill.total_amount || 0),
    approved_amount: 0,
    paid_amount: 0,
    balance_amount: 0,
    status: 'draft',
    notes: req.body.notes || '',
    created_by: req.user?.id,
  }));
  await auditLog(req, { action: 'insurance_claim_created_from_bill', module_name: 'insurance', entity_type: 'insurance_claim', entity_id: String(claim.id), new_value: claim.toJSON ? claim.toJSON() : claim });
  res.status(201).json({ message: 'Claim created from bill', claim });
}));

module.exports = router;
