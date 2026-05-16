const express = require('express');
const { Doctor, Department, Appointment, Patient, Bed, Billing, AuditLog } = require('../models');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken, requirePermission } = require('../middleware/auth');
const { attachTenant, tenantFilter, tenantCreateData } = require('../middleware/tenant');

const router = express.Router();
router.use(verifyToken, attachTenant);

async function withNames(req, rows) {
    const plainRows = rows.map(x => x.toJSON?.() || x);
    const patientIds = [...new Set(plainRows.map(x => x.patient_id).filter(Boolean))];
    const doctorIds = [...new Set(plainRows.map(x => x.doctor_id).filter(Boolean))];

    const patients = await Patient.find(tenantFilter(req, {
        $or: [
            { id: { $in: patientIds.map(Number).filter(n => !Number.isNaN(n)) } },
            { patient_id: { $in: patientIds } }
        ]
    })).lean();

    const doctors = await Doctor.find(tenantFilter(req, {
        $or: [
            { id: { $in: doctorIds.map(Number).filter(n => !Number.isNaN(n)) } },
            { doctor_id: { $in: doctorIds } }
        ]
    })).lean();

    const pm = Object.fromEntries([
        ...patients.map(p => [String(p.id), p.full_name]),
        ...patients.map(p => [String(p.patient_id), p.full_name])
    ]);

    const dm = Object.fromEntries([
        ...doctors.map(d => [String(d.id), d.full_name]),
        ...doctors.map(d => [String(d.doctor_id), d.full_name])
    ]);

    return plainRows.map(obj => ({
        ...obj,
        patient_name: pm[String(obj.patient_id)] || '',
        doctor_name: dm[String(obj.doctor_id)] || ''
    }));
}

router.get('/doctors', requirePermission('doctor.view'), asyncHandler(async (req, res) => {
    const rows = await Doctor.find(tenantFilter(req)).sort({ id: -1 }).lean();
    const deps = await Department.find(tenantFilter(req)).lean();
    const dm = Object.fromEntries(deps.map(d => [d.id, d.department_name]));
    res.json(rows.map(d => ({ ...d, department_name: dm[d.department_id] })));
}));

router.post('/doctors', requirePermission('doctor.create'), asyncHandler(async (req, res) => {
    const uid = req.body.doctor_uid || `DOC-${Date.now()}`;
    const r = await Doctor.create(tenantCreateData(req, { ...req.body, doctor_uid: uid, status: req.body.status || 'active' }));
    res.status(201).json({ message: 'Doctor created', id: r.id, doctor_uid: uid });
}));

router.put('/doctors/:id', requirePermission('doctor.edit'), asyncHandler(async (req, res) => {
    const doctorNumericId = Number(req.params.id);
    if (!Number.isFinite(doctorNumericId)) {
        return res.status(400).json({ message: 'Invalid doctor id' });
    }

    const allowed = [
        'doctor_id',
        'full_name',
        'email',
        'phone',
        'specialization',
        'qualification',
        'consultation_fee',
        'department_id',
        'status',
        'license_number',
        'registration_number',
    ];
    const update = {};
    allowed.forEach(k => {
        if (k in req.body) update[k] = typeof req.body[k] === 'string' ? req.body[k].trim() : req.body[k];
    });

    if (!Object.keys(update).length) return res.status(400).json({ message: 'No valid fields' });

    const existingDoctor = await Doctor.findOne(tenantFilter(req, { id: doctorNumericId })).lean();
    if (!existingDoctor) return res.status(404).json({ message: 'Doctor not found' });

    if (Object.prototype.hasOwnProperty.call(update, 'doctor_id') && update.doctor_id) {
        const duplicateDoctor = await Doctor.findOne(tenantFilter(req, {
            doctor_id: update.doctor_id,
            id: { $ne: doctorNumericId },
        })).lean();

        if (duplicateDoctor) {
            return res.status(409).json({
                message: `Doctor ID already exists for ${duplicateDoctor.full_name || 'another doctor'}: ${update.doctor_id}`,
            });
        }
    }

    try {
        const updated = await Doctor.findOneAndUpdate(
            tenantFilter(req, { id: doctorNumericId }),
            { $set: update },
            { new: true, runValidators: true },
        ).lean();
        res.json({ message: 'Doctor updated', doctor: updated });
    } catch (error) {
        if (error?.code === 11000) {
            return res.status(409).json({
                message: 'Doctor ID already exists in this hospital. Please use a different Doctor ID.',
            });
        }
        throw error;
    }
}));

