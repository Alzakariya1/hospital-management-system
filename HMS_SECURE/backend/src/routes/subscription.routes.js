const express = require('express');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { Hospital } = require('../models');
const { DEFAULT_HOSPITAL_ID } = require('../middleware/tenant');
const { auditEvent } = require('../utils/audit');
const {
  PLAN_DEFINITIONS,
  getPlanId,
  getHospitalSubscription,
  mergePlanLimits,
  normalizePlanModules,
  normalizePlanFeatureFlags,
} = require('../utils/subscription');

const router = express.Router();
const VALID_SUBSCRIPTION_STATUS = ['trial', 'active', 'past_due', 'suspended', 'cancelled'];

router.get('/subscription/plans', verifyToken, (req, res) => {
  res.json(Object.values(PLAN_DEFINITIONS));
});

router.get('/subscription/current', verifyToken, asyncHandler(async (req, res) => {
  const hospitalId = Number(req.user.hospital_id || DEFAULT_HOSPITAL_ID);
  res.json(await getHospitalSubscription(hospitalId));
}));

router.get('/tenants/:id/subscription', verifyToken, requirePermission('hospital.manage'), asyncHandler(async (req, res) => {
  res.json(await getHospitalSubscription(Number(req.params.id)));
}));

router.patch('/tenants/:id/subscription', verifyToken, requirePermission('hospital.manage'), asyncHandler(async (req, res) => {
  const hospitalId = Number(req.params.id);
  const hospital = await Hospital.findOne({ id: hospitalId });
  if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

  const plan = getPlanId(req.body.plan || hospital.plan || 'clinic');
  const subscription = {
    ...(hospital.subscription || {}),
    status: VALID_SUBSCRIPTION_STATUS.includes(req.body.status) ? req.body.status : (hospital.subscription?.status || 'active'),
    renewal_date: req.body.renewal_date || hospital.subscription?.renewal_date || null,
    billing_cycle: req.body.billing_cycle || hospital.subscription?.billing_cycle || 'monthly',
    notes: req.body.notes || hospital.subscription?.notes || '',
    updated_at: new Date(),
  };

  const planLimits = mergePlanLimits(plan, req.body.plan_limits || hospital.plan_limits || {});
  hospital.plan = plan;
  hospital.plan_limits = planLimits;
  hospital.subscription = subscription;
  hospital.enabled_modules = normalizePlanModules(plan, hospital.enabled_modules);
  hospital.feature_flags = normalizePlanFeatureFlags(plan, hospital.feature_flags);
  await hospital.save();

  await auditEvent({
    req,
    userId: req.user.id,
    hospital_id: Number(req.user.hospital_id || DEFAULT_HOSPITAL_ID),
    action: `Updated subscription for hospital ${hospital.name}`,
    module_name: 'subscription',
    entity_type: 'hospital',
    entity_id: hospital.id,
    new_value: { plan, plan_limits: planLimits, subscription },
  });

  res.json({ message: 'Subscription updated successfully', subscription: await getHospitalSubscription(hospitalId) });
}));

module.exports = router;
