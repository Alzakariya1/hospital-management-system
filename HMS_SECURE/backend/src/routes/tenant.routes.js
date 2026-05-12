const express = require('express');
const bcrypt = require('bcryptjs');
const { Hospital, User, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { DEFAULT_HOSPITAL_ID } = require('../middleware/tenant');

const router = express.Router();

const DEFAULT_MODULES = ['dashboard', 'patients', 'doctors', 'appointments', 'beds', 'lab', 'radiology', 'pharmacy', 'billing', 'profile', 'tenants'];
const ALLOWED_MODULES = new Set(DEFAULT_MODULES);
const FEATURE_FLAGS = ['fhir', 'hl7', 'pacs', 'biometric', 'insurance_tpa', 'erp', 'whatsapp_sms', 'abdm_abha', 'two_factor_auth', 'audit_compliance'];
const DEFAULT_FEATURE_FLAGS = FEATURE_FLAGS.reduce((acc, key) => { acc[key] = key === 'audit_compliance'; return acc; }, {});

const VALID_TENANT_TYPES = ['hospital', 'clinic', 'diagnostic_center', 'nursing_home'];
const VALID_PLANS = ['clinic', 'hospital', 'enterprise'];
const VALID_STATUSES = ['active', 'inactive'];
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);
const PASSWORD_MIN_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH || 8);

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function validatePassword(password) {
  return (!password || String(password).length < PASSWORD_MIN_LENGTH)
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    : null;
}

function sanitizeHospitalCode(code) {
  const clean = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  return clean || undefined;
}

function validateTenantPayload(payload) {
  if (!payload.name || !String(payload.name).trim()) return 'Hospital name is required';
  if (payload.type && !VALID_TENANT_TYPES.includes(payload.type)) return 'Invalid hospital type';
  if (payload.plan && !VALID_PLANS.includes(payload.plan)) return 'Invalid hospital plan';
  if (payload.status && !VALID_STATUSES.includes(payload.status)) return 'Invalid hospital status';
  return null;
}

async function buildInitialAdminPayload(req, hospitalId) {
  const admin = req.body.initial_admin || {};
  const fullName = String(admin.full_name || req.body.admin_full_name || '').trim();
  const email = normalizeEmail(admin.email || req.body.admin_email);
  const password = admin.password || req.body.admin_password;
  const phone = admin.phone || req.body.admin_phone || '';

  if (!fullName && !email && !password && !phone) return null;
  if (!fullName || !email || !password) {
    const err = new Error('Admin full name, email and password are required when creating a hospital admin');
    err.status = 400;
    throw err;
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    const err = new Error(passwordError);
    err.status = 400;
    throw err;
  }
  const existing = await User.findOne({ email });
  if (existing) {
    const err = new Error('Admin email already exists');
    err.status = 409;
    throw err;
  }

  return {
    full_name: fullName,
    email,
    hospital_id: Number(hospitalId),
    password: await bcrypt.hash(String(password), BCRYPT_ROUNDS),
    role: 'hospital_admin',
    phone: phone || null,
    status: 'active',
    profile_image: '',
    bio: '',
    permissions: [],
    password_changed_at: new Date(),
  };
}

function publicUser(user) {
  if (!user) return null;
  const x = user?.toJSON ? user.toJSON() : { ...user };
  delete x.password;
  delete x.reset_token;
  delete x.reset_token_expires;
  return x;
}

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
    hospital_code: sanitizeHospitalCode(req.body.hospital_code),
    name: String(req.body.name || '').trim(),
    type: req.body.type || 'hospital',
    status: req.body.status || 'active',
    plan: req.body.plan || 'enterprise',
    enabled_modules: sanitizeModules(req.body.enabled_modules),
    feature_flags: sanitizeFeatureFlags(req.body.feature_flags),
    branding: req.body.branding || {},
    settings: req.body.settings || {},
  };

  const payloadError = validateTenantPayload(payload);
  if (payloadError) return res.status(400).json({ message: payloadError });
  if (payload.hospital_code && await Hospital.findOne({ hospital_code: payload.hospital_code })) {
    return res.status(409).json({ message: 'Hospital code already exists' });
  }

  const hospital = await Hospital.create(payload);
  let adminUser = null;

  try {
    const adminPayload = await buildInitialAdminPayload(req, hospital.id);
    if (adminPayload) {
      adminUser = await User.create(adminPayload);
    }
  } catch (err) {
    await Hospital.deleteOne({ id: hospital.id });
    throw err;
  }

  await AuditLog.create({
    hospital_id: Number(req.user.hospital_id || DEFAULT_HOSPITAL_ID),
    user_id: req.user.id,
    action: adminUser
      ? `Created hospital ${hospital.name} with admin ${adminUser.email}`
      : `Created hospital ${hospital.name}`,
    module_name: 'tenants',
  });

  res.status(201).json({
    message: adminUser ? 'Hospital and admin user created successfully' : 'Hospital created successfully',
    hospital: publicHospital(hospital),
    admin_user: publicUser(adminUser),
  });
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

  if ('hospital_code' in req.body) {
    const code = sanitizeHospitalCode(req.body.hospital_code);
    if (code) {
      const existing = await Hospital.findOne({ hospital_code: code, id: { $ne: Number(req.params.id) } });
      if (existing) return res.status(409).json({ message: 'Hospital code already exists' });
      update.hospital_code = code;
    }
  }

  const validationTarget = { ...update, name: update.name || 'ok' };
  const payloadError = validateTenantPayload(validationTarget);
  if (payloadError) return res.status(400).json({ message: payloadError });

  await Hospital.updateOne({ id: Number(req.params.id) }, { $set: update });
  const hospital = await Hospital.findOne({ id: Number(req.params.id) });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });
  res.json(publicHospital(hospital));
}));

router.get('/tenants/:id/admins', verifyToken, requirePermission('hospital.manage'), asyncHandler(async (req, res) => {
  const hospitalId = Number(req.params.id);
  const admins = await User.find({ hospital_id: hospitalId, role: 'admin' }).sort({ id: -1 });
  res.json(admins.map(publicUser));
}));

router.post('/tenants/:id/admins', verifyToken, requirePermission('hospital.manage'), asyncHandler(async (req, res) => {
  const hospitalId = Number(req.params.id);
  const hospital = await Hospital.findOne({ id: hospitalId });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

  const adminPayload = await buildInitialAdminPayload(req, hospitalId);
  if (!adminPayload) return res.status(400).json({ message: 'Admin full name, email and password are required' });

  const adminUser = await User.create(adminPayload);
  await AuditLog.create({
    hospital_id: Number(req.user.hospital_id || DEFAULT_HOSPITAL_ID),
    user_id: req.user.id,
    action: `Created admin ${adminUser.email} for hospital ${hospital.name}`,
    module_name: 'tenants',
  });

  res.status(201).json({ message: 'Hospital admin created successfully', admin_user: publicUser(adminUser) });
}));

module.exports = router;
