const express = require('express');
const { LabTest, RadiologyTest, Patient, Doctor, OpdRecord } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');
const { createNotification } = require('../utils/notifications');

const router = express.Router();
router.use(verifyToken, attachTenant);

const LAB_STATUSES = ['ordered', 'sample_collected', 'processing', 'completed', 'cancelled'];
const RAD_STATUSES = ['ordered', 'scheduled', 'scanned', 'reported', 'cancelled'];

async function withNames(req, rows) {
  const plain = rows.map(r => r.toJSON ? r.toJSON() : r);
  const patientIds = [...new Set(plain.map(x => x.patient_id).filter(Boolean))];
  const doctorIds = [...new Set(plain.map(x => x.doctor_id).filter(Boolean))];

  const patients = patientIds.length ? await Patient.find(tenantFilter(req, {
    $or: [
      { id: { $in: patientIds.map(Number).filter(n => !Number.isNaN(n)) } },
      { patient_id: { $in: patientIds } },
    ],
  })).lean() : [];

  const doctors = doctorIds.length ? await Doctor.find(tenantFilter(req, {
    $or: [
      { id: { $in: doctorIds.map(Number).filter(n => !Number.isNaN(n)) } },
      { doctor_id: { $in: doctorIds } },
    ],
  })).lean() : [];

  const pm = Object.fromEntries([...patients.map(p => [String(p.id), p.full_name]), ...patients.map(p => [String(p.patient_id), p.full_name])]);
  const dm = Object.fromEntries([...doctors.map(d => [String(d.id), d.full_name]), ...doctors.map(d => [String(d.doctor_id), d.full_name])]);
  return plain.map(x => ({ ...x, patient_name: pm[String(x.patient_id)], doctor_name: dm[String(x.doctor_id)] }));
}

function cleanLabPayload(req, overrides = {}) {
  return tenantCreateData(req, {
    patient_id: req.body.patient_id,
    doctor_id: req.body.doctor_id,
    appointment_id: req.body.appointment_id ? Number(req.body.appointment_id) : undefined,
    opd_id: req.body.opd_id ? Number(req.body.opd_id) : undefined,
    test_name: req.body.test_name || req.body.name || req.body.test || 'Lab Test',
    test_category: req.body.test_category || req.body.category || 'General',
    priority: req.body.priority || 'routine',
    test_status: req.body.test_status || 'ordered',
    notes: req.body.notes || '',
    ...overrides,
  });
}

function cleanRadPayload(req, overrides = {}) {
  return tenantCreateData(req, {
    patient_id: req.body.patient_id,
    doctor_id: req.body.doctor_id,
    appointment_id: req.body.appointment_id ? Number(req.body.appointment_id) : undefined,
    opd_id: req.body.opd_id ? Number(req.body.opd_id) : undefined,
    scan_name: req.body.scan_name || req.body.name || req.body.scan || 'Radiology Scan',
    scan_category: req.body.scan_category || req.body.category || 'General',
    priority: req.body.priority || 'routine',
    status: req.body.status || 'ordered',
    notes: req.body.notes || '',
    ...overrides,
  });
}

router.post('/lab/tests', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  const r = await LabTest.create(cleanLabPayload(req));
  await createNotification(req, { title: 'Lab order created', message: `${r.test_name} ordered.`, type: 'lab', severity: 'info', module: 'lab', entity_type: 'lab_test', entity_id: r.id, target_path: '/labs' });
  res.status(201).json({ message: 'Lab order created', labTestId: r.id });
}));

router.post('/lab/book-test', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  const r = await LabTest.create(cleanLabPayload(req));
  await createNotification(req, { title: 'Lab order created', message: `${r.test_name} ordered.`, type: 'lab', severity: 'info', module: 'lab', entity_type: 'lab_test', entity_id: r.id, target_path: '/labs' });
  res.status(201).json({ message: 'Lab order created', labTestId: r.id });
}));

router.patch('/lab/tests/:id/status', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  const status = req.body.test_status || req.body.status;
  if (!LAB_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid lab status' });
  const update = { test_status: status };
  if (status === 'sample_collected') update.sample_collected_at = new Date();
  if (status === 'completed') update.completed_at = new Date();
  await LabTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: update });
  await createNotification(req, { title: 'Lab status updated', message: `Lab order #${req.params.id} marked as ${status}.`, type: 'lab', severity: status === 'completed' ? 'success' : 'info', module: 'lab', entity_type: 'lab_test', entity_id: req.params.id, target_path: '/labs' });
  res.json({ message: 'Lab status updated' });
}));

router.patch('/lab/sample-collected/:id', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  await LabTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { test_status: 'sample_collected', sample_collected_at: new Date() } });
  res.json({ message: 'Sample marked as collected' });
}));

router.patch('/lab/upload-report/:id', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  await LabTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { test_status: 'completed', completed_at: new Date(), report_file: req.body.report_file || null, report_notes: req.body.report_notes || null } });
  await createNotification(req, { title: 'Lab report completed', message: `Lab report #${req.params.id} uploaded.`, type: 'lab', severity: 'success', module: 'lab', entity_type: 'lab_test', entity_id: req.params.id, target_path: '/labs' });
  res.json({ message: 'Lab report uploaded' });
}));