router.delete('/doctors/:id', requirePermission('doctor.delete'), asyncHandler(async (req, res) => {
    const result = await Doctor.deleteOne(tenantFilter(req, { id: Number(req.params.id) }));
    if (!result.deletedCount) return res.status(404).json({ message: 'Doctor not found' });
    res.json({ message: 'Doctor deleted' });
}));

router.get('/departments', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
    res.json(await Department.find(tenantFilter(req)).sort({ department_name: 1 }));
}));

router.post('/departments', requirePermission('doctor.create'), asyncHandler(async (req, res) => {
    const r = await Department.create(tenantCreateData(req, { department_name: req.body.department_name, description: req.body.description || null }));
    res.status(201).json({ message: 'Department created', id: r.id });
}));

router.get('/appointments', requirePermission('appointment.view'), asyncHandler(async (req, res) => {
    res.json(await withNames(req, await Appointment.find(tenantFilter(req)).sort({ appointment_date: -1, appointment_time: -1 })));
}));

router.post('/appointments', requirePermission('appointment.create'), asyncHandler(async (req, res) => {
    const uid = req.body.appointment_uid || `APT-${Date.now()}`;
    const r = await Appointment.create(tenantCreateData(req, { ...req.body, appointment_uid: uid, appointment_type: req.body.appointment_type || 'normal', status: req.body.status || 'pending' }));
    res.status(201).json({ message: 'Appointment created', id: r.id, appointment_uid: uid });
}));

router.patch('/appointments/:id/status', requirePermission('appointment.status.update'), asyncHandler(async (req, res) => {
    await Appointment.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { status: req.body.status } });
    res.json({ message: 'Appointment status updated' });
}));

router.put('/appointments/:id', requirePermission('appointment.edit'), asyncHandler(async (req, res) => {
    const allowed = ['patient_id', 'doctor_id', 'appointment_date', 'appointment_time', 'status', 'notes', 'appointment_type'];
    const update = {};
    allowed.forEach(k => { if (k in req.body) update[k] = req.body[k]; });
    if (!Object.keys(update).length) return res.status(400).json({ message: 'No valid fields' });
    await Appointment.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: update });
    res.json({ message: 'Appointment updated' });
}));

router.delete('/appointments/:id', requirePermission('appointment.delete'), asyncHandler(async (req, res) => {
    await Appointment.deleteOne(tenantFilter(req, { id: Number(req.params.id) }));
    res.json({ message: 'Appointment deleted' });
}));

router.get('/beds', requirePermission('bed.view'), asyncHandler(async (req, res) => {
    res.json(await Bed.find(tenantFilter(req)).sort({ bed_number: 1 }));
}));

router.post('/beds', requirePermission('bed.create'), asyncHandler(async (req, res) => {
    const r = await Bed.create(tenantCreateData(req, { ...req.body, status: req.body.status || 'available' }));
    res.status(201).json({ message: 'Bed created', id: r.id });
}));

router.patch('/beds/:id/status', requirePermission('bed.status.update'), asyncHandler(async (req, res) => {
    await Bed.updateOne(tenantFilter(req, { id: Number(req.params.id) }), { $set: { status: req.body.status } });
    res.json({ message: 'Bed status updated' });
}));

router.get('/dashboard/stats', requirePermission('dashboard.view'), asyncHandler(async (req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const [totalPatients, totalDoctors, appointmentsToday, availableBeds, bills, activity] = await Promise.all([
        Patient.countDocuments(tenantFilter(req)),
        Doctor.countDocuments(tenantFilter(req)),
        Appointment.countDocuments(tenantFilter(req, { appointment_date: today })),
        Bed.countDocuments(tenantFilter(req, { status: 'available' })),
        Billing.find(tenantFilter(req, { billing_date: { $gte: new Date(today) } })).lean(),
        AuditLog.find(tenantFilter(req)).sort({ id: -1 }).limit(10).lean()
    ]);
    res.json({
        totalPatients,
        totalDoctors,
        appointmentsToday,
        availableBeds,
        dailyRevenue: bills.reduce((s, b) => s + Number(b.paid_amount || 0), 0),
        recentActivity: activity
    });
}));

module.exports = router;
