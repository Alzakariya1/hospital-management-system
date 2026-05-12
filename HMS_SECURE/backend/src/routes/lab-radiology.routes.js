const express = require('express');
const { LabTest, RadiologyTest, Patient, Doctor } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');

const router = express.Router();
router.use(verifyToken, attachTenant);

async function withNames(req, rows) {
  const plain = rows.map(r => r.toJSON ? r.toJSON() : r);
  const patientIds = [...new Set(plain.map(x => x.patient_id).filter(Boolean))];
  const doctorIds = [...new Set(plain.map(x => x.doctor_id).filter(Boolean))];

  const patients = await Patient.find(tenantFilter(req, {
    $or: [
      { id: { $in: patientIds.map(Number).filter(n => !Number.isNaN(n)) } },
      { patient_id: { $in: patientIds } },
    ],
  })).lean();

  const doctors = await Doctor.find(tenantFilter(req, {
    $or: [
      { id: { $in: doctorIds.map(Number).filter(n => !Number.isNaN(n)) } },
      { doctor_id: { $in: doctorIds } },
    ],
  })).lean();

  const pm = Object.fromEntries([...patients.map(p => [String(p.id), p.full_name]), ...patients.map(p => [String(p.patient_id), p.full_name])]);
  const dm = Object.fromEntries([...doctors.map(d => [String(d.id), d.full_name]), ...doctors.map(d => [String(d.doctor_id), d.full_name])]);
  return plain.map(x => ({ ...x, patient_name: pm[String(x.patient_id)], doctor_name: dm[String(x.doctor_id)] }));
}

router.post('/lab/tests', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  const r = await LabTest.create(tenantCreateData(req, { ...req.body, test_status: req.body.test_status || 'booked' }));
  res.status(201).json({ message: 'Lab test booked', labTestId: r.id });
}));

router.post('/lab/book-test', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  const r = await LabTest.create(tenantCreateData(req, { ...req.body, test_status: 'booked' }));
  res.status(201).json({ message: 'Lab test booked', labTestId: r.id });
}));

router.patch('/lab/sample-collected/:id', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  await LabTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { test_status: 'sample_collected' } });
  res.json({ message: 'Sample marked as collected' });
}));

router.patch('/lab/upload-report/:id', requirePermission('lab.create'), asyncHandler(async (req, res) => {
  await LabTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { test_status: 'completed', report_file: req.body.report_file || null, report_notes: req.body.report_notes || null } });
  res.json({ message: 'Lab report uploaded' });
}));

router.get('/lab/tests', requirePermission('lab.view'), asyncHandler(async (req, res) => {
  res.json(await withNames(req, await LabTest.find(tenantFilter(req)).sort({ id: -1 })));
}));

router.post('/radiology/tests', requirePermission('radiology.create'), asyncHandler(async (req, res) => {
  const r = await RadiologyTest.create(tenantCreateData(req, { ...req.body, status: req.body.status || 'booked' }));
  res.status(201).json({ message: 'Radiology scan booked', scanId: r.id });
}));

router.post('/radiology/book-scan', requirePermission('radiology.create'), asyncHandler(async (req, res) => {
  const r = await RadiologyTest.create(tenantCreateData(req, { ...req.body, status: 'booked' }));
  res.status(201).json({ message: 'Radiology scan booked', scanId: r.id });
}));

router.patch('/radiology/upload-report/:id', requirePermission('radiology.create'), asyncHandler(async (req, res) => {
  await RadiologyTest.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { status: 'completed', image_file: req.body.image_file || null, report_file: req.body.report_file || null, report_notes: req.body.report_notes || null } });
  res.json({ message: 'Radiology report uploaded' });
}));

router.get('/radiology/tests', requirePermission('radiology.view'), asyncHandler(async (req, res) => {
  res.json(await withNames(req, await RadiologyTest.find(tenantFilter(req)).sort({ id: -1 })));
}));

module.exports = router;