router.get('/lab/tests', requirePermission('lab.view'), asyncHandler(async (req, res) => {
  res.json(await withNames(req, await LabTest.find(tenantFilter(req)).sort({ id: -1 })));
}));

router.post('/radiology/tests', requirePermission('radiology.create'), asyncHandler(async (req, res) => {
  const r = await RadiologyTest.create(cleanRadPayload(req));
  await createNotification(req, { title: 'Radiology order created', message: `${r.scan_name} ordered.`, type: 'radiology', severity: 'info', module: 'radiology', entity_type: 'radiology_test', entity_id: r.id, target_path: '/labs' });
  res.status(201).json({ message: 'Radiology order created', scanId: r.id });
}));

router.post('/radiology/book-scan', requirePermission('radiology.create'), asyncHandler(async (req, res) => {
  const r = await RadiologyTest.create(cleanRadPayload(req));
  await createNotification(req, { title: 'Radiology order created', message: `${r.scan_name} ordered.`, type: 'radiology', severity: 'info', module: 'radiology', entity_type: 'radiology_test', entity_id: r.id, target_path: '/labs' });
  res.status(201).json({ message: 'Radiology order created', scanId: r.id });
}));

router.patch('/radiology/tests/:id/status', requirePermission('radiology.create'), asyncHandler(async (req, res) => {
  const status = req.body.status;
  if (!RAD_STATUSES.includes(status)) return res.status(400).json({ message: 'Invalid radiology status' });
  const update = { status };
  if (status === 'scheduled') update.scheduled_at = req.body.scheduled_at || new Date();
  if (status === 'scanned') update.scanned_at = new Date();
  if (status === 'reported') update.reported_at = new Date();
  await RadiologyTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: update });
  await createNotification(req, { title: 'Radiology status updated', message: `Radiology order #${req.params.id} marked as ${status}.`, type: 'radiology', severity: status === 'reported' ? 'success' : 'info', module: 'radiology', entity_type: 'radiology_test', entity_id: req.params.id, target_path: '/labs' });
  res.json({ message: 'Radiology status updated' });
}));

router.patch('/radiology/upload-report/:id', requirePermission('radiology.create'), asyncHandler(async (req, res) => {
  await RadiologyTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { status: 'reported', reported_at: new Date(), image_file: req.body.image_file || null, report_file: req.body.report_file || null, report_notes: req.body.report_notes || null } });
  await createNotification(req, { title: 'Radiology report completed', message: `Radiology report #${req.params.id} uploaded.`, type: 'radiology', severity: 'success', module: 'radiology', entity_type: 'radiology_test', entity_id: req.params.id, target_path: '/labs' });
  res.json({ message: 'Radiology report uploaded' });
}));

router.get('/radiology/tests', requirePermission('radiology.view'), asyncHandler(async (req, res) => {
  res.json(await withNames(req, await RadiologyTest.find(tenantFilter(req)).sort({ id: -1 })));
}));

router.post('/opd/:id/orders', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  const opd = await OpdRecord.findOne(tenantFilter(req, { id: Number(req.params.id) })).lean();
  if (!opd) return res.status(404).json({ message: 'OPD record not found' });
  const labOrders = [];
  const radiologyOrders = [];
  for (const item of req.body.lab_orders || []) {
    labOrders.push(await LabTest.create(tenantCreateData(req, {
      patient_id: String(opd.patient_id || req.body.patient_id || ''),
      doctor_id: String(opd.doctor_id || req.body.doctor_id || ''),
      appointment_id: opd.appointment_id,
      opd_id: opd.id,
      test_name: item.test_name || item.name || 'Lab Test',
      test_category: item.test_category || item.category || 'General',
      priority: item.priority || 'routine',
      test_status: 'ordered',
      notes: item.notes || '',
    })));
  }
  for (const item of req.body.radiology_orders || []) {
    radiologyOrders.push(await RadiologyTest.create(tenantCreateData(req, {
      patient_id: String(opd.patient_id || req.body.patient_id || ''),
      doctor_id: String(opd.doctor_id || req.body.doctor_id || ''),
      appointment_id: opd.appointment_id,
      opd_id: opd.id,
      scan_name: item.scan_name || item.name || 'Radiology Scan',
      scan_category: item.scan_category || item.category || 'General',
      priority: item.priority || 'routine',
      status: 'ordered',
      notes: item.notes || '',
    })));
  }
  await createNotification(req, { title: 'Clinical orders created', message: `${labOrders.length} lab and ${radiologyOrders.length} radiology order(s) created from OPD.`, type: 'clinical_order', severity: 'info', module: 'opd', entity_type: 'opd_record', entity_id: opd.id, target_path: '/labs' });
  res.status(201).json({ message: 'Clinical orders created', lab_order_ids: labOrders.map(x => x.id), radiology_order_ids: radiologyOrders.map(x => x.id) });
}));

module.exports = router;
