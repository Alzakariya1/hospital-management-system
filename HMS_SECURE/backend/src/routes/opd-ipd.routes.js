const express = require('express');
const { OpdRecord, IpdAdmission, NursingNote, Patient, Doctor, Bed } = require('../models');
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

router.post('/opd/register', requirePermission('opd.create'), asyncHandler(async (req, res) => {
  const r = await OpdRecord.create(tenantCreateData(req, req.body));
  res.status(201).json({ message: 'OPD record created successfully', opdId: r.id });
}));

router.get('/opd', requirePermission('opd.view'), asyncHandler(async (req, res) => {
  res.json(await withNames(req, await OpdRecord.find(tenantFilter(req)).sort({ id: -1 })));
}));

router.post('/ipd/admit', requirePermission('ipd.create'), asyncHandler(async (req, res) => {
  const r = await IpdAdmission.create(tenantCreateData(req, { ...req.body, admission_date: req.body.admission_date || new Date(), status: 'admitted' }));
  if (req.body.bed_id) await Bed.updateOne(tenantFilter(req, { id: Number(req.body.bed_id) }), { $set: { status: 'occupied' } });
  res.status(201).json({ message: 'Patient admitted successfully', ipdId: r.id });
}));

router.get('/ipd', requirePermission('ipd.view'), asyncHandler(async (req, res) => {
  res.json(await withNames(req, await IpdAdmission.find(tenantFilter(req)).sort({ id: -1 })));
}));

router.post('/ipd/nursing-notes', requirePermission('ipd.create'), asyncHandler(async (req, res) => {
  const r = await NursingNote.create(tenantCreateData(req, { ...req.body, vitals: req.body.vitals || null }));
  res.status(201).json({ message: 'Nursing note added', id: r.id });
}));

router.post('/ipd/discharge', requirePermission('ipd.create'), asyncHandler(async (req, res) => {
  await IpdAdmission.updateOne(tenantFilter(req, { id: Number(req.body.ipd_id) }), { $set: { status: 'discharged', discharge_date: req.body.discharge_date || new Date(), discharge_summary: req.body.discharge_summary || null } });
  res.json({ message: 'Patient discharged successfully' });
}));

module.exports = router;
