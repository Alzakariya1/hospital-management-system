const express = require('express');
const { DynamicField } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { auditEvent } = require('../utils/audit');

const router = express.Router();
router.use(verifyToken, attachTenant);

const VALID_MODULES = ['patients', 'doctors', 'appointments', 'billing', 'lab', 'radiology', 'pharmacy', 'ipd', 'opd'];
const VALID_FIELD_TYPES = ['text', 'number', 'date', 'select', 'textarea', 'checkbox'];

function normalizeKey(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function normalizeOptions(value) {
  if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(x => x.trim()).filter(Boolean);
  return [];
}

function sanitizeDynamicField(body = {}) {
  const target_module = String(body.target_module || body.module || '').trim();
  const field_key = normalizeKey(body.field_key || body.label);
  const field_type = String(body.field_type || 'text').trim();
  if (!VALID_MODULES.includes(target_module)) {
    const err = new Error('Invalid target module.');
    err.status = 400;
    throw err;
  }
  if (!field_key) {
    const err = new Error('Field key or label is required.');
    err.status = 400;
    throw err;
  }
  if (!VALID_FIELD_TYPES.includes(field_type)) {
    const err = new Error('Invalid field type.');
    err.status = 400;
    throw err;
  }
  return {
    target_module,
    field_key,
    label: String(body.label || field_key.replaceAll('_', ' ')).trim(),
    field_type,
    placeholder: body.placeholder || '',
    section: body.section || 'Additional Details',
    help_text: body.help_text || '',
    required: Boolean(body.required),
    options: normalizeOptions(body.options),
    default_value: body.default_value || '',
    display_order: Number(body.display_order || 100),
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
  };
}

router.get('/configuration/dynamic-fields', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const query = tenantFilter(req);
  if (req.query.module) query.target_module = String(req.query.module);
  if (req.query.active === 'true') query.is_active = true;
  if (req.query.active === 'false') query.is_active = false;
  const rows = await DynamicField.find(query).sort({ target_module: 1, display_order: 1, id: 1 }).lean();
  res.json(rows);
}));

router.get('/configuration/public-fields', asyncHandler(async (req, res) => {
  const query = tenantFilter(req, { is_active: true });
  if (req.query.module) query.target_module = String(req.query.module);
  const rows = await DynamicField.find(query).sort({ target_module: 1, display_order: 1, id: 1 }).lean();
  res.json(rows);
}));

router.post('/configuration/dynamic-fields', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const data = sanitizeDynamicField(req.body);
  const duplicate = await DynamicField.findOne(tenantFilter(req, { target_module: data.target_module, field_key: data.field_key }));
  if (duplicate) return res.status(409).json({ message: 'A field with this key already exists for this module.' });
  const row = await DynamicField.create(tenantCreateData(req, data));
  await auditEvent({ req, action: `Created dynamic field ${data.target_module}.${data.field_key}`, module_name: 'configuration', entity_type: 'dynamic_field', entity_id: String(row.id), new_value: data });
  res.status(201).json({ message: 'Dynamic field created', field: row });
}));

router.put('/configuration/dynamic-fields/:id', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = await DynamicField.findOne(tenantFilter(req, { id })).lean();
  if (!current) return res.status(404).json({ message: 'Dynamic field not found.' });
  const data = sanitizeDynamicField({ ...current, ...req.body });
  const duplicate = await DynamicField.findOne(tenantFilter(req, { target_module: data.target_module, field_key: data.field_key, id: { $ne: id } }));
  if (duplicate) return res.status(409).json({ message: 'A field with this key already exists for this module.' });
  await DynamicField.updateOne(tenantFilter(req, { id }), { $set: data });
  await auditEvent({ req, action: `Updated dynamic field ${data.target_module}.${data.field_key}`, module_name: 'configuration', entity_type: 'dynamic_field', entity_id: String(id), old_value: current, new_value: data });
  res.json({ message: 'Dynamic field updated' });
}));

router.patch('/configuration/dynamic-fields/:id/status', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = await DynamicField.findOne(tenantFilter(req, { id })).lean();
  if (!current) return res.status(404).json({ message: 'Dynamic field not found.' });
  const is_active = Boolean(req.body.is_active);
  await DynamicField.updateOne(tenantFilter(req, { id }), { $set: { is_active } });
  await auditEvent({ req, action: `${is_active ? 'Enabled' : 'Disabled'} dynamic field ${current.target_module}.${current.field_key}`, module_name: 'configuration', entity_type: 'dynamic_field', entity_id: String(id), old_value: { is_active: current.is_active }, new_value: { is_active } });
  res.json({ message: 'Dynamic field status updated' });
}));

router.delete('/configuration/dynamic-fields/:id', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = await DynamicField.findOne(tenantFilter(req, { id })).lean();
  if (!current) return res.status(404).json({ message: 'Dynamic field not found.' });
  await DynamicField.deleteOne(tenantFilter(req, { id }));
  await auditEvent({ req, action: `Deleted dynamic field ${current.target_module}.${current.field_key}`, module_name: 'configuration', entity_type: 'dynamic_field', entity_id: String(id), old_value: current });
  res.json({ message: 'Dynamic field deleted' });
}));

module.exports = router;
