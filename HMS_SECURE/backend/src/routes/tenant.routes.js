const express = require('express');
const { Hospital, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { DEFAULT_HOSPITAL_ID } = require('../middleware/tenant');

const router = express.Router();

const DEFAULT_MODULES = ['dashboard', 'patients', 'doctors', 'appointments', 'beds', 'lab', 'radiology', 'pharmacy', 'billing', 'profile', 'tenants'];
const ALLOWED_MODULES = new Set(DEFAULT_MODULES);
const FEATURE_FLAGS = ['fhir', 'hl7', 'pacs', 'biometric', 'insurance_tpa', 'erp', 'whatsapp_sms', 'abdm_abha', 'two_factor_auth', 'audit_compliance'];
const DEFAULT_FEATURE_FLAGS = FEATURE_FLAGS.reduce((acc, key) => { acc[key] = key === 'audit_compliance'; return acc; }, {});

function publicHospital(hospital) {
  const x = hospital?.toJSON ? hospital.toJSON() : { ...(hospital || {}) };
  if (!x.id) x.id = DEFAULT_HOSPITAL_ID;
  if (!x.name) x.name = process.env.DEFAULT_HOSPITAL_NAME || 'Default Hospital';
  if (!Array.isArray(x.enabled_modules) || !x.enabled_modules.length) x.enabled_modules = DEFAULT_MODULES;
  x.feature_flags = sanitizeFeatureFlags(x.feature_flags);
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
      feature_flags: DEFAULT_FEATURE_FLAGS,
    });
  }
  if (hospital && Number(id) === DEFAULT_HOSPITAL_ID && (!Array.isArray(hospital.enabled_modules) || !hospital.enabled_modules.length)) {
    hospital.enabled_modules = DEFAULT_MODULES;
    await hospital.save();
  }
  return hospital;
}

function sanitizeModules(modules) {
  if (!Array.isArray(modules)) return DEFAULT_MODULES;
  const cleanModules = Array.from(new Set(modules.filter((moduleId) => ALLOWED_MODULES.has(moduleId))));
  return cleanModules.length ? cleanModules : DEFAULT_MODULES;
}

function sanitizeFeatureFlags(featureFlags) {
  const safeFlags = { ...DEFAULT_FEATURE_FLAGS };
  if (featureFlags && typeof featureFlags === 'object' && !Array.isArray(featureFlags)) {
    for (const key of FEATURE_FLAGS) {
      if (key in featureFlags) safeFlags[key] = Boolean(featureFlags[key]);
    }
  }
  return safeFlags;
}

router.get('/tenant/modules', verifyToken, requirePermission('hospital.manage'), (_req, res) => {
  res.json(DEFAULT_MODULES);
});

router.get('/tenant/features', verifyToken, requirePermission('hospital.manage'), (_req, res) => {
  res.json({ features: FEATURE_FLAGS, defaults: DEFAULT_FEATURE_FLAGS });
});

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
    enabled_modules: sanitizeModules(req.body.enabled_modules),
    feature_flags: sanitizeFeatureFlags(req.body.feature_flags),
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
  for (const key of allowed) {
    if (!(key in req.body)) continue;
    if (key === 'enabled_modules') update[key] = sanitizeModules(req.body[key]);
    else if (key === 'feature_flags') update[key] = sanitizeFeatureFlags(req.body[key]);
    else update[key] = req.body[key];
  }
  await Hospital.updateOne({ id: Number(req.params.id) }, { $set: update });
  const hospital = await Hospital.findOne({ id: Number(req.params.id) });
  res.json(publicHospital(hospital));
}));

module.exports = router;
