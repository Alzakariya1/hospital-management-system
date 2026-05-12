const express = require('express');
const { Hospital, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { DEFAULT_HOSPITAL_ID } = require('../middleware/tenant');

const router = express.Router();

const DEFAULT_MODULES = ['dashboard', 'patients', 'doctors', 'appointments', 'beds', 'lab', 'radiology', 'pharmacy', 'billing', 'profile'];

function publicHospital(hospital) {
  const x = hospital?.toJSON ? hospital.toJSON() : { ...(hospital || {}) };
  if (!x.id) x.id = DEFAULT_HOSPITAL_ID;
  if (!x.name) x.name = process.env.DEFAULT_HOSPITAL_NAME || 'Default Hospital';
  if (!Array.isArray(x.enabled_modules)) x.enabled_modules = DEFAULT_MODULES;
  if (!x.feature_flags) x.feature_flags = {};
  if (!x.branding) x.branding = {};
  if (!x.settings) x.settings = {};
  return x;
}

async function ensureHospital(id = DEFAULT_HOSPITAL_ID) {
  let hospital = await Hospital.findOne({ id: Number(id) });
  if (!hospital && Number(id) === DEFAULT_HOSPITAL_ID) {
    hospital = await Hospital.create({
      id: DEFAULT_HOSPITAL_ID,
      hospital_code: 'DEFAULT',
      name: process.env.DEFAULT_HOSPITAL_NAME || 'Default Hospital',
      type: 'hospital',
      status: 'active',
      plan: 'enterprise',
      enabled_modules: DEFAULT_MODULES,
      feature_flags: { multiTenant: true },
    });
  }
  return hospital;
}

router.get('/tenant/me', verifyToken, asyncHandler(async (req, res) => {
  const hospitalId = Number(req.user.hospital_id || DEFAULT_HOSPITAL_ID);
  const hospital = await ensureHospital(hospitalId);
  res.json(publicHospital(hospital));
}));

router.get('/tenants', verifyToken, requirePermission('hospital.manage'), asyncHandler(async (_req, res) => {
  const hospitals = await Hospital.find().sort({ id: -1 });
  res.json(hospitals.map(publicHospital));
}));

router.post('/tenants', verifyToken, requirePermission('hospital.manage'), asyncHandler(async (req, res) => {
  const payload = {
    hospital_code: req.body.hospital_code,
    name: req.body.name,
    type: req.body.type || 'hospital',
    status: req.body.status || 'active',
    plan: req.body.plan || 'enterprise',
    enabled_modules: Array.isArray(req.body.enabled_modules) ? req.body.enabled_modules : DEFAULT_MODULES,
    feature_flags: req.body.feature_flags || {},
    branding: req.body.branding || {},
    settings: req.body.settings || {},
  };
  if (!payload.name) return res.status(400).json({ message: 'Hospital name is required' });
  const hospital = await Hospital.create(payload);
  await AuditLog.create({ hospital_id: Number(req.user.hospital_id || DEFAULT_HOSPITAL_ID), user_id: req.user.id, action: `Created hospital ${hospital.name}`, module_name: 'tenants' });
  res.status(201).json(publicHospital(hospital));
}));

router.patch('/tenants/:id', verifyToken, requirePermission('hospital.manage'), asyncHandler(async (req, res) => {
  const allowed = ['name', 'type', 'status', 'plan', 'enabled_modules', 'feature_flags', 'branding', 'settings'];
  const update = {};
  for (const key of allowed) if (key in req.body) update[key] = req.body[key];
  await Hospital.updateOne({ id: Number(req.params.id) }, { $set: update });
  const hospital = await Hospital.findOne({ id: Number(req.params.id) });
  res.json(publicHospital(hospital));
}));

module.exports = router;
