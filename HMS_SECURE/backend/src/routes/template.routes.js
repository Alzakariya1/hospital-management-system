const express = require('express');
const { Template } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { auditEvent } = require('../utils/audit');

const router = express.Router();
router.use(verifyToken, attachTenant);

const VALID_TYPES = ['invoice', 'prescription', 'lab_report', 'radiology_report', 'discharge_summary'];


function renderTemplateText(template, data = {}) {
  const source = [template.header_text, template.body_template, template.footer_text].filter(Boolean).join('\n\n');
  return source.replace(/{{\s*([a-zA-Z0-9_\.]+)\s*}}/g, (_, key) => {
    const parts = String(key).split('.');
    let value = data;
    for (const part of parts) value = value && Object.prototype.hasOwnProperty.call(value, part) ? value[part] : '';
    return value === undefined || value === null ? '' : String(value);
  });
}

function sanitize(body = {}) {
  const template_type = String(body.template_type || 'invoice').trim();
  if (!VALID_TYPES.includes(template_type)) {
    const err = new Error('Invalid template type.');
    err.status = 400;
    throw err;
  }
  return {
    template_type,
    name: String(body.name || '').trim() || `${template_type.replaceAll('_', ' ')} Template`,
    header_text: String(body.header_text || '').trim(),
    footer_text: String(body.footer_text || '').trim(),
    body_template: String(body.body_template || '').trim(),
    paper_size: body.paper_size || 'A4',
    orientation: body.orientation || 'portrait',
    logo_position: body.logo_position || 'left',
    show_hospital_logo: body.show_hospital_logo !== false,
    show_patient_details: body.show_patient_details !== false,
    show_doctor_signature: body.show_doctor_signature !== false,
    is_default: Boolean(body.is_default),
    is_active: body.is_active === undefined ? true : Boolean(body.is_active),
  };
}

router.get('/templates', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const query = tenantFilter(req);
  if (req.query.type) query.template_type = String(req.query.type);
  if (req.query.active === 'true') query.is_active = true;
  const rows = await Template.find(query).sort({ template_type: 1, is_default: -1, id: -1 }).lean();
  res.json(rows);
}));

router.get('/templates/public', asyncHandler(async (req, res) => {
  const query = tenantFilter(req, { is_active: true });
  if (req.query.type) query.template_type = String(req.query.type);
  const rows = await Template.find(query).sort({ is_default: -1, id: -1 }).lean();
  res.json(rows);
}));

router.post('/templates', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const data = sanitize(req.body);
  if (data.is_default) await Template.updateMany(tenantFilter(req, { template_type: data.template_type }), { $set: { is_default: false } });
  const row = await Template.create(tenantCreateData(req, data));
  await auditEvent({ req, action: `Created ${data.template_type} template`, module_name: 'configuration', entity_type: 'template', entity_id: String(row.id), new_value: data });
  res.status(201).json({ message: 'Template created', template: row });
}));


router.post('/templates/:id/preview', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const template = await Template.findOne(tenantFilter(req, { id })).lean();
  if (!template) return res.status(404).json({ message: 'Template not found.' });
  const sampleData = {
    patient_name: 'Sample Patient',
    doctor_name: 'Dr. Sample',
    hospital_name: req.hospital?.name || 'Sample Hospital',
    invoice_number: 'INV-SAMPLE-001',
    total_amount: '2500',
    paid_amount: '1500',
    diagnosis: 'Fever and follow-up care',
    prescription_items: 'Paracetamol 500mg - twice daily',
    report_notes: 'Sample report notes',
    ...(req.body || {}),
  };
  res.json({ message: 'Template preview generated', preview: renderTemplateText(template, sampleData), sampleData });
}));

router.put('/templates/:id', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = await Template.findOne(tenantFilter(req, { id })).lean();
  if (!current) return res.status(404).json({ message: 'Template not found.' });
  const data = sanitize({ ...current, ...req.body });
  if (data.is_default) await Template.updateMany(tenantFilter(req, { template_type: data.template_type, id: { $ne: id } }), { $set: { is_default: false } });
  await Template.updateOne(tenantFilter(req, { id }), { $set: data });
  await auditEvent({ req, action: `Updated ${data.template_type} template`, module_name: 'configuration', entity_type: 'template', entity_id: String(id), old_value: current, new_value: data });
  res.json({ message: 'Template updated' });
}));

router.patch('/templates/:id/status', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = await Template.findOne(tenantFilter(req, { id })).lean();
  if (!current) return res.status(404).json({ message: 'Template not found.' });
  await Template.updateOne(tenantFilter(req, { id }), { $set: { is_active: Boolean(req.body.is_active) } });
  res.json({ message: 'Template status updated' });
}));

router.delete('/templates/:id', requirePermission('configuration.manage'), asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const current = await Template.findOne(tenantFilter(req, { id })).lean();
  if (!current) return res.status(404).json({ message: 'Template not found.' });
  await Template.deleteOne(tenantFilter(req, { id }));
  await auditEvent({ req, action: `Deleted ${current.template_type} template`, module_name: 'configuration', entity_type: 'template', entity_id: String(id), old_value: current });
  res.json({ message: 'Template deleted' });
}));

module.exports = router;
